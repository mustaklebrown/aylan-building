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
  User as UserIcon,
  Mail,
  Shield,
  ChevronRight,
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

import { useEffect, useCallback } from "react";
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/server/actions/notification-actions";
import { Check, CheckCheck } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrateur", color: "#F3C442", bg: "rgba(243,196,66,0.12)" },
  ACCOUNTANT: { label: "Comptable", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  LEADER: { label: "Leader", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  AGENT: { label: "Téléconseiller", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ECOMMERCANT: { label: "E-commerçant", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  STOCKISTE: { label: "Stockiste", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  DELIVERY: { label: "Livreur", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
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
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "ECOMMERCANT", "STOCKISTE", "DELIVERY_ASSISTANT"],
  },
  {
    title: "CRM / Prospects",
    href: "/crm",
    icon: Users,
    roles: ["ADMIN", "LEADER", "AGENT", "ECOMMERCANT"],
  },
  {
    title: "Vendeurs & Équipes",
    href: "/agents",
    icon: Contact,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "STOCKISTE"],
  },
  {
    title: "Produits & Stock",
    href: "/products",
    icon: Package,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "ECOMMERCANT", "STOCKISTE", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Ventes",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "ECOMMERCANT", "STOCKISTE", "DELIVERY_ASSISTANT"],
  },
  {
    title: "Livraisons",
    href: "/deliveries",
    icon: Truck,
    roles: ["ADMIN", "ACCOUNTANT", "DELIVERY_ASSISTANT", "DELIVERY"],
  },
  {
    title: "Commissions",
    href: "/commissions",
    icon: Banknote,
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "ECOMMERCANT", "STOCKISTE"],
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
    roles: ["ADMIN", "ACCOUNTANT", "LEADER", "AGENT", "ECOMMERCANT", "STOCKISTE", "DELIVERY_ASSISTANT"],
  },
];

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getUserNotificationsAction();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (e) {
      console.error("Error loading notifications:", e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications sont marquées comme lues");
    } catch (e) {
      toast.error("Erreur de mise à jour");
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

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
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative h-9 w-9" />}>
            <Bell className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 overflow-hidden shadow-xl border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nouvelle(s)
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-indigo-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Tout lire
                </button>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <Bell className="h-6 w-6 mx-auto text-slate-300 mb-2 opacity-50" />
                  Aucune notification pour le moment.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) handleMarkOneRead(n.id);
                      if (user.role === "DELIVERY" || user.role === "DELIVERY_ASSISTANT") {
                        router.push("/deliveries");
                      }
                    }}
                    className={`p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-start justify-between gap-3 ${
                      !n.read ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.createdAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            }
          >
            <div className="relative">
              <Avatar className="h-8 w-8 ring-2 ring-indigo-600/20 shadow-xs">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
                {user?.name || "Utilisateur"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {roleInfo.label}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 p-2 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800" align="end">
            {/* Header info utilisateur */}
            <div className="p-3 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-purple-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 rounded-xl border border-indigo-100/60 dark:border-slate-800/80 mb-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-11 w-11 ring-2 ring-indigo-600/30 shrink-0">
                    {user?.image ? (
                      <AvatarImage src={user.image} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-black text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {user?.name || "Utilisateur"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 font-mono">
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{user?.email || "user@aylan.com"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500 font-medium">Rôle actif</span>
                <span
                  className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider"
                  style={{ color: roleInfo.color, backgroundColor: roleInfo.bg }}
                >
                  {roleInfo.label}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1.5" />

            {/* Menu Items */}
            <div className="space-y-0.5 text-xs font-medium">
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
              >
                <UserIcon className="h-4 w-4 text-indigo-500" />
                <span className="flex-1 font-medium">Mon Profil & Coordonnées</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </DropdownMenuItem>

              {(user?.role === "AGENT" || user?.role === "ECOMMERCANT" || user?.role === "LEADER" || user?.role === "ADMIN") && (
                <DropdownMenuItem
                  onClick={() => router.push("/commissions")}
                  className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors"
                >
                  <Banknote className="h-4 w-4 text-emerald-500" />
                  <span className="flex-1 font-medium">Mes Gains & Commissions</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </DropdownMenuItem>
              )}

              {(user?.role === "DELIVERY" || user?.role === "DELIVERY_ASSISTANT" || user?.role === "ADMIN") && (
                <DropdownMenuItem
                  onClick={() => router.push("/deliveries")}
                  className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 transition-colors"
                >
                  <Truck className="h-4 w-4 text-amber-500" />
                  <span className="flex-1 font-medium">Expéditions & Livraisons</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => router.push("/sales")}
                className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-600 transition-colors"
              >
                <ShoppingCart className="h-4 w-4 text-purple-500" />
                <span className="flex-1 font-medium">Suivi des Ventes</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="flex-1 font-medium">Paramètres de compte</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2.5 p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer font-bold text-xs"
            >
              <LogOut className="h-4 w-4 text-red-500" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
