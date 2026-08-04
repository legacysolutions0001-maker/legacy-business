import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Megaphone, Trash2, CheckCheck, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function timeAgo(d: string) {
  try { return format(new Date(d), "dd MMM, hh:mm a"); } catch { return d; }
}

export default function Messaging() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"all"|"inbox"|"sent"|"announcements">("all");
  const [newMsg, setNewMsg] = useState({ to:"all", receiverId:"", receiverName:"", message:"", isAnnouncement:false });
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages=[], isLoading } = useQuery({ queryKey:["messages",tab], queryFn:()=>apiFetch("/messages").then(r=>r.json()), refetchInterval:15000 });
  const { data: users=[] } = useQuery({ queryKey:["msg-users"], queryFn:()=>apiFetch("/messages/users").then(r=>r.json()) });

  const send = useMutation({
    mutationFn:(d:any)=>apiFetch("/messages",{method:"POST",body:JSON.stringify(d)}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["messages"]});setNewMsg({to:"all",receiverId:"",receiverName:"",message:"",isAnnouncement:false});toast({title:"Message sent"});},
    onError:()=>toast({title:"Failed to send",variant:"destructive"}),
  });

  const del = useMutation({
    mutationFn:(id:number)=>apiFetch(`/messages/${id}`,{method:"DELETE"}),
    onSuccess:()=>qc.invalidateQueries({queryKey:["messages"]}),
  });

  const markRead = useMutation({
    mutationFn:()=>apiFetch("/messages/read-all",{method:"PATCH"}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["messages"]});qc.invalidateQueries({queryKey:["msg-unread"]});},
  });

  const handleSend = () => {
    if (!newMsg.message.trim()) return;
    send.mutate({
      message: newMsg.message,
      receiverId: newMsg.to==="all" ? undefined : Number(newMsg.receiverId),
      receiverName: newMsg.to==="all" ? undefined : newMsg.receiverName,
      isAnnouncement: newMsg.to==="all",
    });
  };

  const filtered = (messages as any[]).filter((m:any)=>{
    if (tab==="inbox") return m.receiverId===user?.id || m.isAnnouncement;
    if (tab==="sent") return m.senderId===user?.id;
    if (tab==="announcements") return m.isAnnouncement;
    return true;
  });

  const unread = (messages as any[]).filter((m:any)=>!m.isRead && m.receiverId===user?.id).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Internal Messaging</h1>
          {unread>0 && <Badge className="bg-red-500 text-white">{unread} unread</Badge>}
        </div>
        {unread>0 && <Button variant="outline" size="sm" onClick={()=>markRead.mutate()}><CheckCheck className="w-4 h-4 mr-1"/>Mark all read</Button>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">New Message</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label className="text-xs">Send To</Label>
                <Select value={newMsg.to} onValueChange={v=>{
                  if(v==="all") setNewMsg(f=>({...f,to:"all",receiverId:"",receiverName:"",isAnnouncement:true}));
                  else{const u=(users as any[]).find((u:any)=>String(u.id)===v);setNewMsg(f=>({...f,to:v,receiverId:v,receiverName:u?.name||"",isAnnouncement:false}));}
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="flex items-center gap-1"><Megaphone className="w-3 h-3"/>Everyone (Announcement)</span></SelectItem>
                    {(users as any[]).map((u:any)=><SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Message</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={newMsg.message}
                  onChange={e=>setNewMsg(f=>({...f,message:e.target.value}))}
                  rows={3}
                  className="resize-none text-sm"
                  onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();handleSend();}}}
                />
                <p className="text-xs text-muted-foreground">Ctrl+Enter to send</p>
              </div>
              <Button className="w-full" onClick={handleSend} disabled={send.isPending||!newMsg.message.trim()}>
                <Send className="w-4 h-4 mr-2"/>Send
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-2 space-y-1">
              {[
                {key:"all",label:"All Messages",icon:MessageSquare},
                {key:"inbox",label:"Inbox",icon:Bell,badge:unread},
                {key:"sent",label:"Sent",icon:Send},
                {key:"announcements",label:"Announcements",icon:Megaphone},
              ].map(t=>(
                <button key={t.key} onClick={()=>setTab(t.key as any)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${tab===t.key?"bg-primary text-primary-foreground":"hover:bg-muted text-muted-foreground"}`}>
                  <t.icon className="w-4 h-4"/>{t.label}
                  {(t as any).badge>0&&<Badge className="ml-auto bg-red-500 text-white text-xs">{(t as any).badge}</Badge>}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{tab==="all"?"All Messages":tab==="inbox"?"Inbox":tab==="sent"?"Sent":"Announcements"} ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"/></div>
              ) : filtered.length===0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30"/>
                  <p className="text-sm">No messages</p>
                </div>
              ) : filtered.map((msg:any)=>{
                const isMine = msg.senderId===user?.id;
                const isUnread = !msg.isRead && msg.receiverId===user?.id;
                return (
                  <div key={msg.id} className={`flex gap-3 group rounded-xl p-3 transition-colors ${isUnread?"bg-primary/5 border border-primary/20":"bg-muted/20"} ${isMine?"flex-row-reverse":""}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {msg.senderName?.charAt(0)?.toUpperCase()||"U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 min-w-0 ${isMine?"text-right":""}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isMine?"flex-row-reverse":""}`}>
                        <span className="text-xs font-semibold">{isMine?"You":msg.senderName}</span>
                        {msg.isAnnouncement && <Badge className="text-xs px-1 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30"><Megaphone className="w-2.5 h-2.5 mr-0.5 inline"/>Announcement</Badge>}
                        {!msg.isAnnouncement && <span className="text-xs text-muted-foreground">→ {isMine?(msg.receiverName||"All"):"You"}</span>}
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"/>}
                        <span className="text-xs text-muted-foreground ml-auto">{timeAgo(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground break-words">{msg.message}</p>
                    </div>
                    {isMine && (
                      <button onClick={()=>del.mutate(msg.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
