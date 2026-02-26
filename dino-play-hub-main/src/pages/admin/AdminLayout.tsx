import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Users, Settings, Calendar, BarChart3, LogOut, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import dinoLogo from "@/assets/dino-play-logo.png";

const navItems = [
  { to: "/admin", icon: BarChart3, label: "Análisis", end: true },
  { to: "/admin/config", icon: Settings, label: "Config" },
  { to: "/admin/workers", icon: Users, label: "Equipo" },
  { to: "/admin/history", icon: Calendar, label: "Historial" },
  { to: "/admin/settlements", icon: FileText, label: "Liquidaciones" },
];

export default function AdminLayout() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dinoLogo} alt="Dino Play" className="h-10 w-10 object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold">Dino Play</h1>
              <p className="text-xs opacity-90 -mt-1">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-90 hidden sm:inline">{profile?.full_name || "Admin"}</span>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border shadow-2xl z-20">
        <div className="max-w-5xl mx-auto flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center py-3 px-4 text-xs font-medium transition-all duration-200",
                  isActive 
                    ? "text-primary font-bold border-t-2 border-primary -mt-3 pt-1" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 mb-0.5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
