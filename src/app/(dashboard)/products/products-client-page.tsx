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
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
  History,
  DollarSign,
  Coins,
  Warehouse,
  Download,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  createProductAction,
  recordStockMovementAction,
  toggleProductActiveAction,
} from "@/server/actions/product-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";

interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  cost: number | null;
  supplier: string | null;
  date: Date;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  agentCommission: number;
  ecommercantCommission: number;
  leaderCommission: number;
  stockAvailable: number;
  alertThreshold: number;
  isAlert: boolean;
  isActive: boolean;
  isCommon: boolean;
  stockisteId: string | null;
  stockisteName: string | null;
  stockisteEmail?: string | null;
  leaderId: string | null;
  leaderName: string | null;
  allowAllEcommercants: boolean;
  allowAllLeaders: boolean;
  recentMovements: StockMovement[];
}

interface ProductsClientPageProps {
  initialProducts: Product[];
  summary: {
    totalProducts: number;
    stockValue: number;
    stockSalesValue: number;
    lowStockCount: number;
  };
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function ProductsClientPage({
  initialProducts,
  summary,
  currentUser,
}: ProductsClientPageProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    purchasePrice: 0,
    salePrice: 0,
    agentCommission: 0,
    ecommercantCommission: 0,
    leaderCommission: 0,
    stockAvailable: 0,
    alertThreshold: 5,
    allowAllEcommercants: true,
    allowAllLeaders: true,
  });

  const [moveForm, setMoveForm] = useState({
    productId: "",
    type: "IN" as "IN" | "OUT_LOSS" | "OUT_DAMAGE" | "OUT_RETURN" | "CORRECTION",
    quantity: 1,
    cost: 0,
    supplier: "",
  });

  const role = currentUser.role || "AGENT";
  const isAgent = role === "AGENT";
  const isEcommercant = role === "ECOMMERCANT";
  const isStockiste = role === "STOCKISTE";
  const isLeader = role === "LEADER";
  const isAdminOrAccountant = role === "ADMIN" || role === "ACCOUNTANT";

  const canCreate = isAdminOrAccountant || isStockiste || isLeader;
  const canMoveStock = isAdminOrAccountant || isStockiste;

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category || "Autre")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.stockisteName && p.stockisteName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.isActive) ||
      (statusFilter === "inactive" && !p.isActive) ||
      (statusFilter === "alert" && p.isAlert);

    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await createProductAction({
        name: addForm.name,
        sku: addForm.sku,
        category: addForm.category || "Autre",
        description: addForm.description,
        purchasePrice: addForm.purchasePrice,
        salePrice: addForm.salePrice,
        agentCommission: addForm.agentCommission,
        ecommercantCommission: addForm.ecommercantCommission,
        leaderCommission: addForm.leaderCommission,
        stockAvailable: addForm.stockAvailable,
        alertThreshold: addForm.alertThreshold,
        allowAllEcommercants: addForm.allowAllEcommercants,
        allowAllLeaders: addForm.allowAllLeaders,
      });

      if (res.success && res.product) {
        toast.success("Produit ajouté au catalogue !");
        const newProduct: Product = {
          id: res.product.id,
          name: res.product.name,
          sku: res.product.sku,
          category: res.product.category || "Autre",
          description: res.product.description || "",
          purchasePrice: res.product.purchasePrice,
          salePrice: res.product.salePrice,
          agentCommission: res.product.agentCommission,
          ecommercantCommission: res.product.ecommercantCommission,
          leaderCommission: res.product.leaderCommission,
          stockAvailable: res.product.stockAvailable,
          alertThreshold: res.product.alertThreshold,
          isAlert: res.product.stockAvailable <= res.product.alertThreshold,
          isActive: res.product.isActive,
          isCommon: res.product.isCommon,
          stockisteId: res.product.stockisteId,
          stockisteName: isStockiste ? currentUser.name : null,
          leaderId: res.product.leaderId,
          leaderName: isLeader ? currentUser.name : null,
          allowAllEcommercants: res.product.allowAllEcommercants,
          allowAllLeaders: res.product.allowAllLeaders,
          recentMovements: addForm.stockAvailable > 0 ? [{
            id: "initial",
            productId: res.product.id,
            type: "IN",
            quantity: addForm.stockAvailable,
            cost: addForm.purchasePrice,
            supplier: "Stock Initial",
            date: new Date(),
          }] : [],
        };
        setProducts([newProduct, ...products]);
        setIsAddOpen(false);
        setAddForm({
          name: "",
          sku: "",
          category: "",
          description: "",
          purchasePrice: 0,
          salePrice: 0,
          agentCommission: 0,
          ecommercantCommission: 0,
          leaderCommission: 0,
          stockAvailable: 0,
          alertThreshold: 5,
          allowAllEcommercants: true,
          allowAllLeaders: true,
        });
      } else {
        toast.error(res.error || "Erreur lors de la création.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveForm.productId) {
      toast.error("Veuillez sélectionner un produit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordStockMovementAction({
        productId: moveForm.productId,
        type: moveForm.type,
        quantity: moveForm.quantity,
        cost: moveForm.cost > 0 ? moveForm.cost : undefined,
        supplier: moveForm.supplier || undefined,
      });

      if (res.success && res.newStock !== undefined) {
        toast.success("Mouvement de stock enregistré !");
        setProducts(
          products.map((p) => {
            if (p.id === moveForm.productId) {
              const updatedStock = res.newStock!;
              const newMovement: StockMovement = {
                id: res.movement?.id || Date.now().toString(),
                productId: p.id,
                type: moveForm.type,
                quantity: moveForm.quantity,
                cost: moveForm.cost > 0 ? moveForm.cost : null,
                supplier: moveForm.supplier || null,
                date: new Date(),
              };
              return {
                ...p,
                stockAvailable: updatedStock,
                isAlert: updatedStock <= p.alertThreshold,
                recentMovements: [newMovement, ...p.recentMovements.slice(0, 4)],
              };
            }
            return p;
          })
        );
        setIsMoveOpen(false);
        setMoveForm({
          productId: "",
          type: "IN",
          quantity: 1,
          cost: 0,
          supplier: "",
        });
      } else {
        toast.error(res.error || "Erreur lors du mouvement.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (productId: string) => {
    try {
      const res = await toggleProductActiveAction(productId);
      if (res.success && res.isActive !== undefined) {
        toast.success(res.isActive ? "Produit activé pour la vente." : "Produit désactivé temporairement.");
        setProducts(products.map((p) => (p.id === productId ? { ...p, isActive: res.isActive! } : p)));
      } else {
        toast.error(res.error || "Erreur.");
      }
    } catch (err: any) {
      toast.error("Erreur réseau.");
    }
  };

  const openHistoryModal = (product: Product) => {
    setSelectedProduct(product);
    setIsHistoryOpen(true);
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Entrée Réassort</Badge>;
      case "OUT_SALE":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Vente Client</Badge>;
      case "OUT_RETURN":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Retour / Annulation</Badge>;
      case "OUT_LOSS":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Perte / Inventaire</Badge>;
      case "OUT_DAMAGE":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Casse / Endommagé</Badge>;
      case "CORRECTION":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Correction Manuelle</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleExport = () => {
    const headers = isAgent || isEcommercant
      ? [
          "Nom du Produit",
          "SKU",
          "Catégorie",
          "Prix de Vente (KMF)",
          "Ma Commission (KMF)",
          "Stock Disponible",
        ]
      : [
          "Nom du Produit",
          "SKU",
          "Catégorie",
          "Stockiste",
          "Prix d'Achat (KMF)",
          "Prix de Vente (KMF)",
          "Commission Téléconseiller (KMF)",
          "Commission E-commerçant (KMF)",
          "Commission Leader (KMF)",
          "Stock Disponible",
          "Statut",
        ];

    const mapRow = (p: Product) => isAgent || isEcommercant
      ? [
          p.name,
          p.sku,
          p.category,
          p.salePrice,
          isEcommercant ? p.ecommercantCommission : p.agentCommission,
          p.stockAvailable,
        ]
      : [
          p.name,
          p.sku,
          p.category,
          p.stockisteName || "Direct Aylan",
          p.purchasePrice,
          p.salePrice,
          p.agentCommission,
          p.ecommercantCommission,
          p.leaderCommission,
          p.stockAvailable,
          p.isActive ? "ACTIF" : "DÉSACTIVÉ",
        ];

    exportToCSV(filteredProducts, headers, mapRow, "produits_aylan");
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            {isStockiste ? "Mon Stock & Catalogue Produits" : isEcommercant ? "Catalogue Produits Disponibles" : "Produits & Stocks"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {isStockiste
              ? "Gérez vos produits, approvisionnez les stocks et configurez les commissions vendeurs."
              : isEcommercant
              ? "Consultez les produits mis à disposition par les stockistes avec vos commissions directes."
              : isAgent
              ? "Consultez les fiches produits, les prix de vente et les commissions de votre équipe."
              : "Gestion complète du catalogue, des stockistes et des affectations vendeurs."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 font-medium"
          >
            <Download className="mr-2 h-4 w-4" /> Exporter en CSV
          </Button>
          {canMoveStock && (
            <Button
              onClick={() => setIsMoveOpen(true)}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 font-medium"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" /> Mouvement de Stock
            </Button>
          )}
          {canCreate && (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
            </Button>
          )}
        </div>
      </div>

      {/* Stock summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isAgent && !isEcommercant && (
          <Card className="glass-card hover:-translate-y-0.5 transition-all border-indigo-500/10 bg-indigo-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Valeur d'Achat Stock</CardTitle>
              <Warehouse className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(summary.stockValue)}
              </div>
              <p className="text-xs text-indigo-600/70 font-medium mt-1">Évaluation globale au prix de revient</p>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card hover:-translate-y-0.5 transition-all border-emerald-500/10 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Valeur Vente Estimée</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(summary.stockSalesValue)}
            </div>
            <p className="text-xs text-emerald-600/70 font-medium mt-1">Chiffre d'affaires potentiel en stock</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-0.5 transition-all border-slate-200/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Articles Référencés</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summary.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Produits distincts au catalogue</p>
          </CardContent>
        </Card>

        <Card className={`glass-card hover:-translate-y-0.5 transition-all ${summary.lowStockCount > 0 ? "border-red-500/20 bg-red-500/5" : "border-slate-200/50"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={`text-xs font-bold uppercase tracking-wider ${summary.lowStockCount > 0 ? "text-red-600" : "text-slate-500"}`}>Alertes Rupture</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.lowStockCount > 0 ? "text-red-500" : "text-slate-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black mt-1 ${summary.lowStockCount > 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
              {summary.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Articles sous le seuil critique</p>
          </CardContent>
        </Card>
      </div>

      {/* Catalog Table */}
      <Card className="glass-card border-slate-200/50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Catalogue Articles & Commissions</CardTitle>
            <CardDescription>Liste complète des produits avec prix, stock disponible et commissions par rôle.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Nom, SKU, Stockiste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value || "all")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200 bg-background">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "Toutes catégories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value || "all")}
            >
              <SelectTrigger className="w-[140px] h-9 border-slate-200 bg-background">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">🟢 Actifs</SelectItem>
                <SelectItem value="inactive">🔴 Désactivés</SelectItem>
                <SelectItem value="alert">⚠️ Rupture/Faible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stockiste</TableHead>
                  {!isAgent && !isEcommercant && <TableHead className="text-right">Achat</TableHead>}
                  <TableHead className="text-right">Prix Vente</TableHead>
                  {isEcommercant ? (
                    <TableHead className="text-right text-pink-600 font-bold">Commission E-commerçant</TableHead>
                  ) : isAgent ? (
                    <TableHead className="text-right text-emerald-600 font-bold">Commission Téléconseiller</TableHead>
                  ) : (
                    <>
                      <TableHead className="text-right text-emerald-600 font-bold">Com. Téléconseiller</TableHead>
                      <TableHead className="text-right text-pink-600 font-bold">Com. E-commerçant</TableHead>
                      <TableHead className="text-right text-purple-600 font-bold">Com. Leader</TableHead>
                    </>
                  )}
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>État</TableHead>
                  {(isAdminOrAccountant || isStockiste) && <TableHead className="text-center">Actif</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-slate-400 text-sm">
                      Aucun produit ne correspond aux critères.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/30">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                        <div>
                          <p>{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{p.category}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">#{p.sku}</TableCell>
                      <TableCell>
                        {p.stockisteName ? (
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 text-[10px] font-bold">
                            📦 {p.stockisteName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">Aylan Group</Badge>
                        )}
                      </TableCell>
                      {!isAgent && !isEcommercant && (
                        <TableCell className="text-right font-medium text-slate-500 text-xs">
                          {formatCurrency(p.purchasePrice)}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-black text-indigo-600 text-xs">
                        {formatCurrency(p.salePrice)}
                      </TableCell>

                      {isEcommercant ? (
                        <TableCell className="text-right font-extrabold text-pink-600 text-xs">
                          {formatCurrency(p.ecommercantCommission)}
                        </TableCell>
                      ) : isAgent ? (
                        <TableCell className="text-right font-extrabold text-emerald-600 text-xs">
                          {formatCurrency(p.agentCommission)}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-right font-bold text-emerald-600 text-xs">
                            {formatCurrency(p.agentCommission)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-pink-600 text-xs">
                            {formatCurrency(p.ecommercantCommission)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-purple-600 text-xs">
                            {p.leaderCommission > 0 ? formatCurrency(p.leaderCommission) : "-"}
                          </TableCell>
                        </>
                      )}

                      <TableCell className="text-center font-black text-xs">{p.stockAvailable}</TableCell>
                      <TableCell>
                        {p.stockAvailable <= 0 ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-700 border-red-500/20 text-[10px]">Rupture</Badge>
                        ) : p.stockAvailable <= p.alertThreshold ? (
                          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">Faible</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">En stock</Badge>
                        )}
                      </TableCell>

                      {(isAdminOrAccountant || isStockiste) && (
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleActive(p.id)}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            title={p.isActive ? "Désactiver ce produit" : "Activer ce produit"}
                          >
                            {p.isActive ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openHistoryModal(p)}
                          className="h-8 w-8 hover:text-indigo-600"
                          title="Historique des stocks"
                        >
                          <History className="h-4 w-4" />
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

      {/* Add Product Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une fiche produit</DialogTitle>
            <DialogDescription>
              Enregistrez un nouvel article avec ses règles de commissions multi-vendeurs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nom de l'article *</Label>
                <Input
                  id="name"
                  placeholder="ex: Robot Moulinex 800W"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sku">SKU unique *</Label>
                <Input
                  id="sku"
                  placeholder="ex: MOUL-800W-01"
                  value={addForm.sku}
                  onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="category">Catégorie</Label>
                <Input
                  id="category"
                  placeholder="ex: Électroménager"
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="alertThreshold">Seuil d'alerte rupture</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="0"
                  value={addForm.alertThreshold}
                  onChange={(e) => setAddForm({ ...addForm, alertThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="purchasePrice" className="flex items-center">Prix d'Achat (KMF) *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  value={addForm.purchasePrice}
                  onChange={(e) => setAddForm({ ...addForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="salePrice" className="flex items-center font-bold text-indigo-600">Prix de Vente (KMF) *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  value={addForm.salePrice}
                  onChange={(e) => setAddForm({ ...addForm, salePrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            {/* Commissions Section */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                Grille des Commissions par Rôle
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="agentCommission" className="text-[11px] font-bold text-emerald-600">Téléconseiller (KMF)</Label>
                  <Input
                    id="agentCommission"
                    type="number"
                    min="0"
                    placeholder="3000"
                    value={addForm.agentCommission}
                    onChange={(e) => setAddForm({ ...addForm, agentCommission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecommercantCommission" className="text-[11px] font-bold text-pink-600">E-commerçant (KMF)</Label>
                  <Input
                    id="ecommercantCommission"
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={addForm.ecommercantCommission}
                    onChange={(e) => setAddForm({ ...addForm, ecommercantCommission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leaderCommission" className="text-[11px] font-bold text-purple-600">Leader (KMF)</Label>
                  <Input
                    id="leaderCommission"
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={addForm.leaderCommission}
                    onChange={(e) => setAddForm({ ...addForm, leaderCommission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="stockAvailable">Stock initial disponible</Label>
              <Input
                id="stockAvailable"
                type="number"
                min="0"
                value={addForm.stockAvailable}
                onChange={(e) => setAddForm({ ...addForm, stockAvailable: parseInt(e.target.value) || 0 })}
              />
            </div>

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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSubmitting ? "Création..." : "Ajouter le produit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Stock Movement Modal */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un mouvement de stock</DialogTitle>
            <DialogDescription>
              Entrée de réassort, sortie de casse, retour client ou correction d'inventaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockMovement} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="productId">Sélectionner un produit</Label>
              <Select
                value={moveForm.productId}
                onValueChange={(val) => {
                  setMoveForm({ ...moveForm, productId: val || "" });
                  const p = products.find((x) => x.id === val);
                  if (p) {
                    setMoveForm((prev) => ({ ...prev, cost: p.purchasePrice }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}) • Stock actuel : {p.stockAvailable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="type">Type de mouvement</Label>
                <Select
                  value={moveForm.type}
                  onValueChange={(val: any) => setMoveForm({ ...moveForm, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">➕ Entrée (Réassort / Achat)</SelectItem>
                    <SelectItem value="OUT_RETURN">🔄 Entrée (Retour Client)</SelectItem>
                    <SelectItem value="OUT_LOSS">➖ Sortie (Perte)</SelectItem>
                    <SelectItem value="OUT_DAMAGE">⚠️ Sortie (Casse / Endommagé)</SelectItem>
                    <SelectItem value="CORRECTION">⚙️ Correction Inventaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={moveForm.quantity}
                  onChange={(e) => setMoveForm({ ...moveForm, quantity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="supplier">Fournisseur / Motif</Label>
              <Input
                id="supplier"
                placeholder="ex: Arrivage Conteneur / Inventaire mensuel"
                value={moveForm.supplier}
                onChange={(e) => setMoveForm({ ...moveForm, supplier: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMoveOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isSubmitting ? "Enregistrement..." : "Valider le mouvement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" /> Historique de stock : {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Derniers mouvements enregistrés pour ce produit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedProduct?.recentMovements.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Aucun mouvement de stock enregistré.</p>
            ) : (
              <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Motif / Fournisseur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProduct?.recentMovements.map((move) => (
                      <TableRow key={move.id} className="text-xs">
                        <TableCell className="text-slate-400">
                          {formatDate(move.date)}
                        </TableCell>
                        <TableCell>{getMovementTypeBadge(move.type)}</TableCell>
                        <TableCell className="text-center font-bold">{move.quantity}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[180px]">
                          {move.supplier || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsHistoryOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
