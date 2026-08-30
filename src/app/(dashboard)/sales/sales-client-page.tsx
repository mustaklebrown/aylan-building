"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
  User,
  Package,
  Calendar,
  DollarSign,
  Truck,
  MoreVertical,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  createSaleAction,
  updateDeliveryStatusAction,
} from "@/server/actions/sale-actions";
import { Timeframe, filterByTimeframe } from "@/lib/date-utils";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";
import { InvoiceModal } from "@/components/invoice/invoice-modal";

interface CommissionItem {
  id: string;
  amount: number;
  status: string;
  role: string;
  agentId: string;
}

interface Sale {
  id: string;
  date: Date;
  customerName: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  totalAmount: number;
  agentId: string;
  agentName: string;
  sellerRole?: string;
  stockisteId?: string | null;
  stockisteName?: string | null;
  leaderId?: string | null;
  leaderName?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  status: string;
  sellerCommission?: number;
  leaderCommission?: number;
  stockisteRevenue?: number;
  commissions?: CommissionItem[];
  commissionAmount?: number;
  commissionStatus?: string;
  shippingType?: string;
  shippingCity?: string | null;
  shippingAddress?: string | null;
  shippingFee?: number;
}

interface ProductSelect {
  id: string;
  name: string;
  salePrice: number;
  stockAvailable: number;
  agentCommission: number;
  ecommercantCommission?: number;
  leaderCommission?: number;
}

interface AgentSelect {
  id: string;
  name: string;
  role?: string;
}

interface ProspectSelect {
  id: string;
  fullName: string;
  phone: string | null;
  agentId: string;
}

interface SalesClientPageProps {
  initialSales: Sale[];
  products: ProductSelect[];
  agents: AgentSelect[];
  prospects: ProspectSelect[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function SalesClientPage({
  initialSales,
  products,
  agents,
  prospects,
  currentUser,
}: SalesClientPageProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("month");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    productId: "",
    quantity: 1,
    price: 0,
    customerName: "",
    agentId: currentUser.id,
    prospectId: "none",
    status: "PENDING",
    shippingType: "PICKUP",
    shippingCity: "",
    shippingAddress: "",
    shippingFee: 0,
  });

  const getShippingFeeValue = (type: string, city: string) => {
    if (type !== "DELIVERY") return 0;
    if (city === "MORONI") return 1000;
    if (city === "GRANDE_COMORE" || city === "ANJOUAN" || city === "MOHELI") return 1500;
    return 0;
  };

  const canManageDelivery = currentUser.role === "ADMIN" || currentUser.role === "ACCOUNTANT" || currentUser.role === "DELIVERY_ASSISTANT";
  const isAgent = currentUser.role === "AGENT";
  const isDirectSeller = currentUser.role === "AGENT" || currentUser.role === "ECOMMERCANT";

  // Filters
  const timeframeSales = filterByTimeframe(sales, timeframe);

  const filteredSales = timeframeSales.filter((s) => {
    const matchesSearch =
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summaries
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
      case "EN ATTENTE":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">En attente</Badge>;
      case "CONFIRMED":
      case "CONFIRMÉE":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Confirmée</Badge>;
      case "SHIPPED":
      case "EXPÉDIÉE":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Expédiée</Badge>;
      case "DELIVERED":
      case "LIVRÉE":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold">Livrée</Badge>;
      case "CANCELLED":
      case "ANNULÉE":
        return <Badge variant="destructive" className="font-semibold">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.productId || addForm.quantity <= 0) {
      toast.error("Veuillez sélectionner un produit et indiquer une quantité valide.");
      return;
    }

    const selectedProd = products.find((p) => p.id === addForm.productId);
    if (selectedProd && selectedProd.stockAvailable < addForm.quantity) {
      toast.error(`Stock insuffisant. Disponible : ${selectedProd.stockAvailable}`);
      return;
    }

    const finalCustomerName = addForm.customerName.trim() || "Client de passage";

    setIsSubmitting(true);
    try {
      const finalPrice = addForm.price > 0 ? addForm.price : (selectedProd?.salePrice || 0);
      const res = await createSaleAction({
        productId: addForm.productId,
        quantity: addForm.quantity,
        price: finalPrice,
        customerName: finalCustomerName,
        agentId: addForm.agentId,
        prospectId: addForm.prospectId === "none" ? undefined : addForm.prospectId,
        status: addForm.status,
        shippingType: addForm.shippingType,
        shippingCity: addForm.shippingType === "DELIVERY" ? addForm.shippingCity : undefined,
        shippingAddress: addForm.shippingType === "DELIVERY" ? addForm.shippingAddress : undefined,
        shippingFee: addForm.shippingFee,
      });

      if (res.success && res.saleId) {
        toast.success("Vente enregistrée avec succès !");

        // Optimistic append
        const activeProd = products.find((x) => x.id === addForm.productId);
        const activeAgent = agents.find((x) => x.id === addForm.agentId) || currentUser;
        const assignedRole = activeAgent?.role || currentUser.role;
        const sellerCommRate = assignedRole === "ECOMMERCANT"
          ? (activeProd?.ecommercantCommission || 0)
          : (activeProd?.agentCommission || 0);
        const sellerCommTotal = sellerCommRate * addForm.quantity;

        const newSale: Sale = {
          id: res.saleId,
          date: new Date(),
          customerName: finalCustomerName,
          productName: activeProd?.name || "Produit",
          productSku: "",
          quantity: addForm.quantity,
          price: finalPrice,
          totalAmount: finalPrice * addForm.quantity + addForm.shippingFee,
          agentId: addForm.agentId,
          agentName: activeAgent?.name || "Agent",
          status: addForm.status,
          sellerCommission: sellerCommTotal,
          commissionAmount: sellerCommTotal,
          commissionStatus: "PENDING",
          shippingType: addForm.shippingType,
          shippingCity: addForm.shippingType === "DELIVERY" ? addForm.shippingCity : undefined,
          shippingAddress: addForm.shippingType === "DELIVERY" ? addForm.shippingAddress : undefined,
          shippingFee: addForm.shippingFee,
        };

        setSales([newSale, ...sales]);
        setIsAddOpen(false);
        setAddForm({
          productId: "",
          quantity: 1,
          price: 0,
          customerName: "",
          agentId: currentUser.id,
          prospectId: "none",
          status: "PENDING",
          shippingType: "PICKUP",
          shippingCity: "",
          shippingAddress: "",
          shippingFee: 0,
        });
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (saleId: string, newStatus: string) => {
    setUpdatingSaleId(saleId);
    try {
      const res = await updateDeliveryStatusAction(saleId, newStatus);
      if (res.success) {
        toast.success("Statut de livraison mis à jour !");

        setSales(
          sales.map((s) => (s.id === saleId ? { ...s, status: newStatus } : s))
        );
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setUpdatingSaleId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(
      filteredSales,
      [
        "ID Vente",
        "Date",
        "Client",
        "Produit",
        "SKU",
        "Quantite",
        "Prix Unitaire (KMF)",
        "Frais de Livraison (KMF)",
        "Total (KMF)",
        "Agent Commercial",
        "Statut Livraison",
        "Type de Livraison",
        "Ville de Livraison",
        "Adresse Detaillee",
        "Montant Commission (KMF)",
        "Statut Commission",
      ],
      (sale) => [
        sale.id,
        formatDate(sale.date),
        sale.customerName,
        sale.productName,
        sale.productSku,
        sale.quantity,
        sale.price,
        sale.shippingFee,
        sale.totalAmount,
        sale.agentName,
        sale.status,
        sale.shippingType,
        sale.shippingCity || "",
        sale.shippingAddress || "",
        sale.commissionAmount,
        sale.commissionStatus,
      ],
      "ventes_aylan"
    );
  };

  // Get selected product details for commission/total estimate in the form
  const formSelectedProd = products.find((p) => p.id === addForm.productId);
  const formTotalPrice = (addForm.price > 0 ? addForm.price : (formSelectedProd?.salePrice || 0)) * addForm.quantity;
  const formTotalTransaction = formTotalPrice + addForm.shippingFee;
  const formCommissionRate =
    currentUser.role === "ECOMMERCANT"
      ? formSelectedProd?.ecommercantCommission || 0
      : formSelectedProd?.agentCommission || 0;
  const formTotalCommission = formCommissionRate * addForm.quantity;

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            Suivi des Ventes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enregistrez les commandes et suivez l'avancement de la livraison des colis clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 font-medium"
          >
            <Download className="mr-2 h-4 w-4" /> Exporter en Excel
          </Button>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            <Plus className="mr-2 h-4 w-4" /> Enregistrer une vente
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-indigo-500/20 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 shadow-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium mt-1">Généré sur la sélection active</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume Ventes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {filteredSales.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Transactions dans la liste</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unités Vendues</CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {totalQuantity}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Articles physiques expédiés / commandés</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Historique des Commandes</CardTitle>
            <CardDescription>Liste chronologique des commandes clients.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Client, produit, agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe((value as Timeframe) || "month")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois-ci</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="all">Tous les temps</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value || "all")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
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
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit & Stockiste</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="text-right">Prix U.</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead>Vendeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Commissions</TableHead>
                  <TableHead className="text-right">Facture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-400 text-sm">
                      Aucune vente enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/30">
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-850 dark:text-slate-200">
                        <div>{s.customerName}</div>
                        {s.shippingType === "DELIVERY" ? (
                          <div className="text-[10px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded text-[9px] font-bold uppercase">{s.shippingCity}</span>
                            <span className="text-slate-500 max-w-[150px] truncate">{s.shippingAddress}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            🛍️ Retrait sur place
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{s.productName}</div>
                        {s.stockisteName ? (
                          <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1 mt-0.5">
                            <span>📦 {s.stockisteName}</span>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-center font-bold">{s.quantity}</TableCell>
                      <TableCell className="text-right text-slate-500">{s.price} KMF</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">
                        <div>{s.totalAmount} KMF</div>
                        {(s.shippingFee ?? 0) > 0 && (
                          <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                            (dont {s.shippingFee} KMF liv.)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium flex items-center gap-1">
                          <span>{s.agentName}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {s.sellerRole === "ECOMMERCANT" ? (
                            <span className="bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border border-fuchsia-200/60 dark:border-fuchsia-800/40 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              E-commerçant
                            </span>
                          ) : (
                            <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              Téléconseiller {s.leaderName ? `(${s.leaderName})` : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManageDelivery ? (
                          <Select
                            disabled={updatingSaleId === s.id}
                            value={s.status}
                            onValueChange={(val) => {
                              if (val) handleUpdateStatus(s.id, val);
                            }}
                          >
                            <SelectTrigger className="h-7 w-[125px] text-xs font-medium border-slate-200 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">En attente</SelectItem>
                              <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                              <SelectItem value="SHIPPED">Expédiée</SelectItem>
                              <SelectItem value="DELIVERED">Livrée</SelectItem>
                              <SelectItem value="CANCELLED">Annulée</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          getStatusBadge(s.status)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(s.sellerCommission ?? s.commissionAmount ?? 0)}
                          </span>
                          {(s.leaderCommission ?? 0) > 0 && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              +{formatCurrency(s.leaderCommission!)} (Leader)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveInvoice(s)}
                          className="h-7 text-xs font-semibold gap-1 border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Facture</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={activeInvoice !== null}
        onClose={() => setActiveInvoice(null)}
        invoice={activeInvoice}
      />

      {/* Add Sale Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-1 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
              Enregistrer une vente
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Saisissez les informations de la commande. Le stock et les commissions sont calculés automatiquement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSale} className="space-y-4 pt-2">
            {/* Section 1 : Produit & Quantité */}
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Package className="h-3.5 w-3.5 text-indigo-600" />
                <span>1. Produit & Quantité</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="productId" className="text-xs font-semibold">
                  Produit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={addForm.productId}
                  onValueChange={(val) => {
                    setAddForm({ ...addForm, productId: val || "" });
                    const p = products.find((x) => x.id === val);
                    if (p) {
                      setAddForm((prev) => ({ ...prev, price: p.salePrice }));
                    }
                  }}
                >
                  <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm bg-background">
                    <SelectValue placeholder="Choisir un produit">
                      {addForm.productId ? (products.find((p) => p.id === addForm.productId)?.name) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={p.stockAvailable <= 0} className="py-2">
                        {p.name} • {formatCurrency(p.salePrice)} {p.stockAvailable <= 0 ? "(Rupture)" : `(Stock : ${p.stockAvailable})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="text-xs font-semibold">
                    Quantité <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                    className="h-11 sm:h-10 text-base sm:text-sm bg-background font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-xs font-semibold">
                    Prix U. (KMF) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: parseFloat(e.target.value) || 0 })}
                    className="h-11 sm:h-10 text-base sm:text-sm bg-background font-semibold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2 : Client & Téléconseiller */}
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                <span>2. Client & Prospect</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prospectId" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Lier à un prospect (optionnel)
                </Label>
                <Select
                  value={addForm.prospectId}
                  onValueChange={(val) => {
                    if (val === "none") {
                      setAddForm({ ...addForm, prospectId: "none", customerName: "" });
                    } else {
                      const selectedProspect = prospects.find((p) => p.id === val);
                      if (selectedProspect) {
                        setAddForm({
                          ...addForm,
                          prospectId: val || "none",
                          customerName: selectedProspect.fullName || "",
                          agentId: selectedProspect.agentId || currentUser.id,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm bg-background">
                    <SelectValue placeholder="Vente directe (sans prospect)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="py-2 font-medium">Vente directe (sans prospect)</SelectItem>
                    {prospects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="py-2">
                        {p.fullName} {p.phone ? `(${p.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customerName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nom du client
                  </Label>
                  <span className="text-[11px] text-slate-400 font-normal">Facultatif</span>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="customerName"
                    placeholder="Client de passage (laisser vide par défaut)"
                    value={addForm.customerName}
                    onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                    className="pl-9 h-11 sm:h-10 text-base sm:text-sm bg-background"
                    disabled={addForm.prospectId !== "none"}
                  />
                </div>
              </div>

              {!isDirectSeller && agents.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="agentId" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Affecter au commercial
                  </Label>
                  <Select
                    value={addForm.agentId}
                    onValueChange={(val) => setAddForm({ ...addForm, agentId: val || currentUser.id })}
                  >
                    <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm bg-background">
                      <SelectValue placeholder="Choisir un commercial" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="py-2">
                          {a.name} ({a.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Section 3 : Distribution & Livraison */}
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Truck className="h-3.5 w-3.5 text-indigo-600" />
                <span>3. Mode de distribution</span>
              </div>

              <div className="space-y-1.5">
                <Select
                  value={addForm.shippingType}
                  onValueChange={(val) => {
                    const fee = getShippingFeeValue(val || "PICKUP", addForm.shippingCity);
                    setAddForm({ ...addForm, shippingType: val || "PICKUP", shippingFee: fee });
                  }}
                >
                  <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm bg-background">
                    <SelectValue placeholder="Choisir le mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP" className="py-2">🛍️ Retrait sur place (Gratuit)</SelectItem>
                    <SelectItem value="DELIVERY" className="py-2">🚚 Livraison à domicile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {addForm.shippingType === "DELIVERY" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="shippingCity" className="text-xs font-semibold">
                      Région / Zone de livraison
                    </Label>
                    <Select
                      value={addForm.shippingCity}
                      onValueChange={(val) => {
                        const fee = getShippingFeeValue(addForm.shippingType, val || "");
                        setAddForm({ ...addForm, shippingCity: val || "", shippingFee: fee });
                      }}
                    >
                      <SelectTrigger id="shippingCity" className="h-11 sm:h-10 text-base sm:text-sm bg-background">
                        <SelectValue placeholder="Choisir la zone de livraison" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MORONI" className="py-2">Moroni (1 000 KMF)</SelectItem>
                        <SelectItem value="GRANDE_COMORE" className="py-2">Grande Comore - Hors Moroni (1 500 KMF)</SelectItem>
                        <SelectItem value="ANJOUAN" className="py-2">Anjouan (1 500 KMF)</SelectItem>
                        <SelectItem value="MOHELI" className="py-2">Mohéli (1 500 KMF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shippingAddress" className="text-xs font-semibold">
                      Adresse de livraison détaillée
                    </Label>
                    <Input
                      id="shippingAddress"
                      placeholder="Quartier, point de repère, détails..."
                      value={addForm.shippingAddress}
                      onChange={(e) => setAddForm({ ...addForm, shippingAddress: e.target.value })}
                      className="h-11 sm:h-10 text-base sm:text-sm bg-background"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 4 : Récapitulatif Financier */}
            {formSelectedProd && (
              <Card className="bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-800/40 p-3 sm:p-4 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                  <span>Chiffre d'affaires produit :</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(formTotalPrice)}</span>
                </div>
                {addForm.shippingType === "DELIVERY" && (
                  <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                    <span>Frais de livraison ({addForm.shippingCity || "Moroni"}) :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(addForm.shippingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-dashed border-indigo-200 dark:border-indigo-800/60 pt-2 text-sm">
                  <span className="text-slate-900 dark:text-white">Total Facturé :</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(formTotalTransaction)}</span>
                </div>
                <div className="flex justify-between font-medium text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5">
                  <span>
                    {currentUser.role === "ECOMMERCANT" ? "Commission E-commerçant :" : "Commission Téléconseiller :"}
                  </span>
                  <span className="font-bold text-xs">
                    {formatCurrency(
                      currentUser.role === "ECOMMERCANT"
                        ? (formSelectedProd.ecommercantCommission || 0) * addForm.quantity
                        : (formSelectedProd.agentCommission || 0) * addForm.quantity
                    )}
                  </span>
                </div>
              </Card>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 sm:h-10 text-sm font-semibold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer la vente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
