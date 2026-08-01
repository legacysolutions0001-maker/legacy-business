import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCheck, AlertTriangle, Info, Package, FileText, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string,any> = {
  low_stock: Package,
  invoice: FileText,
  payment: IndianRupee,
  alert: AlertTriangle,
  info: Info,
};
const TYPE_COLORS: Record<string,string> = {
  low_stock: "text-yellow-400",
  invoice: "text-blue-400",
  payment: "text-emerald-400",
  alert: "text-red-400",
  info: "text-muted-foreground",
};

export default function Notifications() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: notifications=[], isLoading } = useQuery({
    queryKey:["notifications"],
    queryFn:()=>apiFetch("/notifications").then(r=>r.json()),
  });

  const markRead = useMutation({
    mutationFn:(id:number)=>apiFetch(`/notifications/${id}/read`,{method:"PATCH"}).then(r=>r.json()),
    onSuccess:()=>qc.invalidateQueries({queryKey:["notifications"]}),
  });

  const markAllRead = useMutation({
    mutationFn:()=>apiFetch("/notifications/read-all",{method:"POST"}).then(r=>r.json()),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["notifications"]});toast({title:"All notifications marked as read"});},
  });

  const unread = (notifications as any[]).filter((n:any)=>!n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Notifications {unread>0&&<Badge className="bg-primary text-primary-foreground">{unread}</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">System alerts and business notifications</p>
        </div>
        {unread>0&&<Button variant="outline" onClick={()=>markAllRead.mutate()} disabled={markAllRead.isPending}><CheckCheck className="w-4 h-4 mr-2"/>Mark All Read</Button>}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"/></div>
      ) : (notifications as any[]).length===0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BellOff className="w-12 h-12 mb-3 opacity-30"/>
          <p className="font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(notifications as any[]).map((n:any)=>{
            const Icon = TYPE_ICONS[n.type]||Bell;
            const color = TYPE_COLORS[n.type]||"text-muted-foreground";
            return (
              <div key={n.id} className={cn("flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/30",!n.isRead?"bg-card border-border/70":"bg-muted/20 border-border/30 opacity-70")} onClick={()=>{if(!n.isRead)markRead.mutate(n.id);}}>
                <div className={cn("p-2 rounded-lg flex-shrink-0 bg-muted",color)}>
                  <Icon className="w-4 h-4"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={cn("font-medium text-sm",!n.isRead?"text-foreground":"text-muted-foreground")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.isRead&&<div className="w-2 h-2 bg-primary rounded-full"/>}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(n.createdAt),"dd MMM, HH:mm")}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
