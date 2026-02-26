import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP } from "@/lib/constants";
import { colombiaNow, colombiaYYYYMMDD, formatDateColombia } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Gamepad2, Glasses, DollarSign } from "lucide-react";

interface Settlement {
  settlement_date: string;
  arcade_sales: number;
  vr_sales: number;
  net_profit: number;
  gross_total: number;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // start from the current moment in Colombia, then subtract 30 days
      const now = colombiaNow();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: settlements } = await supabase
        .from("settlements")
        .select("settlement_date, arcade_sales, vr_sales, net_profit, gross_total")
        .gte("settlement_date", colombiaYYYYMMDD(thirtyDaysAgo))
        .order("settlement_date", { ascending: true });

      setData(settlements || []);
      setLoading(false);
    }
    load();
  }, []);

  const totalNet = data.reduce((sum, s) => sum + s.net_profit, 0);
  const totalArcade = data.reduce((sum, s) => sum + s.arcade_sales, 0);
  const totalVR = data.reduce((sum, s) => sum + s.vr_sales, 0);

  const chartData = data.map((s) => ({
    date: formatDateColombia(s.settlement_date, { day: "2-digit", month: "short" }),
    arcade: s.arcade_sales,
    vr: s.vr_sales,
    ganancia: s.net_profit,
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Gamepad2 className="h-8 w-8 animate-dino-bounce text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-primary">Análisis de Datos</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: "Ganancia Neta", value: formatCOP(totalNet), color: "text-primary" },
          { icon: TrendingUp, label: "Total Bruto", value: formatCOP(totalArcade + totalVR), color: "text-secondary-foreground" },
          { icon: Gamepad2, label: "Ventas Arcade", value: formatCOP(totalArcade), color: "text-primary" },
          { icon: Glasses, label: "Ventas VR", value: formatCOP(totalVR), color: "text-accent-foreground" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ganancias Diarias (últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCOP(value)} />
                <Bar dataKey="arcade" name="Arcade" fill="hsl(145, 65%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vr" name="VR" fill="hsl(48, 95%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
