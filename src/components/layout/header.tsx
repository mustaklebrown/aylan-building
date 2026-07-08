"use client";

import { useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  Menu,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Banknote,
  Settings,
  Contact,
  Truck,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrateur", color: "#F3C442", bg: "rgba(243,196,66,0.12)" },
  ACCOUNTANT: { label: "Comptable", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  LEADER: { label: "Leader", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  AGENT: { label: "Agent Commercial", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  DELIVERY_ASSISTANT: { label: "Livraisons", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};


interface HeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
}

const navItems = [
  {
    title: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "CRM / Prospects",
    href: "/crm",
    icon: Users,
    roles: ["ADMIN", "LEADER", "AGENT"],
  },
  {
    title: "Téléconseillers",
    href: "/agents",
    icon: Contact,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER"],
  },
  {
    title: "Produits & Stock",
    href: "/products",
    icon: Package,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Ventes",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "DELIVERY_ASSISTANT"],
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
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT"],
  },
  {
    title: "Comptabilité",
    href: "/accounting",
    icon: Calculator,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER"],
  },
  {
    title: "Paramètres",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "DELIVERY_ASSISTANT"],
  },
];

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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


  // Get initials from user's name
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user?.name || "Utilisateur");
  const role = user?.role || "AGENT";
  const roleInfo = ROLE_LABELS[role] ?? { label: role, color: "#F3C442", bg: "rgba(243,196,66,0.12)" };
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between glass-nav px-4 md:px-6">
      <div className="flex flex-1 items-center gap-2 md:gap-4">
        {/* Mobile Hamburger Menu */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 mr-1" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] p-0 text-white flex flex-col h-full border-r border-white/5"
              style={{
                background: "linear-gradient(180deg, #0B1626 0%, #0F1D33 100%)",
              }}
            >
              {/* Header with real logo */}
              <div
                className="flex h-16 items-center justify-center px-5 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Image
                  src="/logo.jpeg"
                  alt="Aylan Group"
                  width={120}
                  height={48}
                  className="rounded-lg object-contain"
                  priority
                />
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 mt-2">
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
                    </Link>
                  );
                })}
              </nav>

              {/* User footer */}
              <div
                className="p-3 space-y-2 shrink-0"
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
            </SheetContent>
          </Sheet>
        </div>

        {/* Search Input */}
        <form className="relative w-full max-w-xs sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="w-full appearance-none bg-background pl-8 shadow-none h-9 text-sm"
          />
        </form>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Notifications Button */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-600" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
            <Avatar className="h-8 w-8">
              {user?.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none font-heading">{user?.name || "Utilisateur"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "user@aylangroup.com"}
                </p>
                <p className="text-[10px] uppercase font-bold text-indigo-500 leading-none mt-1">
                  {user?.role || "AGENT"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem >
              <Link href="/settings" className="cursor-pointer w-full">
                Profil & Paramètres
              </Link>
            </DropdownMenuItem>
            {user?.role === "ADMIN" && (
              <DropdownMenuItem >
                <Link href="/settings" className="cursor-pointer w-full">
                  Paramètres
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
