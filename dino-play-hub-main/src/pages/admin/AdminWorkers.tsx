import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Mail, Lock, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WorkerProfile {
  user_id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
}

export default function AdminWorkers() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New worker form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadWorkers() {
    // Get all user_roles with role=worker, then get profiles
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "worker");
    if (!roles || roles.length === 0) { setWorkers([]); setLoading(false); return; }

    const ids = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, is_active")
      .in("user_id", ids);

    setWorkers(profiles || []);
    setLoading(false);
  }

  useEffect(() => { loadWorkers(); }, []);

  const handleCreateWorker = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Nombre, email y contraseña son obligatorios." });
      return;
    }

    setCreating(true);

    // Use edge function to create worker (admin can't sign up others directly from client)
    const { data, error } = await supabase.functions.invoke("create-worker", {
      body: { email: newEmail, password: newPassword, full_name: newName, phone: newPhone },
    });

    if (error || data?.error) {
      toast({ variant: "destructive", title: "Error", description: data?.error || error?.message || "No se pudo crear el trabajador." });
    } else {
      toast({ title: "✅ Trabajador creado", description: `${newName} ahora tiene acceso al sistema.` });
      setDialogOpen(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewPhone("");
      loadWorkers();
    }
    setCreating(false);
  };

  const toggleActive = async (workerId: string, currentActive: boolean) => {
    await supabase.from("profiles").update({ is_active: !currentActive }).eq("user_id", workerId);
    loadWorkers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <Users className="h-6 w-6" /> Equipo
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Trabajador</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-1"><User className="h-3 w-3" /> Nombre completo</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Juan Pérez" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> Correo electrónico</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="juan@ejemplo.com" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1"><Lock className="h-3 w-3" /> Contraseña</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono (opcional)</label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="300 123 4567" className="mt-1" />
              </div>
              <Button onClick={handleCreateWorker} disabled={creating} className="w-full h-12 font-bold">
                {creating ? "Creando..." : "Crear Trabajador"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : workers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay trabajadores registrados. Crea el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workers.map((w) => (
            <Card key={w.user_id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{w.full_name || "Sin nombre"}</p>
                  <p className="text-sm text-muted-foreground">{w.phone || "Sin teléfono"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={w.is_active ? "default" : "secondary"}>
                    {w.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(w.user_id, w.is_active)}>
                    {w.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
