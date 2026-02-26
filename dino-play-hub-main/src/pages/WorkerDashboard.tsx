import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCOP, calculateSettlement } from "@/lib/constants";
import { colombiaToday, colombiaNowISO, formatDateColombia, colombiaYYYYMMDD } from "@/lib/utils";
import {
  Glasses, Coins, CheckCircle2, LogOut,
  ClipboardCheck, Calculator, Save, AlertCircle,
  Clock, Package, Banknote, Minus, Plus, ShoppingCart
} from "lucide-react";
import dinoLogo from "@/assets/dino-play-logo.png";

interface ProductEntry {
  product_name: string;
  initial_quantity: number;
  sold_quantity: number;
  unit_price: number;
}

function getVrCounterKey(date: string) {
  return `dino_vr_counter_${date}`;
}

export default function WorkerDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  // `today` should always reflect the current date in Bogota, otherwise
  // users running the app in other time zones might end up loading or writing
  // data for the wrong day. The helper takes care of the timezone conversion.
  const today = colombiaToday();

  const [config, setConfig] = useState<{
    base_money: number;
    initial_tokens: number;
    opening_hour: string;
    closing_hour: string;
  } | null>(null);
  const [existingSettlement, setExistingSettlement] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [finalTokens, setFinalTokens] = useState<string>("");
  const [vrUses, setVrUses] = useState<string>("");
  const [arcadeCoupons, setArcadeCoupons] = useState<string>("");
  const [vrCoupons, setVrCoupons] = useState<string>("");
  const [hasNequi, setHasNequi] = useState(false);
  const [nequiDeposits, setNequiDeposits] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState("");

  // Products
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [confirmSellProduct, setConfirmSellProduct] = useState<number | null>(null);

  // Checklist
  const [machinesDisconnected, setMachinesDisconnected] = useState(false);
  const [machinesCleaned, setMachinesCleaned] = useState(false);
  const [floorSwept, setFloorSwept] = useState(false);
  const [signCollected, setSignCollected] = useState(false);

  // VR Counter (informational only, localStorage)
  const [vrCounter, setVrCounter] = useState<number>(() => {
    const saved = localStorage.getItem(getVrCounterKey(colombiaYYYYMMDD()));
    return saved ? Number(saved) : 0;
  });

  // Clean old VR counter keys on mount
  useEffect(() => {
    const key = getVrCounterKey(today);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("dino_vr_counter_") && k !== key) {
        localStorage.removeItem(k);
      }
    }
  }, [today]);

  const updateVrCounter = (newVal: number) => {
    const val = Math.max(0, newVal);
    setVrCounter(val);
    localStorage.setItem(getVrCounterKey(today), String(val));
  };

  const checklistComplete = machinesDisconnected && machinesCleaned && floorSwept && signCollected;

  useEffect(() => {
    async function load() {
      const [configRes, settlementRes] = await Promise.all([
        supabase.from("daily_config").select("*").eq("config_date", today).maybeSingle(),
        supabase.from("settlements").select("id").eq("settlement_date", today).eq("worker_id", user!.id).maybeSingle(),
      ]);

      if (configRes.data) {
        const d = configRes.data as any;
        setConfig({
          base_money: d.base_money,
          initial_tokens: d.initial_tokens,
          opening_hour: d.opening_hour || "09:00",
          closing_hour: d.closing_hour || "21:00",
        });

        const { data: prods } = await supabase
          .from("custom_products")
          .select("*")
          .eq("config_id", d.id);

        if (prods && prods.length > 0) {
          setProductEntries(prods.map(p => ({
            product_name: p.product_name,
            initial_quantity: p.quantity,
            sold_quantity: 0,
            unit_price: p.unit_price,
          })));
        }
      } else {
        setConfig(null);
      }

      setExistingSettlement(!!settlementRes.data);
      setLoading(false);
    }
    load();
  }, [user, today]);

  const productSalesTotal = useMemo(() => {
    return productEntries.reduce((sum, p) => sum + p.sold_quantity * p.unit_price, 0);
  }, [productEntries]);

  const hasFinalTokens = finalTokens !== "";

  const calculations = useMemo(() => {
    if (!config) return null;
    return calculateSettlement({
      initialTokens: config.initial_tokens,
      finalTokens: hasFinalTokens ? Number(finalTokens) : config.initial_tokens,
      vrUses: Number(vrUses) || 0,
      arcadeCoupons: Number(arcadeCoupons) || 0,
      vrCoupons: Number(vrCoupons) || 0,
      baseMoney: config.base_money,
      nequiDeposits: hasNequi ? Number(nequiDeposits) || 0 : 0,
      productSales: productSalesTotal,
    });
  }, [config, finalTokens, hasFinalTokens, vrUses, arcadeCoupons, vrCoupons, nequiDeposits, hasNequi, productSalesTotal]);

  const confirmSell = (index: number) => {
    const p = productEntries[index];
    if (p.sold_quantity >= p.initial_quantity) return;
    setConfirmSellProduct(index);
  };

  const executeSell = () => {
    if (confirmSellProduct === null) return;
    const updated = [...productEntries];
    updated[confirmSellProduct].sold_quantity += 1;
    setProductEntries(updated);
    setConfirmSellProduct(null);
  };

  const handleSave = async () => {
    if (!config || !calculations || !user) return;

    const saveFinalTokens = Number(finalTokens) || 0;
    const saveCalc = calculateSettlement({
      initialTokens: config.initial_tokens,
      finalTokens: saveFinalTokens,
      vrUses: Number(vrUses) || 0,
      arcadeCoupons: Number(arcadeCoupons) || 0,
      vrCoupons: Number(vrCoupons) || 0,
      baseMoney: config.base_money,
      nequiDeposits: hasNequi ? Number(nequiDeposits) || 0 : 0,
      productSales: productSalesTotal,
    });

    const { data: insertData, error } = await supabase.from("settlements").insert({
      settlement_date: today,
      worker_id: user.id,
      initial_tokens: config.initial_tokens,
      final_tokens: saveFinalTokens,
      vr_uses: Number(vrUses) || 0,
      arcade_coupons: Number(arcadeCoupons) || 0,
      vr_coupons: Number(vrCoupons) || 0,
      base_money: config.base_money,
      arcade_sales: saveCalc.arcadeSales,
      vr_sales: saveCalc.vrSales,
      gross_total: saveCalc.totalVendido,
      net_profit: saveCalc.netProfit,
      opening_notes: "",
      nequi_deposits: hasNequi ? Number(nequiDeposits) || 0 : 0,
      closing_notes: closingNotes,
    } as any).select("id").single();

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la liquidación." });
      return;
    }

    const settlementId = insertData.id;

    await supabase.from("checklists").insert({
      settlement_id: settlementId,
      machines_disconnected: machinesDisconnected,
      machines_cleaned: machinesCleaned,
      floor_swept: floorSwept,
      // store the completion timestamp using Colombia local time
      completed_at: colombiaNowISO(),
    });

    const soldProducts = productEntries.filter(p => p.product_name.trim());
    if (soldProducts.length > 0) {
      await supabase.from("settlement_products").insert(
        soldProducts.map(p => ({
          settlement_id: settlementId,
          product_name: p.product_name,
          initial_quantity: p.initial_quantity,
          final_quantity: p.initial_quantity - p.sold_quantity,
          unit_price: p.unit_price,
        }))
      );
    }

    toast({ title: "✅ Liquidación guardada", description: "La liquidación del día se registró correctamente." });
    setExistingSettlement(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse">
          <img src={dinoLogo} alt="Cargando..." className="h-20 w-20 mx-auto opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5 pb-8">
      {/* Sell confirmation dialog */}
      <AlertDialog open={confirmSellProduct !== null} onOpenChange={(open) => { if (!open) setConfirmSellProduct(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar venta</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSellProduct !== null && (
                <>¿Confirmar venta de <strong>{productEntries[confirmSellProduct]?.product_name}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeSell}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 shadow-xl">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <img src={dinoLogo} alt="Dino Play" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="text-xl font-display font-bold">Dino Play</h1>
              <p className="text-xs opacity-90 -mt-1">Panel del Trabajador</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name || "Trabajador"}</p>
              <p className="text-xs opacity-80">
                {formatDateColombia(new Date(), { dateStyle: "short" })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-4">
        {existingSettlement ? (
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/20">
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold text-primary">¡Liquidación completada!</h2>
              <p className="text-muted-foreground">Ya registraste la liquidación del día de hoy.</p>
            </CardContent>
          </Card>
        ) : !config ? (
          <Card className="border-0 bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-lg">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-secondary/20">
                  <AlertCircle className="h-12 w-12 text-secondary" />
                </div>
              </div>
              <h2 className="text-xl font-display font-bold">Sin configuración</h2>
              <p className="text-muted-foreground">El administrador aún no ha configurado la base y fichas para hoy.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="liquidacion" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2 h-12">
              <TabsTrigger value="liquidacion" className="text-sm font-semibold">
                <Calculator className="h-4 w-4 mr-1.5" />
                Liquidación
              </TabsTrigger>
              <TabsTrigger value="vr-counter" className="text-sm font-semibold">
                <Glasses className="h-4 w-4 mr-1.5" />
                Contador VR
              </TabsTrigger>
            </TabsList>

            {/* ===== LIQUIDACIÓN TAB ===== */}
            <TabsContent value="liquidacion" className="space-y-4">
              {/* Day Info */}
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Coins className="h-5 w-5 text-secondary" />
                    Inicio de Jornada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 text-center border border-primary/20">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Base en dinero</p>
                      <p className="text-2xl font-bold text-primary">{formatCOP(config.base_money)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg p-4 text-center border border-secondary/20">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fichas iniciales</p>
                      <p className="text-2xl font-bold text-secondary">{config.initial_tokens}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">Apertura: {config.opening_hour}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-destructive" />
                      <span className="font-medium">Cierre: {config.closing_hour}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products – sell button per item */}
              {productEntries.length > 0 && (
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5 text-primary" />
                      Productos Adicionales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-5">
                    {productEntries.map((p, i) => {
                      const remaining = p.initial_quantity - p.sold_quantity;
                      const outOfStock = remaining <= 0;
                      return (
                        <div key={i} className="bg-muted/30 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{p.product_name}</p>
                              <p className="text-xs text-muted-foreground">{formatCOP(p.unit_price)} c/u</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Stock inicial: {p.initial_quantity}</p>
                              <p className={`text-xs font-semibold ${outOfStock ? "text-destructive" : "text-foreground"}`}>
                                {outOfStock ? "Sin stock" : `Disponibles: ${remaining}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-background/60 rounded-lg p-3">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Vendidos: </span>
                              <span className="font-bold text-lg">{p.sold_quantity}</span>
                              <span className="text-muted-foreground ml-2">= </span>
                              <span className="font-semibold text-primary">{formatCOP(p.sold_quantity * p.unit_price)}</span>
                            </div>
                            <Button
                              size="sm"
                              disabled={outOfStock}
                              onClick={() => confirmSell(i)}
                              className="gap-1.5"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Vender
                            </Button>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary rounded-full h-1.5 transition-all"
                              style={{ width: `${(p.sold_quantity / p.initial_quantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Settlement Inputs */}
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5 text-primary" />
                    Datos de Cierre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                      Fichas sobrantes
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 20"
                      value={finalTokens}
                      onChange={(e) => setFinalTokens(e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-14 text-3xl text-center font-bold mt-2 border-2 border-border/50 focus:border-primary transition-colors"
                    />
                    {hasFinalTokens && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Fichas vendidas: {Math.max(0, config.initial_tokens - Number(finalTokens))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                      Usos de Gafas VR
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={vrUses}
                      onChange={(e) => setVrUses(e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-14 text-3xl text-center font-bold mt-2 border-2 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg p-4 space-y-3 border border-secondary/20">
                    <p className="text-sm font-semibold text-foreground">🎟️ Cupones gratis canjeados</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cupones Arcade</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={arcadeCoupons}
                          onChange={(e) => setArcadeCoupons(e.target.value.replace(/[^0-9]/g, ""))}
                          className="h-12 text-xl text-center font-bold border-2 border-border/50 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Descuenta de ganancia</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cupones VR</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={vrCoupons}
                          onChange={(e) => setVrCoupons(e.target.value.replace(/[^0-9]/g, ""))}
                          className="h-12 text-xl text-center font-bold border-2 border-border/50 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Solo se registra</p>
                      </div>
                    </div>
                  </div>

                  {/* Nequi – checkbox + conditional field */}
                  <div className="bg-gradient-to-br from-primary/5 to-primary/0 rounded-lg p-4 border border-primary/20 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={hasNequi}
                        onCheckedChange={(v) => {
                          setHasNequi(v === true);
                          if (!v) setNequiDeposits("");
                        }}
                        className="h-5 w-5 border-2"
                      />
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> ¿Hubo depósitos a Nequi?
                      </span>
                    </label>
                    {hasNequi && (
                      <div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ej: 20000"
                          value={nequiDeposits}
                          onChange={(e) => setNequiDeposits(e.target.value.replace(/[^0-9]/g, ""))}
                          className="h-14 text-3xl text-center font-bold border-2 border-border/50 focus:border-primary transition-colors"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Solo informativo – no afecta la ganancia neta
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calculations */}
                  {calculations && (
                    <div className="bg-gradient-to-br from-primary/5 to-primary/0 border-2 border-primary/30 rounded-lg p-5 space-y-3">
                      <h3 className="font-display font-bold text-primary text-lg mb-3">Resumen de Liquidación</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-foreground">Ventas Arcade</span>
                          <span className="font-bold text-foreground">{formatCOP(calculations.arcadeSales)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-foreground">Ventas VR</span>
                          <span className="font-bold text-foreground">{formatCOP(calculations.vrSales)}</span>
                        </div>
                        {calculations.productSales > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-foreground">Otros Productos</span>
                            <span className="font-bold text-foreground">{formatCOP(calculations.productSales)}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-primary/20 pt-3 space-y-2">
                        <div className="flex justify-between items-center text-sm font-semibold border-t border-primary/20 pt-3">
                          <span className="font-bold text-primary text-xl">Ganancia Neta</span>
                          <span className="font-display font-bold text-primary text-2xl">{formatCOP(calculations.netProfit)}</span>
                        </div>
                        {hasNequi && Number(nequiDeposits) > 0 && (
                          <div className="flex justify-between items-center text-sm bg-muted/40 rounded-lg p-2 mt-2">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Banknote className="h-3.5 w-3.5" /> Depósito Nequi (referencia)
                            </span>
                            <span className="font-semibold text-muted-foreground">{formatCOP(Number(nequiDeposits))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checklist */}
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Checklist de Cierre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-5">
                  {[
                    { id: "machines", label: "Máquinas desconectadas", checked: machinesDisconnected, set: setMachinesDisconnected },
                    { id: "cleaning", label: "Limpieza de máquinas realizada", checked: machinesCleaned, set: setMachinesCleaned },
                    { id: "floor", label: "Local barrido", checked: floorSwept, set: setFloorSwept },
                    { id: "sign", label: "Aviso publicitario recogido", checked: signCollected, set: setSignCollected },
                  ].map((item) => (
                    <label key={item.id} className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${item.checked ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 border border-transparent hover:border-border'}`}>
                      <Checkbox checked={item.checked} onCheckedChange={(v) => item.set(v === true)} className="h-6 w-6 border-2" />
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {item.checked && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                    </label>
                  ))}
                  {!checklistComplete && (
                    <p className="text-xs text-muted-foreground text-center bg-secondary/10 rounded-lg p-3 mt-2">
                      ⚠️ Notificar cierre de local en el WhatsApp
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Closing Notes */}
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-lg">Novedades al cierre de turno</CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <Textarea
                    placeholder="Anota cualquier novedad al cierre del turno..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="border-2 border-border/50 focus:border-primary transition-colors"
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={!checklistComplete || !hasFinalTokens}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                Guardar Liquidación
              </Button>
            </TabsContent>

            {/* ===== CONTADOR VR TAB ===== */}
            <TabsContent value="vr-counter" className="space-y-4">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Glasses className="h-5 w-5 text-primary" />
                    Contador de Sesiones VR
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Lleva el control de cuántas sesiones de VR has atendido hoy. Este contador es solo informativo y no afecta la liquidación.
                  </p>

                  {/* Counter display */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border-2 border-primary/20 w-full text-center">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Sesiones hoy</p>
                      <p className="text-7xl font-display font-bold text-primary">{vrCounter}</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-4 w-full">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => updateVrCounter(vrCounter - 1)}
                        disabled={vrCounter === 0}
                        className="h-16 w-16 rounded-full border-2 border-destructive/30 text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Minus className="h-6 w-6" />
                      </Button>

                      <Button
                        size="lg"
                        onClick={() => updateVrCounter(vrCounter + 1)}
                        className="flex-1 h-20 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] rounded-xl"
                      >
                        <Plus className="h-6 w-6 mr-2" />
                        Registrar Uso VR
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Se reinicia automáticamente cada día
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
