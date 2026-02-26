import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCOP } from "@/lib/constants";
import { colombiaToday } from "@/lib/utils";
import { Settings, Save, CheckCircle2, Plus, Trash2, Clock, Package } from "lucide-react";

// ── Helpers for COP formatting ──────────────────────────────────────────────
function formatThousands(value: number | string): string {
  const num = typeof value === "string" ? value.replace(/\D/g, "") : String(value);
  if (!num) return "";
  return Number(num).toLocaleString("es-CO");
}

function parseThousands(formatted: string): number {
  const clean = formatted.replace(/\./g, "").replace(/,/g, "").replace(/\D/g, "");
  return clean ? Number(clean) : 0;
}

// Controlled money input that shows formatted value but stores raw number
function MoneyInput({
  value,
  onChange,
  placeholder = "Ej: 60.000",
  className = "",
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value > 0 ? formatThousands(value) : "");

  useEffect(() => {
    setDisplay(value > 0 ? formatThousands(value) : "");
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, "").replace(/,/g, "").replace(/[^\d]/g, "");
    const num = raw ? Number(raw) : 0;
    setDisplay(raw ? formatThousands(raw) : "");
    onChange(num);
  }, [onChange]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm pointer-events-none">$</span>
      <Input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={`pl-7 ${className}`}
      />
    </div>
  );
}

interface CustomProduct {
  id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function AdminDailyConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = colombiaToday();

  const [configDate, setConfigDate] = useState(today);
  const [baseMoney, setBaseMoney] = useState(0);
  const [initialTokens, setInitialTokens] = useState(0);
  const [openingHour, setOpeningHour] = useState("09:00");
  const [closingHour, setClosingHour] = useState("21:00");
  const [existingConfig, setExistingConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom products
  const [products, setProducts] = useState<CustomProduct[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("daily_config")
        .select("*")
        .eq("config_date", configDate)
        .maybeSingle();

      if (data) {
        setBaseMoney(data.base_money);
        setInitialTokens(data.initial_tokens);
        setOpeningHour((data as any).opening_hour || "09:00");
        setClosingHour((data as any).closing_hour || "21:00");
        setExistingConfig(data.id);

        // Load products for this config
        const { data: prods } = await supabase
          .from("custom_products")
          .select("*")
          .eq("config_id", data.id);
        setProducts(prods?.map(p => ({
          id: p.id,
          product_name: p.product_name,
          quantity: p.quantity,
          unit_price: p.unit_price,
        })) || []);
      } else {
        setBaseMoney(0);
        setInitialTokens(0);
        setOpeningHour("09:00");
        setClosingHour("21:00");
        setExistingConfig(null);
        setProducts([]);
      }
    }
    load();
  }, [configDate]);

  const addProduct = () => {
    setProducts([...products, { product_name: "", quantity: 0, unit_price: 0 }]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof CustomProduct, value: string | number) => {
    const updated = [...products];
    (updated[index] as any)[field] = value;
    setProducts(updated);
  };

  const handleSave = async () => {
    setLoading(true);

    let configId = existingConfig;

    if (existingConfig) {
      const { error } = await supabase
        .from("daily_config")
        .update({
          base_money: baseMoney,
          initial_tokens: initialTokens,
          opening_hour: openingHour,
          closing_hour: closingHour,
        } as any)
        .eq("id", existingConfig);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("daily_config")
        .insert({
          config_date: configDate,
          base_money: baseMoney,
          initial_tokens: initialTokens,
          created_by: user!.id,
          opening_hour: openingHour,
          closing_hour: closingHour,
        } as any)
        .select("id")
        .single();
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        setLoading(false);
        return;
      }
      configId = data.id;
      setExistingConfig(configId);
    }

    // Save products: delete old ones and insert new
    if (configId) {
      await supabase.from("custom_products").delete().eq("config_id", configId);

      const validProducts = products.filter(p => p.product_name.trim());
      if (validProducts.length > 0) {
        await supabase.from("custom_products").insert(
          validProducts.map(p => ({
            config_id: configId!,
            product_name: p.product_name,
            quantity: p.quantity,
            unit_price: p.unit_price,
          }))
        );
      }
    }

    toast({ title: "✅ Configuración guardada" });
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
        <Settings className="h-6 w-6" /> Configuración Diaria
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Establecer Base, Fichas y Horario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Input type="date" value={configDate} onChange={(e) => setConfigDate(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Apertura</label>
              <Input type="time" value={openingHour} onChange={(e) => setOpeningHour(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Cierre</label>
              <Input type="time" value={closingHour} onChange={(e) => setClosingHour(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Base en dinero (COP)</label>
            <MoneyInput
              value={baseMoney}
              onChange={setBaseMoney}
              placeholder="Ej: 60.000"
              className="h-14 text-2xl font-bold mt-1"
            />
            {baseMoney > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{formatCOP(baseMoney)}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Fichas iniciales</label>
            <Input
              type="text"
              inputMode="numeric"
              min={0}
              value={initialTokens === 0 ? "" : initialTokens}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setInitialTokens(val ? Number(val) : 0);
              }}
              placeholder="Ej: 100"
              className="h-14 text-2xl text-center font-bold mt-1"
            />
          </div>

          {existingConfig && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Ya existe configuración para este día
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Products */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Productos / Servicios Adicionales
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addProduct} className="gap-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin productos adicionales. Agrega llaveros, peluches, etc.
            </p>
          ) : (
              products.map((p, i) => (
              <div key={i} className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <label className="text-xs font-medium">Nombre</label>
                  <Input
                    value={p.product_name}
                    onChange={(e) => updateProduct(i, "product_name", e.target.value)}
                    placeholder="Ej: Llaveros"
                    className="mt-1"
                  />
                </div>
                <div className="w-20">
                  <label className="text-xs font-medium">Cant.</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={p.quantity === 0 ? "" : p.quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateProduct(i, "quantity", val ? Number(val) : 0);
                    }}
                    placeholder="Ej: 10"
                    className="mt-1 text-center"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium">Precio (COP)</label>
                  <MoneyInput
                    value={p.unit_price}
                    onChange={(val) => updateProduct(i, "unit_price", val)}
                    placeholder="2.500"
                    className="mt-1"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeProduct(i)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full h-12 text-lg font-bold">
        <Save className="h-5 w-5 mr-2" />
        {existingConfig ? "Actualizar" : "Guardar"} Configuración
      </Button>
    </div>
  );
}
