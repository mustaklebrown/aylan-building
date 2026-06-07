"use client";

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
import { cn } from "@/lib/utils";

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

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
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
            <SheetContent side="left" className="w-[280px] bg-slate-950 p-0 text-slate-200">
              <div className="flex h-16 items-center gap-2 border-b border-slate-900 px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 text-white font-bold">
                  A
                </div>
                <span className="text-lg font-bold tracking-tight text-white font-heading">AYLAN GROUP</span>
              </div>
              
              <nav className="flex-1 space-y-1 p-4 mt-2">
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
              
              <div className="border-t border-slate-900 p-4 absolute bottom-0 w-full bg-slate-950">
                <div className="text-xs text-slate-500 font-mono flex items-center justify-between">
                  <span>Rôle:</span>
                  <span className="bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded font-bold">{role}</span>
                </div>
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
            <DropdownMenuItem>
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem>
              Paramètres
            </DropdownMenuItem>
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
