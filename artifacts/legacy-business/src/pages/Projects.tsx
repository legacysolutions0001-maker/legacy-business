import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, Plus, Clock, MoreHorizontal, Edit, Trash2, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const EMPTY_PROJECT = { name: "", description: "", status: "active", startDate: format(new Date(), "yyyy-MM-dd"), endDate: "" };
const EMPTY_TASK = { title: "", description: "", status: "todo", priority: "medium", assigneeName: "", dueDate: "" };

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects").then(r => r.json()),
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", selectedProject],
    queryFn: () => selectedProject ? apiFetch(`/tasks?projectId=${selectedProject}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!selectedProject,
  });

  const [projOpen, setProjOpen] = useState(false);
  const [editProj, setEditProj] = useState<any>(null);
  const [projForm, setProjForm] = useState({ ...EMPTY_PROJECT });

  const [taskOpen, setTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK });

  const createProjectMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/projects", { method: "POST", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: (data: any) => { qc.invalidateQueries({ queryKey: ["projects"] }); setProjOpen(false); setSelectedProject(data.id); toast({ title: "Project created" }); },
    onError: (e: any) => toast({ title: "Failed to create project", description: e.message, variant: "destructive" }),
  });

  const updateProjectMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setProjOpen(false); toast({ title: "Project updated" }); },
    onError: (e: any) => toast({ title: "Failed to update project", description: e.message, variant: "destructive" }),
  });

  const deleteProjectMut = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/projects/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); if (selectedProject) setSelectedProject(null); toast({ title: "Project deleted" }); },
    onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
  });

  const createTaskMut = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch("/tasks", { method: "POST", body: JSON.stringify({ ...data, projectId: selectedProject }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", selectedProject] }); qc.invalidateQueries({ queryKey: ["projects"] }); setTaskOpen(false); toast({ title: "Task added" }); },
    onError: (e: any) => toast({ title: "Failed to add task", description: e.message, variant: "destructive" }),
  });

  const updateTaskMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", selectedProject] }); qc.invalidateQueries({ queryKey: ["projects"] }); setTaskOpen(false); toast({ title: "Task updated" }); },
    onError: (e: any) => toast({ title: "Failed to update task", description: e.message, variant: "destructive" }),
  });

  function openCreateProject() { setEditProj(null); setProjForm({ ...EMPTY_PROJECT }); setProjOpen(true); }
  function openEditProject(p: any) {
    setEditProj(p);
    setProjForm({
      name: p.name, description: p.description || "", status: p.status,
      startDate: p.startDate ? format(new Date(p.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      endDate: p.endDate ? format(new Date(p.endDate), "yyyy-MM-dd") : "",
    });
    setProjOpen(true);
  }

  function openCreateTask() { setEditTask(null); setTaskForm({ ...EMPTY_TASK }); setTaskOpen(true); }
  function openEditTask(t: any) {
    setEditTask(t);
    setTaskForm({
      title: t.title, description: t.description || "", status: t.status,
      priority: t.priority || "medium", assigneeName: t.assigneeName || "",
      dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
    });
    setTaskOpen(true);
  }

  function handleSaveProject() {
    const payload = {
      name: projForm.name, description: projForm.description || undefined,
      status: projForm.status,
      startDate: projForm.startDate ? new Date(projForm.startDate).toISOString() : undefined,
      endDate: projForm.endDate ? new Date(projForm.endDate).toISOString() : undefined,
    };
    if (editProj) updateProjectMut.mutate({ id: editProj.id, data: payload });
    else createProjectMut.mutate(payload);
  }

  function handleSaveTask() {
    if (!selectedProject) return;
    const payload = {
      title: taskForm.title, description: taskForm.description || undefined,
      status: taskForm.status, priority: taskForm.priority,
      assigneeName: taskForm.assigneeName || undefined,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
    };
    if (editTask) updateTaskMut.mutate({ id: editTask.id, data: payload });
    else createTaskMut.mutate(payload);
  }

  const isSavingProj = createProjectMut.isPending || updateProjectMut.isPending;
  const isSavingTask = createTaskMut.isPending || updateTaskMut.isPending;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage active projects and team tasks.</p>
        </div>
        <Button onClick={openCreateProject}><Plus className="w-4 h-4 mr-2" /> New Project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
        <Card className="md:col-span-1 flex flex-col min-h-[500px]">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              All Projects
              <Badge variant="secondary">{(projects as any[]).length}</Badge>
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isProjectsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (projects as any[]).length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No projects yet.<br />Create one to start.</div>
            ) : (projects as any[]).map((project: any) => {
              const progress = project.taskCount > 0 ? ((project.completedTaskCount || 0) / project.taskCount) * 100 : 0;
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border group ${selectedProject === project.id ? "bg-primary/5 border-primary/30" : "bg-transparent border-transparent hover:bg-muted"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-sm mb-1 flex-1">{project.name}</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 -mt-0.5 -mr-1">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEditProject(project)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteProjectMut.mutate(project.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{project.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{project.completedTaskCount || 0}/{project.taskCount || 0} tasks</span>
                  </div>
                  {(project.taskCount || 0) > 0 && <Progress value={progress} className="h-1 mt-2" />}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="md:col-span-3 flex flex-col gap-4">
          {!selectedProject ? (
            <div className="flex-1 border rounded-xl bg-card/50 flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
              <FolderKanban className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">Select a project to view tasks</p>
              <p className="text-sm mt-1">Or create a new project to get started</p>
            </div>
          ) : (
            <>
              {(() => {
                const project = (projects as any[]).find(p => p.id === selectedProject);
                if (!project) return null;
                const progress = project.taskCount > 0 ? ((project.completedTaskCount || 0) / project.taskCount) * 100 : 0;
                return (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-xl font-bold mb-1">{project.name}</h2>
                          <p className="text-sm text-muted-foreground">{project.description || "No description."}</p>
                        </div>
                        <Button size="sm" onClick={openCreateTask}><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1.5 text-xs text-muted-foreground font-medium">
                            <span>Progress</span><span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        {project.endDate && (
                          <div className="flex items-center text-muted-foreground border-l pl-4 shrink-0 text-xs">
                            <Clock className="w-4 h-4 mr-1.5" />Due {format(new Date(project.endDate), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
                {(["todo", "in-progress", "done"] as const).map(status => {
                  const col = (tasks as any[]).filter((t: any) => t.status === status);
                  const labels: Record<string, string> = { "todo": "To Do", "in-progress": "In Progress", "done": "Done" };
                  return (
                    <div key={status} className="bg-muted/30 border rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-muted-foreground">{labels[status]}</h3>
                        <Badge variant="secondary" className="bg-background">{col.length}</Badge>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        {isTasksLoading ? (
                          <div className="text-xs text-center text-muted-foreground py-4">Loading…</div>
                        ) : col.length === 0 ? (
                          <div className="flex-1 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center py-8">
                            <span className="text-xs text-muted-foreground">No tasks</span>
                          </div>
                        ) : col.map((task: any) => (
                          <Card key={task.id} className="group cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEditTask(task)}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <button
                                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                                  onClick={e => {
                                    e.stopPropagation();
                                    updateTaskMut.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } });
                                  }}
                                >
                                  <CheckSquare className={`w-4 h-4 ${task.status === "done" ? "text-emerald-500" : ""}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</div>
                                  <div className="flex items-center justify-between mt-2">
                                    <Badge variant="outline" className={`text-[10px] ${task.priority === "high" ? "text-red-500 border-red-200 bg-red-500/10" : task.priority === "medium" ? "text-amber-500 border-amber-200 bg-amber-500/10" : "text-muted-foreground"}`}>
                                      {task.priority}
                                    </Badge>
                                    {task.assigneeName && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assigneeName}</span>}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={projOpen} onOpenChange={setProjOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editProj ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription>{editProj ? "Update project details." : "Create a new project to track work."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Project Name *</Label>
              <Input placeholder="e.g. Website Redesign" value={projForm.name} onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input placeholder="Brief description…" value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={projForm.status} onValueChange={v => setProjForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active", "on-hold", "completed", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={projForm.startDate} onChange={e => setProjForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={projForm.endDate} onChange={e => setProjForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={isSavingProj || !projForm.name}>
              {isSavingProj ? "Saving…" : editProj ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription>{editTask ? "Update task details." : "Add a new task to this project."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Task Title *</Label>
              <Input placeholder="e.g. Design homepage mockup" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input placeholder="Optional details…" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Input placeholder="Name" value={taskForm.assigneeName} onChange={e => setTaskForm(f => ({ ...f, assigneeName: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={isSavingTask || !taskForm.title}>
              {isSavingTask ? "Saving…" : editTask ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
