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
} from "lucide-react";
import { toast } from "sonner";
import {
  createSaleAction,
  updateDeliveryStatusAction,
} from "@/server/actions/sale-actions";
import { Timeframe, filterByTimeframe } from "@/lib/date-utils";
import { formatCurrency, formatDate } from "@/lib/format-utils";

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
  status: string;
  commissionAmount: number;
  commissionStatus: string;
}

interface ProductSelect {
  id: string;
  name: string;
  salePrice: number;
  stockAvailable: number;
  agentCommission: number;
}

interface AgentSelect {
  id: string;
  name: string;
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

  // Form states
  const [addForm, setAddForm] = useState({
    productId: "",
    quantity: 1,
    price: 0,
    customerName: "",
    agentId: currentUser.id,
    prospectId: "none",
    status: "PENDING",
  });

  const canManageDelivery = currentUser.role === "ADMIN" || currentUser.role === "ACCOUNTANT";
  const isAgent = currentUser.role === "AGENT";

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
    if (!addForm.productId || !addForm.customerName || addForm.quantity <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const selectedProd = products.find((p) => p.id === addForm.productId);
    if (selectedProd && selectedProd.stockAvailable < addForm.quantity) {
      toast.error(`Stock insuffisant. Disponible : ${selectedProd.stockAvailable}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPrice = addForm.price > 0 ? addForm.price : (selectedProd?.salePrice || 0);
      const res = await createSaleAction({
        productId: addForm.productId,
        quantity: addForm.quantity,
        price: finalPrice,
        customerName: addForm.customerName,
        agentId: addForm.agentId,
        prospectId: addForm.prospectId === "none" ? undefined : addForm.prospectId,
        status: addForm.status,
      });

      if (res.success && res.saleId) {
        toast.success("Vente enregistrée avec succès !");

        // Optimistic append
        const activeProd = products.find((x) => x.id === addForm.productId);
        const activeAgent = agents.find((x) => x.id === addForm.agentId) || currentUser;

        const newSale: Sale = {
          id: res.saleId,
          date: new Date(),
          customerName: addForm.customerName,
          productName: activeProd?.name || "Produit",
          productSku: "",
          quantity: addForm.quantity,
          price: finalPrice,
          totalAmount: finalPrice * addForm.quantity,
          agentId: addForm.agentId,
          agentName: activeAgent?.name || "Agent",
          status: addForm.status,
          commissionAmount: (activeProd?.agentCommission || 0) * addForm.quantity,
          commissionStatus: "PENDING",
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

  // Get selected product details for commission/total estimate in the form
  const formSelectedProd = products.find((p) => p.id === addForm.productId);
  const formTotalPrice = (addForm.price > 0 ? addForm.price : (formSelectedProd?.salePrice || 0)) * addForm.quantity;
  const formTotalCommission = (formSelectedProd?.agentCommission || 0) * addForm.quantity;

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
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="text-right">Prix U.</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead>Téléconseiller</TableHead>
                  <TableHead>Statut de Livraison</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400 text-sm">
                      Aucune vente enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/30">
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{s.customerName}</TableCell>
                      <TableCell className="text-xs font-semibold">{s.productName}</TableCell>
                      <TableCell className="text-center font-bold">{s.quantity}</TableCell>
                      <TableCell className="text-right text-slate-500">{s.price} €</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600">{s.totalAmount} €</TableCell>
                      <TableCell className="text-xs font-medium">{s.agentName}</TableCell>
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
                          <span className="font-semibold text-emerald-600">{s.commissionAmount} €</span>
                          <span className="text-[10px] text-slate-400 font-mono lowercase">({s.commissionStatus})</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Sale Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Enregistrer une vente</DialogTitle>
            <DialogDescription>
              Saisissez les informations de la commande client. Le stock et la commission de l'agent seront ajustés automatiquement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSale} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="productId">Sélectionner le produit</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.stockAvailable <= 0}>
                      {p.name} • Prix : {p.salePrice} € {p.stockAvailable <= 0 ? "(Rupture)" : `(Stock : ${p.stockAvailable})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="price">Prix de vente unitaire (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prospectId">Lier à un prospect (optionnel)</Label>
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
                <SelectTrigger>
                  <SelectValue placeholder="Vente directe (sans prospect)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Vente directe (sans prospect)</SelectItem>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} {p.phone ? `(${p.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="customerName">Nom complet du client</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="customerName"
                  placeholder="Jean Dupont"
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  className="pl-8"
                  required
                  disabled={addForm.prospectId !== "none"}
                />
              </div>
            </div>

            {!isAgent && (
              <div className="space-y-1">
                <Label htmlFor="agentId">Affecter à l'agent commercial</Label>
                <Select
                  value={addForm.agentId}
                  onValueChange={(val) => setAddForm({ ...addForm, agentId: val || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un commercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formSelectedProd && (
              <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/30 p-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between font-medium">
                  <span>Chiffre d'affaires estimé :</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(formTotalPrice)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Commission Téléconseiller :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(formTotalCommission)}</span>
                </div>
              </Card>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
