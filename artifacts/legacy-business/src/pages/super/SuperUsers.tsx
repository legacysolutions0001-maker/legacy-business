import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Users, MoreHorizontal, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<string,string> = {
  super_admin: "bg-red-900/30 text-red-400 border-red-900",
  owner: "bg-purple-900/30 text-purple-400 border-purple-900",
  admin: "bg-blue-900/30 text-blue-400 border-blue-900",
  accountant: "bg-teal-900/30 text-teal-400 border-teal-900",
  staff: "bg-slate-800 text-slate-400 border-slate-700",
};

export default function SuperUsers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search,setSearch]=useState("");

  const { data: users=[], isLoading } = useQuery({
    queryKey:["super-users",search],
    queryFn:()=>apiFetch(`/super/users${search?`?search=${encodeURIComponent(search)}`:""}`).then(r=>r.json()),
  });

  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/super/users/${id}`,{method:"DELETE"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["super-users"]});toast({title:"User deleted"});},
    onError:()=>toast({title:"Failed",variant:"destructive"}),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">All Users</h1><p className="text-slate-400 text-sm">Manage all users across all companies</p></div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-800 text-sm">
          <Users className="w-4 h-4 text-slate-400"/>
          <span className="text-white font-medium">{(users as any[]).length}</span>
          <span className="text-slate-500">users</span>
        </div>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500"/>
        <Input placeholder="Search users..." className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <Card className="bg-slate-900/50 border-slate-800">
        <Table>
          <TableHeader><TableRow className="border-slate-800"><TableHead className="text-slate-400">User</TableHead><TableHead className="text-slate-400">Company</TableHead><TableHead className="text-slate-400">Role</TableHead><TableHead className="text-slate-400">Status</TableHead><TableHead className="text-slate-400">Joined</TableHead><TableHead className="w-10"/></TableRow></TableHeader>
          <TableBody>
            {isLoading?<TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
            :(users as any[]).length===0?<TableRow><TableCell colSpan={6} className="text-center py-12">
              <div className="flex flex-col items-center text-slate-500"><Users className="w-10 h-10 mb-2 opacity-30"/><p>No users found</p></div>
            </TableCell></TableRow>
            :(users as any[]).map((u:any)=>(
              <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-700 text-white text-xs">{u.name?.charAt(0)||u.username?.charAt(0)||"U"}</AvatarFallback></Avatar>
                    <div><div className="font-medium text-white">{u.name||u.username}</div><div className="text-xs text-slate-500">@{u.username}</div></div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300 text-sm">{u.companyName||<span className="text-red-400 text-xs">Super Admin</span>}</TableCell>
                <TableCell><Badge className={cn("capitalize text-xs border",ROLE_COLORS[u.role]||"bg-slate-800 text-slate-400 border-slate-700")}>{u.role==="super_admin"?<><ShieldCheck className="w-3 h-3 mr-1"/>Super Admin</>:u.role}</Badge></TableCell>
                <TableCell><Badge className={u.status==="active"?"bg-emerald-900/30 text-emerald-400 border-emerald-900":"bg-slate-800 text-slate-400 border-slate-700"}>{u.status||"active"}</Badge></TableCell>
                <TableCell className="text-slate-500 text-sm">{u.createdAt?format(new Date(u.createdAt),"dd MMM yyyy"):"—"}</TableCell>
                <TableCell>
                  {u.role!=="super_admin"&&<DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem className="text-red-400" onClick={()=>del.mutate(u.id)}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
