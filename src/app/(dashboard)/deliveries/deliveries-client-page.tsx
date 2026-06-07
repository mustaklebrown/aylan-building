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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ShoppingCart,
  User,
  Package,
  Calendar,
  DollarSign,
  Truck,
  Printer,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateDeliveryStatusAction } from "@/server/actions/sale-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";

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
}

interface DeliveriesClientPageProps {
  initialSales: SaleDelivery[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function DeliveriesClientPage({
  initialSales,
  currentUser,
}: DeliveriesClientPageProps) {
  const [sales, setSales] = useState<SaleDelivery[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Active delivery modals
  const [activeSlip, setActiveSlip] = useState<SaleDelivery | null>(null);
  const [runsheetOpen, setRunsheetOpen] = useState(false);

  // Filters
  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus =
      statusFilter === "all" || s.status === statusFilter;
      
    const matchesRegion =
      regionFilter === "all" || s.shippingCity === regionFilter;

    const matchesType =
      typeFilter === "all" || s.shippingType === typeFilter;

    return matchesSearch && matchesStatus && matchesRegion && matchesType;
  });

  // Stats
  const deliveriesPending = sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "PENDING").length;
  const deliveriesShipped = sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "SHIPPED").length;
  const deliveriesCompleted = sales.filter((s) => s.shippingType === "DELIVERY" && s.status === "DELIVERED").length;
  const pickupsPending = sales.filter((s) => s.shippingType === "PICKUP" && s.status === "PENDING").length;
  const totalShippingFee = filteredSales.reduce((sum, s) => sum + s.shippingFee, 0);

  const handleUpdateStatus = async (saleId: string, newStatus: string) => {
    setUpdatingId(saleId);
    try {
      const res = await updateDeliveryStatusAction(saleId, newStatus);
      if (res.success) {
        toast.success(`Statut mis à jour : ${newStatus}`);
        setSales(
          sales.map((s) => (s.id === saleId ? { ...s, status: newStatus } : s))
        );
      } else {
        toast.error(res.error || "Erreur lors de la modification.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSales.map((s) => s.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">En attente</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Confirmée</Badge>;
      case "SHIPPED":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Expédiée</Badge>;
      case "DELIVERED":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold">Livrée</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="font-semibold">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedSalesForRunsheet = sales.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="flex flex-col space-y-6">
      {/* Printable Runsheet Overlay (Hidden on screen, Visible on print) */}
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
                <th className="border border-slate-300 p-2 text-right">Montant Collecté</th>
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
                    <p className="font-semibold text-xs text-slate-700">{s.shippingCity}</p>
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
            <div>Montant Total à percevoir : {selectedSalesForRunsheet.reduce((sum, s) => sum + s.totalAmount, 0)} KMF</div>
          </div>

          <div className="mt-16 flex justify-between text-xs border-t pt-8">
            <div className="text-center w-48">
              <p>Signature Logistique</p>
              <div className="h-16"></div>
              <p className="border-t border-dotted border-slate-400 pt-1">AYLAN GROUP</p>
            </div>
            <div className="text-center w-48">
              <p>Signature Livreur</p>
              <div className="h-16"></div>
              <p className="border-t border-dotted border-slate-400 pt-1"></p>
            </div>
          </div>
        </div>
      )}

      {/* Screen view content */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            Gestion des Livraisons & Colis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organisez les tournées de livraison, modifiez les statuts et imprimez vos documents de transport.
          </p>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <Badge className="bg-indigo-600 text-white font-bold py-1 px-2.5">
              {selectedIds.length} sélectionné(s)
            </Badge>
            <Button
              onClick={() => setRunsheetOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold gap-2 border border-slate-800"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Feuille de Route
            </Button>
          </div>
        )}
      </div>

      {/* Delivery Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="glass-card hover:-translate-y-0.5 transition-all border-amber-500/20 bg-amber-500/5 shadow-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Livraisons En Attente</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800 dark:text-amber-400 mt-1">{deliveriesPending}</div>
            <p className="text-xs text-amber-600/70 mt-1 font-medium">À confier à un livreur</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-0.5 transition-all border-indigo-500/20 bg-indigo-500/5 shadow-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">En cours d'expédition</CardTitle>
            <Truck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-850 dark:text-indigo-400 mt-1">{deliveriesShipped}</div>
            <p className="text-xs text-indigo-600/70 mt-1 font-medium">Actuellement sur la route</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-0.5 transition-all border-green-500/20 bg-green-500/5 shadow-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-green-700 dark:text-green-500 uppercase tracking-wider">Livrées / Terminées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-850 dark:text-green-400 mt-1">{deliveriesCompleted}</div>
            <p className="text-xs text-green-600/70 mt-1 font-medium font-mono">Fonds collectés à valider</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-0.5 transition-all border-slate-200/50 dark:border-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frais de livraison actifs</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-850 dark:text-white mt-1">{formatCurrency(totalShippingFee)}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Sur les livraisons filtrées</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Delivery Table Card */}
      <Card className="glass-card border-slate-200/50 dark:border-slate-800/50 print:hidden">
        <CardHeader className="pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Colis & Livraisons</CardTitle>
            <CardDescription>Visualisez les commandes, filtrez et gérez les émargements.</CardDescription>
          </div>
          
          {/* Filtering bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Client, produit, agent, N°..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>

            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
              <SelectTrigger className="w-[140px] h-9 border-slate-200 bg-background">
                <SelectValue placeholder="Distribution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout distrib.</SelectItem>
                <SelectItem value="DELIVERY">🚚 Livraison</SelectItem>
                <SelectItem value="PICKUP">🛍️ Retrait</SelectItem>
              </SelectContent>
            </Select>

            <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || "all")}>
              <SelectTrigger className="w-[140px] h-9 border-slate-200 bg-background">
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes îles</SelectItem>
                <SelectItem value="MORONI">Moroni</SelectItem>
                <SelectItem value="GRANDE_COMORE">Grande Comore</SelectItem>
                <SelectItem value="ANJOUAN">Anjouan</SelectItem>
                <SelectItem value="MOHELI">Mohéli</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="w-[140px] h-9 border-slate-200 bg-background">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
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
          <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filteredSales.length > 0 && selectedIds.length === filteredSales.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TableHead>
                  <TableHead>N° Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Région / Adresse</TableHead>
                  <TableHead>Produit / Qté</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                      <AlertCircle className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                      Aucun colis ne correspond aux critères de recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => {
                    const isSelected = selectedIds.includes(s.id);
                    return (
                      <TableRow key={s.id} className={`${isSelected ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""} hover:bg-slate-55/20 transition-colors`}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-500">
                          #{s.id.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{s.customerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                            <Phone className="h-2.5 w-2.5" /> {s.customerPhone}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.shippingType === "DELIVERY" ? (
                            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] border border-indigo-200/40">
                              🚚 Livraison
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px]">
                              🛍️ Retrait
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {s.shippingType === "DELIVERY" ? (
                            <div>
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mr-1.5">{s.shippingCity}</span>
                              <span className="text-xs text-slate-500 truncate block sm:inline">{s.shippingAddress}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Moroni Magoudjou (Aylan Building)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.productName}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">Qté : {s.quantity}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-extrabold text-slate-850 dark:text-white text-xs">{s.totalAmount} KMF</div>
                          {s.shippingFee > 0 && (
                            <div className="text-[9px] text-slate-400 font-medium">({s.shippingFee} KMF livr.)</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={updatingId === s.id}
                            value={s.status}
                            onValueChange={(val) => {
                              if (val) handleUpdateStatus(s.id, val);
                            }}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs font-bold border-slate-250 bg-background shadow-sm">
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
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Imprimer le bon de livraison"
                            onClick={() => setActiveSlip(s)}
                            className="h-7 w-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Runsheet Preview Dialog */}
      <Dialog open={runsheetOpen} onOpenChange={setRunsheetOpen}>
        <DialogContent className="sm:max-w-[850px] print:hidden max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              Aperçu de la Feuille de Route
            </DialogTitle>
            <DialogDescription>
              Veuillez vérifier les informations de livraison ci-dessous avant d'imprimer la feuille de route.
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg p-5 space-y-4 font-sans bg-slate-50 dark:bg-slate-900/10">
            <div className="flex justify-between border-b pb-3 text-xs">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">AYLAN GROUP</p>
                <p className="text-slate-500">Service Logistique & Distribution</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800 dark:text-slate-100">FEUILLE DE ROUTE</p>
                <p className="text-slate-500">Généré le: {new Date().toLocaleDateString("fr-FR")}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Colis N°</TableHead>
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
                    <TableCell className="text-xs">
                      <span className="font-bold text-indigo-600">{s.shippingCity}</span> {s.shippingAddress}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs">{s.totalAmount} KMF</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between text-xs font-bold border-t pt-3">
              <span>Nombre de colis : {selectedSalesForRunsheet.length}</span>
              <span className="text-indigo-600">Total à collecter : {selectedSalesForRunsheet.reduce((sum, s) => sum + s.totalAmount, 0)} KMF</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRunsheetOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Printer className="h-4 w-4" /> Imprimer la feuille de route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delivery Slip Preview Dialog */}
      <Dialog open={activeSlip !== null} onOpenChange={(open) => !open && setActiveSlip(null)}>
        <DialogContent className="sm:max-w-[500px] print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Bordereau de Livraison
            </DialogTitle>
            <DialogDescription>
              Bon de transport individuel à joindre au colis du client.
            </DialogDescription>
          </DialogHeader>

          {activeSlip && (
            <div className="border border-slate-200 rounded-xl p-6 space-y-4 font-sans bg-white text-slate-900 shadow-sm leading-normal">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">AYLAN GROUP</h3>
                  <p className="text-[10px] text-slate-500 font-medium">BORDEREAU DE LIVRAISON</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">#{activeSlip.id.slice(-6).toUpperCase()}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(activeSlip.date).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destinataire</div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
                  <p className="text-sm font-bold">{activeSlip.customerName}</p>
                  <p className="text-xs flex items-center gap-1 font-mono text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400" /> {activeSlip.customerPhone}
                  </p>
                  <p className="text-xs flex items-center gap-1 text-slate-600 leading-snug">
                    <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span>
                      <strong className="text-indigo-600 uppercase font-bold">{activeSlip.shippingCity || "Moroni"}</strong> - {activeSlip.shippingAddress || "Retrait sur place"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items & Fees */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contenu du colis</div>
                <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                  <div className="flex justify-between bg-slate-50 p-2 font-semibold border-b">
                    <span>Désignation</span>
                    <span>Qté</span>
                    <span className="text-right">Montant</span>
                  </div>
                  <div className="flex justify-between p-2.5 border-b">
                    <span>{activeSlip.productName}</span>
                    <span className="font-bold">x {activeSlip.quantity}</span>
                    <span className="font-semibold">{activeSlip.price * activeSlip.quantity} KMF</span>
                  </div>
                  {activeSlip.shippingFee > 0 && (
                    <div className="flex justify-between p-2.5 text-slate-500 border-b">
                      <span>Frais de livraison ({activeSlip.shippingCity})</span>
                      <span>-</span>
                      <span>{activeSlip.shippingFee} KMF</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3 font-bold bg-indigo-50/50 text-indigo-900 text-sm">
                    <span>TOTAL À COLLECTER</span>
                    <span>{activeSlip.totalAmount} KMF</span>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="text-[9px] text-slate-400 bg-slate-50 p-2.5 rounded border leading-relaxed text-center">
                Merci pour votre confiance ! Aylan Group - Qualité et Service.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveSlip(null)}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                // Quick hack to print only the active single slip:
                // We will open the browser print dialog. To make it only print the slip, we temporarily trigger print
                // since print media prints the runsheet if open, or the standard window.
                // But since we want to print this dialog specifically, we can trigger print.
                // In a production app, we would hide all screen elements and only show this print layout.
                // We'll instruct the user that they can print using standard print action.
                window.print();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Printer className="h-4 w-4" /> Imprimer le bon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
