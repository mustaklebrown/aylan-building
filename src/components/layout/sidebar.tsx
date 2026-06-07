"use client";

import Link from "next/link";
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
    <aside className="fixed inset-y-0 left-0 z-50 hidden md:flex w-64 flex-col border-r border-slate-900 bg-slate-950/90 backdrop-blur-md text-slate-200">
      <div className="flex h-16 items-center gap-2 border-b border-slate-900 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 text-white font-bold">
          A
        </div>
        <span className="text-lg font-bold tracking-tight text-white">AYLAN GROUP</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-slate-900 hover:text-white",
                isActive ? "bg-slate-900 text-white border-l-2 border-indigo-500 rounded-l-none" : "text-slate-400"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-2">
        <div className="px-3 pb-2 text-[10px] text-slate-500 text-center border-b border-slate-800/50 mb-2">
          Moroni Magoudjou<br />Grande Comore, Comores
        </div>
        <div className="px-3 py-2 text-xs text-slate-500 font-mono flex items-center justify-between">
          <span>Rôle:</span>
          <span className="bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded font-bold">{role}</span>
        </div>
        <Button
          variant="ghost"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
        </Button>
      </div>
    </aside>
  );
}
