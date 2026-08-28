"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  Package,
  DollarSign,
  Truck,
  Printer,
  ClipboardList,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  Download,
  MessageCircle,
  Zap,
  ArrowRight,
  Signal,
  SignalZero,
  X,
  RefreshCw,
  BellRing,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateDeliveryStatusAction,
  toggleDriverAvailabilityAction,
  claimDeliveryAction,
  rejectDeliveryAction,
  getAvailableDeliveriesAction,
} from "@/server/actions/sale-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";

interface SaleDelivery {
  id: string;
  date: Date | string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  totalAmount: number;
  agentName: string;
  status: string;
  shippingType: string;
  shippingCity: string | null;
  shippingAddress: string | null;
  shippingFee: number;
  driverId?: string | null;
  driverName?: string | null;
}

interface DeliveriesClientPageProps {
  initialSales: SaleDelivery[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    isAvailable?: boolean;
  };
}

// --- Status helpers ---
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING: { label: "En attente", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "⏳" },
  CONFIRMED: { label: "Confirmée", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: "✅" },
  SHIPPED: { label: "En route", color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "🚚" },
  DELIVERED: { label: "Livrée", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: "✅" },
  CANCELLED: { label: "Annulée", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "❌" },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Confirmer",
  CONFIRMED: "Expédier",
  SHIPPED: "Marquer livrée",
};

export function DeliveriesClientPage({
  initialSales,
  currentUser,
}: DeliveriesClientPageProps) {
  const [sales, setSales] = useState<SaleDelivery[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [quickTab, setQuickTab] = useState<"all" | "available" | "my_deliveries">(
    currentUser.role === "DELIVERY" ? "available" : "all"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(currentUser.isAvailable ?? true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active delivery modals
  const [activeSlip, setActiveSlip] = useState<SaleDelivery | null>(null);
  const [runsheetOpen, setRunsheetOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<SaleDelivery | null>(null);

  // NEW: Incoming delivery alert (mobile banner)
  const [incomingDelivery, setIncomingDelivery] = useState<SaleDelivery | null>(null);
  const previousSaleIdsRef = useRef<Set<string>>(new Set(initialSales.map(s => s.id)));

  const isDriver = currentUser.role === "DELIVERY";

  // ==========================================
  // AUTO-REFRESH: Poll for new deliveries every 8s for drivers
  // ==========================================
  useEffect(() => {
    if (!isDriver) return;

    const interval = setInterval(async () => {
      try {
        const res = await getAvailableDeliveriesAction();
        if (res.success && res.sales) {
          const newSales = res.sales as SaleDelivery[];
          setSales(newSales);

          // Detect truly new unassigned deliveries
          const currentIds = previousSaleIdsRef.current;
          const newUnassigned = newSales.filter(
            s => s.shippingType === "DELIVERY" && s.status === "PENDING" && !s.driverId && !currentIds.has(s.id)
          );

          if (newUnassigned.length > 0 && !incomingDelivery) {
            // Show the first new delivery as an alert
            setIncomingDelivery(newUnassigned[0]);
            // Vibrate on mobile
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
          }

          // Update the ref
          previousSaleIdsRef.current = new Set(newSales.map(s => s.id));
        }
      } catch (err) {
        // Silently fail for polling
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isDriver, incomingDelivery]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getAvailableDeliveriesAction();
      if (res.success && res.sales) {
        setSales(res.sales as SaleDelivery[]);
        previousSaleIdsRef.current = new Set((res.sales as SaleDelivery[]).map(s => s.id));
        toast.success("Liste mise à jour");
      }
    } catch (err) {
      toast.error("Erreur de rafraîchissement");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleToggleAvailability = useCallback(async () => {
    setIsTogglingAvailability(true);
    try {
      const res = await toggleDriverAvailabilityAction();
      if (res.success && res.isAvailable !== undefined) {
        setIsAvailable(res.isAvailable);
        toast.success(
          res.isAvailable
            ? "Vous êtes maintenant DISPONIBLE !"
            : "Vous êtes HORS SERVICE."
        );
      } else {
        toast.error(res.error || "Erreur.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau");
    } finally {
      setIsTogglingAvailability(false);
    }
  }, []);

  const handleClaimDelivery = useCallback(async (saleId: string) => {
    setUpdatingId(saleId);
    try {
      const res = await claimDeliveryAction(saleId);
      if (res.success) {
        toast.success("Livraison acceptée !");
        setSales((prev) =>
          prev.map((s) =>
            s.id === saleId
              ? { ...s, driverId: currentUser.id, driverName: currentUser.name, status: "CONFIRMED" }
              : s
          )
        );
        setIsAvailable(false);
        // Clear incoming alert if it was this sale
        if (incomingDelivery?.id === saleId) {
          setIncomingDelivery(null);
        }
        // Close detail card if open
        if (detailCard?.id === saleId) {
          setDetailCard((prev) => prev ? { ...prev, driverId: currentUser.id, driverName: currentUser.name, status: "CONFIRMED" } : null);
        }
      } else {
        toast.error(res.error || "Erreur.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau.");
    } finally {
      setUpdatingId(null);
    }
  }, [currentUser.id, currentUser.name, incomingDelivery, detailCard]);

  const handleRejectDelivery = useCallback(async (saleId: string) => {
    setUpdatingId(saleId);
    try {
      const res = await rejectDeliveryAction(saleId);
      if (res.success) {
        toast.success("Livraison refusée.");
        setSales((prev) =>
          prev.map((s) =>
            s.id === saleId
              ? { ...s, driverId: null, driverName: null, status: "PENDING" }
              : s
          )
        );
        setIsAvailable(true);
        // Clear incoming alert
        if (incomingDelivery?.id === saleId) {
          setIncomingDelivery(null);
        }
        if (detailCard?.id === saleId) {
          setDetailCard(null);
        }
      } else {
        toast.error(res.error || "Erreur.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau.");
    } finally {
      setUpdatingId(null);
    }
  }, [incomingDelivery, detailCard]);

  const handleUpdateStatus = useCallback(async (saleId: string, newStatus: string) => {
    setUpdatingId(saleId);
    try {
      const res = await updateDeliveryStatusAction(saleId, newStatus);
      if (res.success) {
        toast.success(`Statut : ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        setSales((prev) =>
          prev.map((s) => (s.id === saleId ? { ...s, status: newStatus } : s))
        );
        if (detailCard?.id === saleId) {
          setDetailCard((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        toast.error(res.error || "Erreur.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    } finally {
      setUpdatingId(null);
    }
  }, [detailCard]);

  const handleQuickAdvance = useCallback(async (sale: SaleDelivery) => {
    const next = NEXT_STATUS[sale.status];
    if (!next) return;
    await handleUpdateStatus(sale.id, next);
  }, [handleUpdateStatus]);

  // Memoized filters
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesRegion = regionFilter === "all" || s.shippingCity === regionFilter;
      const matchesType = typeFilter === "all" || s.shippingType === typeFilter;

      let matchesQuickTab = true;
      if (quickTab === "available") {
        matchesQuickTab = s.shippingType === "DELIVERY" && s.status === "PENDING" && !s.driverId;
      } else if (quickTab === "my_deliveries") {
        matchesQuickTab = s.driverId === currentUser.id;
      }

      return matchesSearch && matchesStatus && matchesRegion && matchesType && matchesQuickTab;
    });
  }, [sales, searchTerm, statusFilter, regionFilter, typeFilter, quickTab, currentUser.id]);

  // Memoized stats
  const stats = useMemo(() => ({
    pending: sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "PENDING").length,
    shipped: sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "SHIPPED").length,
    delivered: sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "DELIVERED").length,
    totalFee: filteredSales.reduce((sum, s) => sum + s.shippingFee, 0),
    available: sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "PENDING" && !s.driverId).length,
    myActive: sales.filter((s) => s.driverId === currentUser.id && s.status !== "DELIVERED" && s.status !== "CANCELLED").length,
    myDelivered: sales.filter((s) => s.driverId === currentUser.id && s.status === "DELIVERED").length,
  }), [sales, filteredSales, currentUser.id]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSales.map((s) => s.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "?" };
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
        style={{ color: cfg.color, background: cfg.bg }}
      >
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const handlePrint = () => { window.print(); };

  const handleExport = () => {
    exportToCSV(
      filteredSales,
      ["ID Commande", "Date", "Client", "Telephone", "WhatsApp", "Produit", "SKU", "Quantite", "Prix Unitaire (KMF)", "Frais de Livraison (KMF)", "Total (KMF)", "Agent", "Statut Livraison", "Mode de Distribution", "Region", "Adresse Detaillee"],
      (s) => [s.id, formatDate(s.date), s.customerName, s.customerPhone, s.customerWhatsapp || "", s.productName, s.productSku, s.quantity, s.price, s.shippingFee, s.totalAmount, s.agentName, s.status, s.shippingType, s.shippingCity || "", s.shippingAddress || ""],
      "livraisons_aylan"
    );
  };

  const selectedSalesForRunsheet = sales.filter((s) => selectedIds.includes(s.id));

  // ==========================================
  // MOBILE DRIVER VIEW
  // ==========================================
  const renderMobileDriverView = () => (
    <div className="flex flex-col gap-0 pb-24 -mt-2">
      {/* ===== INCOMING DELIVERY ALERT BANNER ===== */}
      {incomingDelivery && (
        <div
          className="fixed inset-x-0 top-16 z-50 mx-2 animate-in slide-in-from-top-4 duration-300"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.2)",
          }}
        >
          <div className="p-4">
            {/* Pulsing header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500/30 flex items-center justify-center animate-pulse">
                <BellRing className="h-4 w-4 text-indigo-300" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-extrabold text-white">Nouvelle livraison !</p>
                <p className="text-[10px] text-indigo-300 font-medium">
                  #{incomingDelivery.id.slice(-6).toUpperCase()} • {incomingDelivery.shippingCity || "Moroni"}
                </p>
              </div>
              <button
                onClick={() => setIncomingDelivery(null)}
                className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-white/60" />
              </button>
            </div>

            {/* Info row */}
            <div className="flex items-center justify-between mb-3 bg-white/5 rounded-xl p-3">
              <div>
                <p className="text-[14px] font-extrabold text-white">{incomingDelivery.customerName}</p>
                <p className="text-[11px] text-indigo-300 mt-0.5">
                  {incomingDelivery.productName} × {incomingDelivery.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-black text-white">{formatCurrency(incomingDelivery.totalAmount)}</p>
                <p className="text-[10px] text-indigo-400 flex items-center justify-end gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" /> {incomingDelivery.shippingAddress || "Adresse à confirmer"}
                </p>
              </div>
            </div>

            {/* Accept / Reject buttons */}
            <div className="flex gap-2">
              <button
                disabled={updatingId === incomingDelivery.id}
                onClick={() => handleClaimDelivery(incomingDelivery.id)}
                className="flex-1 h-12 rounded-xl text-[14px] font-extrabold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow: "0 4px 14px rgba(34,197,94,0.4)",
                }}
              >
                <CheckCheck className="h-5 w-5" />
                {updatingId === incomingDelivery.id ? "..." : "Accepter"}
              </button>
              <button
                disabled={updatingId === incomingDelivery.id}
                onClick={() => { setIncomingDelivery(null); }}
                className="w-14 h-12 rounded-xl text-[14px] font-extrabold flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky top bar */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 glass-nav border-b border-slate-200/50 dark:border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
              style={{
                background: isAvailable
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: isAvailable
                  ? "0 4px 14px rgba(34,197,94,0.3)"
                  : "0 4px 14px rgba(245,158,11,0.3)",
              }}
            >
              {isAvailable ? <Signal className="h-4 w-4 text-white" /> : <SignalZero className="h-4 w-4 text-white" />}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-800 dark:text-white truncate">
                {isAvailable ? "En service" : "Hors service"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {isAvailable ? `${stats.available} colis disponible(s)` : "Activez pour recevoir des colis"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-all active:scale-90"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              disabled={isTogglingAvailability}
              onClick={handleToggleAvailability}
              className="shrink-0 h-9 px-4 rounded-xl text-[12px] font-extrabold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{
                background: isAvailable
                  ? "rgba(245,158,11,0.12)"
                  : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                color: isAvailable ? "#d97706" : "#fff",
                border: isAvailable ? "1px solid rgba(245,158,11,0.2)" : "none",
                boxShadow: !isAvailable ? "0 4px 14px rgba(34,197,94,0.3)" : "none",
              }}
            >
              {isTogglingAvailability ? "..." : isAvailable ? "Pause" : "Démarrer"}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mt-4 -mx-1">
        <button
          onClick={() => { setQuickTab("available"); setStatusFilter("all"); }}
          className={`p-3 rounded-2xl text-center transition-all duration-200 active:scale-95 ${
            quickTab === "available" ? "ring-2 ring-indigo-500 ring-offset-1" : ""
          }`}
          style={{
            background: quickTab === "available"
              ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
              : "rgba(99,102,241,0.08)",
          }}
        >
          <p className={`text-2xl font-black ${quickTab === "available" ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`}>
            {stats.available}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 ${quickTab === "available" ? "text-indigo-200" : "text-indigo-500/70"}`}>
            Disponibles
          </p>
        </button>
        <button
          onClick={() => { setQuickTab("my_deliveries"); setStatusFilter("all"); }}
          className={`p-3 rounded-2xl text-center transition-all duration-200 active:scale-95 ${
            quickTab === "my_deliveries" ? "ring-2 ring-amber-500 ring-offset-1" : ""
          }`}
          style={{
            background: quickTab === "my_deliveries"
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "rgba(245,158,11,0.08)",
          }}
        >
          <p className={`text-2xl font-black ${quickTab === "my_deliveries" ? "text-white" : "text-amber-600 dark:text-amber-400"}`}>
            {stats.myActive}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 ${quickTab === "my_deliveries" ? "text-amber-200" : "text-amber-500/70"}`}>
            En cours
          </p>
        </button>
        <button
          onClick={() => { setQuickTab("all"); setStatusFilter("DELIVERED"); }}
          className="p-3 rounded-2xl text-center transition-all duration-200 active:scale-95"
          style={{ background: "rgba(34,197,94,0.08)" }}
        >
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{stats.myDelivered}</p>
          <p className="text-[10px] font-bold mt-0.5 text-green-500/70">Livrées</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Rechercher un client, produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-3 mt-4">
        {filteredSales.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Truck className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500">Aucune livraison</p>
            <p className="text-xs text-slate-400 mt-1">
              {quickTab === "available"
                ? "Pas de colis disponibles pour le moment"
                : "Aucune livraison ne correspond aux critères"}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 h-10 px-6 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 transition-all active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 inline mr-1.5" />
              Actualiser
            </button>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const isUnassigned = sale.shippingType === "DELIVERY" && !sale.driverId;
            const isMine = sale.driverId === currentUser.id;
            const isUpdating = updatingId === sale.id;
            const statusCfg = STATUS_CONFIG[sale.status] || STATUS_CONFIG.PENDING;
            const nextStatus = NEXT_STATUS[sale.status];

            return (
              <div
                key={sale.id}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  background: isUnassigned
                    ? "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 100%)"
                    : "rgba(255,255,255,0.7)",
                  border: isUnassigned
                    ? "1.5px solid rgba(99,102,241,0.2)"
                    : isMine
                    ? `1.5px solid ${statusCfg.color}30`
                    : "1px solid rgba(226,232,240,0.6)",
                  boxShadow: isUnassigned
                    ? "0 4px 20px rgba(99,102,241,0.08)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Card header - tap to expand */}
                <button
                  onClick={() => setDetailCard(sale)}
                  className="w-full text-left p-4 pb-3 active:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isUnassigned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded-md animate-pulse">
                            <Zap className="h-2.5 w-2.5" /> NOUVEAU
                          </span>
                        )}
                        {getStatusBadge(sale.status)}
                      </div>
                      <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-white truncate">
                        {sale.customerName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{sale.shippingCity || "Moroni"}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500 font-semibold truncate">{sale.productName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-black text-slate-800 dark:text-white">
                        {formatCurrency(sale.totalAmount)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        #{sale.id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  {isUnassigned && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => handleClaimDelivery(sale.id)}
                        className="flex-1 h-11 rounded-xl text-[13px] font-extrabold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
                        style={{
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
                        }}
                      >
                        <CheckCheck className="h-4 w-4" />
                        {isUpdating ? "..." : "Accepter"}
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => handleRejectDelivery(sale.id)}
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-60"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </>
                  )}
                  {isMine && nextStatus && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleQuickAdvance(sale)}
                      className="flex-1 h-11 rounded-xl text-[13px] font-extrabold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'} 0%, ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'}dd 100%)`,
                        boxShadow: `0 4px 14px ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'}40`,
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {isUpdating ? "..." : NEXT_STATUS_LABEL[sale.status]}
                    </button>
                  )}
                  {isMine && sale.status === "CONFIRMED" && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleRejectDelivery(sale.id)}
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-60"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                      }}
                      title="Refuser cette livraison"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                  {/* Call */}
                  <a
                    href={`tel:${sale.customerPhone}`}
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95"
                    style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}
                  >
                    <Phone className="h-4 w-4 text-blue-600" />
                  </a>
                  {/* WhatsApp */}
                  {sale.customerWhatsapp && (
                    <a
                      href={`https://wa.me/${sale.customerWhatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)" }}
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ==========================================
  // DESKTOP / ADMIN VIEW (table-based)
  // ==========================================
  const renderDesktopView = () => (
    <div className="flex flex-col space-y-6">
      {/* Printable Runsheet */}
      {runsheetOpen && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999] overflow-y-auto">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">AYLAN GROUP</h1>
              <p className="text-xs text-slate-500 font-medium">Moroni Magoudjou, Grande Comore</p>
              <p className="text-xs text-slate-500">Contact: +269 333-33-33</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold">FEUILLE DE ROUTE LIVRAISONS</h2>
              <p className="text-xs text-slate-500">Date: {new Date().toLocaleDateString("fr-FR")}</p>
              <p className="text-xs text-slate-500">Livreur : ___________________________</p>
            </div>
          </div>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">N° Vente</th>
                <th className="border border-slate-300 p-2 text-left">Client & Téléphone</th>
                <th className="border border-slate-300 p-2 text-left">Destination</th>
                <th className="border border-slate-300 p-2 text-left">Produit</th>
                <th className="border border-slate-300 p-2 text-center">Qté</th>
                <th className="border border-slate-300 p-2 text-right">Montant</th>
                <th className="border border-slate-300 p-2 text-center">Émargement</th>
              </tr>
            </thead>
            <tbody>
              {selectedSalesForRunsheet.map((s) => (
                <tr key={s.id}>
                  <td className="border border-slate-300 p-2 font-mono text-xs">{s.id.slice(-6)}</td>
                  <td className="border border-slate-300 p-2">
                    <p className="font-bold">{s.customerName}</p>
                    <p className="text-xs font-mono">{s.customerPhone}</p>
                  </td>
                  <td className="border border-slate-300 p-2">
                    <p className="font-semibold text-xs">{s.shippingCity}</p>
                    <p className="text-xs">{s.shippingAddress}</p>
                  </td>
                  <td className="border border-slate-300 p-2 text-xs">{s.productName}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">{s.quantity}</td>
                  <td className="border border-slate-300 p-2 text-right font-bold">{s.totalAmount} KMF</td>
                  <td className="border border-slate-300 p-2 h-12"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-12 flex justify-between text-xs font-semibold">
            <div>Nombre de colis : {selectedSalesForRunsheet.length}</div>
            <div>Montant Total : {selectedSalesForRunsheet.reduce((sum, s) => sum + s.totalAmount, 0)} KMF</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            Gestion des Livraisons & Colis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organisez les tournées, modifiez les statuts et imprimez les documents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" className="border-slate-200 hover:bg-slate-50 font-medium">
            <Download className="mr-2 h-4 w-4" /> Exporter
          </Button>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <Badge className="bg-indigo-600 text-white font-bold py-1 px-2.5">{selectedIds.length} sélectionné(s)</Badge>
              <Button onClick={() => setRunsheetOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-2">
                <ClipboardList className="h-3.5 w-3.5" /> Feuille de Route
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Driver bar (desktop) */}
      {(currentUser.role === "DELIVERY" || currentUser.role === "DELIVERY_ASSISTANT") && (
        <div className="glass-card p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-slate-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Truck className="h-5 w-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Statut ({currentUser.name}) :</span>
                {isAvailable ? (
                  <Badge className="bg-emerald-500 text-white font-bold text-xs animate-pulse">🟢 DISPONIBLE</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 font-bold text-xs">🔴 INDISPONIBLE</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            disabled={isTogglingAvailability}
            onClick={handleToggleAvailability}
            variant={isAvailable ? "outline" : "default"}
            className={isAvailable
              ? "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 font-bold text-xs h-9"
              : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-md"
            }
          >
            {isTogglingAvailability ? "..." : isAvailable ? "Passer Indisponible" : "🟢 Se déclarer Disponible"}
          </Button>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex items-center bg-background rounded-lg p-1 border border-slate-200 dark:border-slate-800 text-xs w-fit print:hidden">
        <button onClick={() => { setQuickTab("all"); setStatusFilter("all"); }} className={`px-3 py-1.5 rounded-md font-semibold transition-all ${quickTab === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
          Toutes ({sales.length})
        </button>
        <button onClick={() => { setQuickTab("available"); setStatusFilter("all"); }} className={`px-3 py-1.5 rounded-md font-semibold transition-all ${quickTab === "available" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
          🚚 Disponibles ({stats.available})
        </button>
        <button onClick={() => { setQuickTab("my_deliveries"); setStatusFilter("all"); }} className={`px-3 py-1.5 rounded-md font-semibold transition-all ${quickTab === "my_deliveries" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
          📍 Mes Livraisons ({sales.filter((s) => s.driverId === currentUser.id).length})
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="glass-card hover:-translate-y-0.5 transition-all border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-amber-700 uppercase tracking-wider">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-black text-slate-800 dark:text-amber-400 mt-1">{stats.pending}</div></CardContent>
        </Card>
        <Card className="glass-card hover:-translate-y-0.5 transition-all border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-700 uppercase tracking-wider">En route</CardTitle>
            <Truck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-black dark:text-indigo-400 mt-1">{stats.shipped}</div></CardContent>
        </Card>
        <Card className="glass-card hover:-translate-y-0.5 transition-all border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-green-700 uppercase tracking-wider">Livrées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-black dark:text-green-400 mt-1">{stats.delivered}</div></CardContent>
        </Card>
        <Card className="glass-card hover:-translate-y-0.5 transition-all border-slate-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frais actifs</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-black mt-1">{formatCurrency(stats.totalFee)}</div></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="glass-card border-slate-200/50 print:hidden">
        <CardHeader className="pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Colis & Livraisons</CardTitle>
            <CardDescription>Gérez les commandes et émargements.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Client, produit, N°..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 bg-background h-9 text-sm border-slate-200" />
            </div>
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
              <SelectTrigger className="w-[130px] h-9 border-slate-200 bg-background"><SelectValue placeholder="Distribution" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="DELIVERY">🚚 Livraison</SelectItem>
                <SelectItem value="PICKUP">🛍️ Retrait</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || "all")}>
              <SelectTrigger className="w-[130px] h-9 border-slate-200 bg-background"><SelectValue placeholder="Région" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="MORONI">Moroni</SelectItem>
                <SelectItem value="GRANDE_COMORE">Grande Comore</SelectItem>
                <SelectItem value="ANJOUAN">Anjouan</SelectItem>
                <SelectItem value="MOHELI">Mohéli</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="w-[130px] h-9 border-slate-200 bg-background"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                <SelectItem value="SHIPPED">Expédiée</SelectItem>
                <SelectItem value="DELIVERED">Livrée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input type="checkbox" checked={filteredSales.length > 0 && selectedIds.length === filteredSales.length} onChange={toggleSelectAll} className="rounded border-slate-300 text-indigo-600" />
                  </TableHead>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Livreur</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                      <AlertCircle className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                      Aucun résultat.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => {
                    const isSelected = selectedIds.includes(s.id);
                    const isUnassigned = s.shippingType === "DELIVERY" && !s.driverId;
                    return (
                      <TableRow key={s.id} className={`${isSelected ? "bg-indigo-50/20" : ""} hover:bg-slate-50/50 transition-colors`}>
                        <TableCell className="text-center">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.id)} className="rounded border-slate-300 text-indigo-600 cursor-pointer" />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-500">#{s.id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{s.customerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5"><Phone className="h-2.5 w-2.5" /> {s.customerPhone}</div>
                        </TableCell>
                        <TableCell>
                          {s.shippingType === "DELIVERY" ? (
                            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] border border-indigo-200/40">🚚 Livraison</Badge>
                          ) : (
                            <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 text-[10px]">🛍️ Retrait</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {s.shippingType === "DELIVERY" ? (
                            <div>
                              <span className="text-xs font-bold text-indigo-600 uppercase mr-1.5">{s.shippingCity}</span>
                              <span className="text-xs text-slate-500 truncate block sm:inline">{s.shippingAddress}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Moroni (Aylan Building)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {s.driverName ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">👤 {s.driverName}</Badge>
                          ) : s.shippingType === "DELIVERY" ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">⏳ Non assigné</Badge>
                          ) : (<span className="text-xs text-slate-400">-</span>)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.productName}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">Qté: {s.quantity}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-extrabold text-xs">{s.totalAmount} KMF</div>
                          {s.shippingFee > 0 && <div className="text-[9px] text-slate-400">({s.shippingFee} livr.)</div>}
                        </TableCell>
                        <TableCell>
                          <Select disabled={updatingId === s.id} value={s.status} onValueChange={(val) => { if (val) handleUpdateStatus(s.id, val); }}>
                            <SelectTrigger className="h-7 w-[110px] text-xs font-bold border-slate-200 bg-background shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">En attente</SelectItem>
                              <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                              <SelectItem value="SHIPPED">Expédiée</SelectItem>
                              <SelectItem value="DELIVERED">Livrée</SelectItem>
                              <SelectItem value="CANCELLED">Annulée</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isUnassigned && (
                              <Button size="sm" disabled={updatingId === s.id} onClick={() => handleClaimDelivery(s.id)} className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1">
                                <Truck className="h-3 w-3" /> Assigner
                              </Button>
                            )}
                            <Button variant="outline" size="icon" onClick={() => setActiveSlip(s)} className="h-7 w-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="print:p-0">
      {isDriver ? (
        <>
          <div className="block md:hidden print:hidden">{renderMobileDriverView()}</div>
          <div className="hidden md:block">{renderDesktopView()}</div>
        </>
      ) : (
        renderDesktopView()
      )}

      {/* ===== DETAIL CARD MODAL (Mobile) ===== */}
      <Dialog open={detailCard !== null} onOpenChange={(open) => !open && setDetailCard(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl">
          {detailCard && (() => {
            const statusCfg = STATUS_CONFIG[detailCard.status] || STATUS_CONFIG.PENDING;
            const nextStatus = NEXT_STATUS[detailCard.status];
            const isMine = detailCard.driverId === currentUser.id;
            const isUnassigned = detailCard.shippingType === "DELIVERY" && !detailCard.driverId;
            const isUpdating = updatingId === detailCard.id;

            return (
              <>
                <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${statusCfg.color}15 0%, ${statusCfg.color}05 100%)`, borderBottom: `1px solid ${statusCfg.color}20` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      {getStatusBadge(detailCard.status)}
                      <h3 className="text-xl font-black text-slate-800 dark:text-white mt-2">{detailCard.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">#{detailCard.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(detailCard.totalAmount)}</p>
                      {detailCard.shippingFee > 0 && <p className="text-[10px] text-slate-400 mt-0.5">dont {formatCurrency(detailCard.shippingFee)} livr.</p>}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0"><MapPin className="h-4 w-4 text-indigo-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination</p>
                      <p className="text-sm font-bold text-indigo-600">{detailCard.shippingCity || "Moroni"}</p>
                      <p className="text-xs text-slate-600">{detailCard.shippingAddress || "Retrait sur place"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-purple-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produit</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{detailCard.productName}</p>
                      <p className="text-xs text-slate-500">Qté: {detailCard.quantity} • SKU: {detailCard.productSku}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-slate-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{detailCard.agentName}</p>
                      <p className="text-xs text-slate-500">{formatDate(detailCard.date)}</p>
                    </div>
                  </div>

                  {/* Contact buttons */}
                  <div className="flex gap-2">
                    <a href={`tel:${detailCard.customerPhone}`} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold active:scale-95 transition-all" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}>
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                    {detailCard.customerWhatsapp && (
                      <a href={`https://wa.me/${detailCard.customerWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold active:scale-95 transition-all" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {/* Action footer */}
                <div className="px-5 pb-5 space-y-2">
                  {isUnassigned && (
                    <div className="flex gap-2">
                      <button disabled={isUpdating} onClick={() => handleClaimDelivery(detailCard.id)} className="flex-1 h-12 rounded-xl text-[14px] font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 transition-all" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}>
                        <CheckCheck className="h-5 w-5" /> {isUpdating ? "..." : "Accepter cette livraison"}
                      </button>
                      <button disabled={isUpdating} onClick={() => handleRejectDelivery(detailCard.id)} className="h-12 w-14 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-60 transition-all" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <X className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  )}
                  {isMine && nextStatus && (
                    <div className="flex gap-2">
                      <button disabled={isUpdating} onClick={() => handleQuickAdvance(detailCard)} className="flex-1 h-12 rounded-xl text-[14px] font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 transition-all" style={{ background: `linear-gradient(135deg, ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'} 0%, ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'}dd 100%)`, boxShadow: `0 4px 14px ${STATUS_CONFIG[nextStatus]?.color || '#6366f1'}40` }}>
                        <ArrowRight className="h-5 w-5" /> {isUpdating ? "..." : NEXT_STATUS_LABEL[detailCard.status]}
                      </button>
                      {detailCard.status === "CONFIRMED" && (
                        <button disabled={isUpdating} onClick={() => handleRejectDelivery(detailCard.id)} className="h-12 w-14 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-60 transition-all" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <X className="h-5 w-5 text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Runsheet Dialog */}
      <Dialog open={runsheetOpen} onOpenChange={setRunsheetOpen}>
        <DialogContent className="sm:max-w-[850px] print:hidden max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /> Feuille de Route</DialogTitle>
            <DialogDescription>Vérifiez avant impression.</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-5 space-y-4 bg-slate-50 dark:bg-slate-900/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">N°</TableHead>
                  <TableHead className="font-bold">Destinataire</TableHead>
                  <TableHead className="font-bold">Adresse</TableHead>
                  <TableHead className="font-bold text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSalesForRunsheet.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-semibold">#{s.id.slice(-6).toUpperCase()}</TableCell>
                    <TableCell>
                      <p className="font-bold text-xs">{s.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.customerPhone}</p>
                    </TableCell>
                    <TableCell className="text-xs"><span className="font-bold text-indigo-600">{s.shippingCity}</span> {s.shippingAddress}</TableCell>
                    <TableCell className="text-right font-bold text-xs">{s.totalAmount} KMF</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between text-xs font-bold border-t pt-3">
              <span>{selectedSalesForRunsheet.length} colis</span>
              <span className="text-indigo-600">Total: {selectedSalesForRunsheet.reduce((sum, s) => sum + s.totalAmount, 0)} KMF</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRunsheetOpen(false)}>Fermer</Button>
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Printer className="h-4 w-4" /> Imprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Slip Dialog */}
      <Dialog open={activeSlip !== null} onOpenChange={(open) => !open && setActiveSlip(null)}>
        <DialogContent className="sm:max-w-[500px] print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Bordereau de Livraison</DialogTitle>
            <DialogDescription>Bon de transport individuel.</DialogDescription>
          </DialogHeader>
          {activeSlip && (
            <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white text-slate-900 shadow-sm">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-black tracking-tight">AYLAN GROUP</h3>
                  <p className="text-[10px] text-slate-500 font-medium">BORDEREAU DE LIVRAISON</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">#{activeSlip.id.slice(-6).toUpperCase()}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(activeSlip.date).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destinataire</div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
                  <p className="text-sm font-bold">{activeSlip.customerName}</p>
                  <p className="text-xs flex items-center gap-1 font-mono text-slate-600"><Phone className="h-3 w-3 text-slate-400" /> {activeSlip.customerPhone}</p>
                  <p className="text-xs flex items-center gap-1 text-slate-600">
                    <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span><strong className="text-indigo-600 uppercase font-bold">{activeSlip.shippingCity || "Moroni"}</strong> - {activeSlip.shippingAddress || "Retrait sur place"}</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contenu</div>
                <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <div className="flex justify-between bg-slate-50 p-2 font-semibold border-b"><span>Désignation</span><span>Qté</span><span className="text-right">Montant</span></div>
                  <div className="flex justify-between p-2.5 border-b"><span>{activeSlip.productName}</span><span className="font-bold">x{activeSlip.quantity}</span><span className="font-semibold">{activeSlip.price * activeSlip.quantity} KMF</span></div>
                  {activeSlip.shippingFee > 0 && <div className="flex justify-between p-2.5 text-slate-500 border-b"><span>Frais livraison</span><span>-</span><span>{activeSlip.shippingFee} KMF</span></div>}
                  <div className="flex justify-between p-3 font-bold bg-indigo-50/50 text-indigo-900 text-sm"><span>TOTAL</span><span>{activeSlip.totalAmount} KMF</span></div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 bg-slate-50 p-2.5 rounded border text-center">Merci ! Aylan Group - Qualité et Service.</div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveSlip(null)}>Fermer</Button>
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Printer className="h-4 w-4" /> Imprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
