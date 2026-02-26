import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/constants";
import { colombiaYYYYMMDD, formatDateColombia } from "@/lib/utils";
import { Calendar as CalIcon, Gamepad2, Glasses, FileText } from "lucide-react";

interface SettlementDetail {
  id: string;
  settlement_date: string;
  initial_tokens: number;
  final_tokens: number;
  vr_uses: number;
  arcade_coupons: number;
  vr_coupons: number;
  base_money: number;
  arcade_sales: number;
  vr_sales: number;
  gross_total: number;
  net_profit: number;
  opening_notes: string;
  worker_id: string;
}

export default function AdminHistory() {
  // start the calendar on today's date in Bogota
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }))
  );
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [workerName, setWorkerName] = useState("");
  const [datesWithData, setDatesWithData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDates() {
      const { data } = await supabase.from("settlements").select("settlement_date");
      if (data) setDatesWithData(data.map((d) => d.settlement_date));
    }
    loadDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    // convert the picked date to a plain YYYY-MM-DD string (Colombia timezone)
    const dateStr = colombiaYYYYMMDD(selectedDate);

    async function loadSettlement() {
      setLoading(true);
      const { data } = await supabase
        .from("settlements")
        .select("*")
        .eq("settlement_date", dateStr)
        .maybeSingle();

      setSettlement(data);

      if (data?.worker_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.worker_id)
          .maybeSingle();
        setWorkerName(profile?.full_name || "Desconocido");
      }
      setLoading(false);
    }
    loadSettlement();
  }, [selectedDate]);

  const hasData = (date: Date) => {
    return datesWithData.includes(colombiaYYYYMMDD(date));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
        <CalIcon className="h-6 w-6" /> Historial
      </h2>

      <Card>
        <CardContent className="p-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasData: (date) => hasData(date) }}
            modifiersClassNames={{ hasData: "bg-primary/20 font-bold" }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Cargando...</p>
      ) : settlement ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{formatDateColombia(settlement.settlement_date + "T12:00:00", { weekday: "long", day: "numeric", month: "long" })}</span>
              <Badge>{workerName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Fichas Inicio</p>
                <p className="font-bold">{settlement.initial_tokens}</p>
              </div>
              <div className="bg-muted rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Fichas Final</p>
                <p className="font-bold">{settlement.final_tokens}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="flex items-center gap-1"><Gamepad2 className="h-3 w-3" /> Ventas Arcade</span><span className="font-bold">{formatCOP(settlement.arcade_sales)}</span></div>
              <div className="flex justify-between"><span className="flex items-center gap-1"><Glasses className="h-3 w-3" /> Ventas VR</span><span className="font-bold">{formatCOP(settlement.vr_sales)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Total Bruto</span><span className="font-bold">{formatCOP(settlement.gross_total)}</span></div>
              <div className="flex justify-between text-primary font-bold text-base border-t pt-1">
                <span>Ganancia Neta</span><span>{formatCOP(settlement.net_profit)}</span>
              </div>
            </div>
            {settlement.opening_notes && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Novedades</p>
                <p className="text-sm mt-1">{settlement.opening_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : selectedDate ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay liquidación registrada para este día.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
