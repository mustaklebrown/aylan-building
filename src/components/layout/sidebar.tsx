"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Banknote,
  Settings,
  LogOut,
  Contact,
  Truck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";
import { useState } from "react";

const navItems = [
  {
    title: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "ACCOUNTANT", "AGENT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "CRM / Prospects",
    href: "/crm",
    icon: Users,
    roles: ["ADMIN", "AGENT"],
  },
  {
    title: "Téléconseillers",
    href: "/agents",
    icon: Contact,
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  {
    title: "Produits & Stock",
    href: "/products",
    icon: Package,
    roles: ["ADMIN", "ACCOUNTANT", "AGENT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Ventes",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "ACCOUNTANT", "AGENT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Livraisons",
    href: "/deliveries",
    icon: Truck,
    roles: ["ADMIN", "ACCOUNTANT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Commissions",
    href: "/commissions",
    icon: Banknote,
    roles: ["ADMIN", "ACCOUNTANT", "AGENT"],
  },
  {
    title: "Paramètres",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrateur", color: "#F3C442", bg: "rgba(243,196,66,0.12)" },
  ACCOUNTANT: { label: "Comptable", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  AGENT: { label: "Agent Commercial", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  DELIVERY_ASSISTANT: { label: "Livraisons", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const role = user?.role || "AGENT";
  const roleInfo = ROLE_LABELS[role] ?? { label: role, color: "#F3C442", bg: "rgba(243,196,66,0.12)" };
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Déconnexion réussie");
            router.push("/login");
            router.refresh();
          },
        },
      });
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
      console.error(error);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden md:flex w-64 flex-col"
      style={{
        background: "linear-gradient(180deg, #0B1626 0%, #0F1D33 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* ── Logo header ── */}
      <div
        className="flex h-16 items-center justify-center px-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Image
          src="/logo.jpeg"
          alt="Aylan Group"
          width={130}
          height={52}
          className="rounded-lg object-contain"
          priority
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {/* Group label */}
        <p
          className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Navigation
        </p>

        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-[#0F1D33]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
              style={
                isActive
                  ? { background: "#F3C442", boxShadow: "0 2px 12px rgba(243,196,66,0.25)" }
                  : {}
              }
            >
              <item.icon
                className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
                style={isActive ? { color: "#0F1D33" } : {}}
              />
              <span className="flex-1">{item.title}</span>
              {isActive && (
                <ChevronRight className="h-3 w-3 opacity-60" style={{ color: "#0F1D33" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* User card */}
        <div
          className="rounded-xl px-3 py-2.5 space-y-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Name + role badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white truncate">
              {user.name || user.email.split("@")[0]}
            </span>
            <span
              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
              style={{ color: roleInfo.color, background: roleInfo.bg }}
            >
              {roleInfo.label}
            </span>
          </div>
          {/* Email */}
          <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
            {user.email}
          </p>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="w-full justify-start gap-3 rounded-xl h-9 text-sm font-medium transition-all"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
        </Button>
      </div>
    </aside>
  );
}
