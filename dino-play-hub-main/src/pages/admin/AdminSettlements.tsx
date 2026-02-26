import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/constants";
import { formatDateColombia } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Settlement {
  id: string;
  settlement_date: string;
  worker_id: string;
  net_profit: number;
  arcade_sales: number;
  vr_sales: number;
  gross_total: number;
}

export default function AdminSettlements() {
  const { toast } = useToast();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [workerNames, setWorkerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("settlements")
      .select("id, settlement_date, worker_id, net_profit, arcade_sales, vr_sales, gross_total")
      .order("settlement_date", { ascending: false })
      .limit(50);

    setSettlements(data || []);

    // Get worker names
    const workerIds = [...new Set((data || []).map((s) => s.worker_id))];
    if (workerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", workerIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach((p) => { names[p.user_id] = p.full_name; });
      setWorkerNames(names);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("settlements").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Liquidación eliminada" });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
        <FileText className="h-6 w-6" /> Liquidaciones
      </h2>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : settlements.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No hay liquidaciones registradas.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {formatDateColombia(s.settlement_date + "T12:00:00", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-sm text-muted-foreground">{workerNames[s.worker_id] || "Desconocido"}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">Arcade: {formatCOP(s.arcade_sales)}</Badge>
                      <Badge variant="outline" className="text-xs">VR: {formatCOP(s.vr_sales)}</Badge>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-primary text-lg">{formatCOP(s.net_profit)}</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar liquidación?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
