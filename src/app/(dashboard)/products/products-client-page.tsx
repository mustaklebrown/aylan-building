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
  Info,
  DollarSign,
  Coins,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  createProductAction,
  recordStockMovementAction,
} from "@/server/actions/product-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";

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
  stockAvailable: number;
  alertThreshold: number;
  isAlert: boolean;
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
    stockAvailable: 0,
    alertThreshold: 5,
  });

  const [moveForm, setMoveForm] = useState({
    productId: "",
    type: "IN" as "IN" | "OUT_LOSS" | "OUT_DAMAGE" | "OUT_RETURN",
    quantity: 1,
    cost: 0,
    supplier: "",
  });

  const canEdit = currentUser.role === "ADMIN" || currentUser.role === "ACCOUNTANT";
  const isAgent = currentUser.role === "AGENT";

  // Categories list
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  // Filters
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.sku) {
      toast.error("Veuillez saisir le nom et le SKU.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProductAction(addForm);
      if (res.success && res.product) {
        toast.success("Produit ajouté avec succès !");
        
        const newProduct: Product = {
          ...res.product,
          category: res.product.category || "Autre",
          description: res.product.description || "",
          isAlert: res.product.stockAvailable <= res.product.alertThreshold,
          recentMovements: res.product.stockAvailable > 0 ? [{
            id: "initial",
            productId: res.product.id,
            type: "IN",
            quantity: res.product.stockAvailable,
            cost: res.product.purchasePrice,
            supplier: "Stock Initial",
            date: new Date(),
          }] : [],
        };
        
        setProducts([...products, newProduct]);
        setIsAddOpen(false);
        setAddForm({
          name: "",
          sku: "",
          category: "",
          description: "",
          purchasePrice: 0,
          salePrice: 0,
          agentCommission: 0,
          stockAvailable: 0,
          alertThreshold: 5,
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

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveForm.productId || moveForm.quantity <= 0) {
      toast.error("Veuillez sélectionner un produit et entrer une quantité valide.");
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

      if (res.success && res.movement) {
        toast.success("Mouvement de stock enregistré !");

        // Update product stock in client state
        setProducts(
          products.map((p) => {
            if (p.id === moveForm.productId) {
              let diff = moveForm.quantity;
              if (moveForm.type === "OUT_LOSS" || moveForm.type === "OUT_DAMAGE") {
                diff = -diff;
              }
              const newStock = p.stockAvailable + diff;
              return {
                ...p,
                stockAvailable: newStock,
                isAlert: newStock <= p.alertThreshold,
                recentMovements: [
                  {
                    id: res.movement!.id,
                    productId: p.id,
                    type: moveForm.type,
                    quantity: moveForm.quantity,
                    cost: moveForm.cost > 0 ? moveForm.cost : null,
                    supplier: moveForm.supplier || null,
                    date: new Date(),
                  },
                  ...p.recentMovements,
                ].slice(0, 5),
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
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistoryModal = (product: Product) => {
    setSelectedProduct(product);
    setIsHistoryOpen(true);
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Entrée</Badge>;
      case "OUT_SALE":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Vente</Badge>;
      case "OUT_RETURN":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Retour</Badge>;
      case "OUT_LOSS":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Perte</Badge>;
      case "OUT_DAMAGE":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Endommagé</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Produits & Stocks
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAgent
              ? "Consultez les fiches produits, les prix de vente et les niveaux de stock."
              : "Gérez les fiches articles, ajustez les stocks et suivez l'historique des entrées/sorties."}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsMoveOpen(true)}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 font-medium"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" /> Mouvement de Stock
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
            </Button>
          </div>
        )}
      </div>

      {/* Stock summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isAgent && (
          <Card className="border-indigo-500/10 bg-indigo-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-indigo-700">Valeur d'Achat Stock</CardTitle>
              <Warehouse className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(summary.stockValue)}
              </div>
              <p className="text-xs text-indigo-600/70 font-medium mt-1">Évaluation globale au prix de revient</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-emerald-500/10 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-emerald-700">Valeur Vente Estimée</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(summary.stockSalesValue)}
            </div>
            <p className="text-xs text-emerald-600/70 font-medium mt-1">Chiffre d'affaires potentiel en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Articles Référencés</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Produits distincts au catalogue</p>
          </CardContent>
        </Card>

        <Card className={summary.lowStockCount > 0 ? "border-red-200 bg-red-50/10" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Alertes Rupture</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.lowStockCount > 0 ? "text-red-500" : "text-slate-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.lowStockCount > 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
              {summary.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Articles sous le seuil d'alerte</p>
          </CardContent>
        </Card>
      </div>

      {/* Catalog Table */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Catalogue Articles</CardTitle>
            <CardDescription>Liste complète des produits avec prix, stock disponible et commissions.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Nom, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value || "all")}
            >
              <SelectTrigger className="w-[180px] h-9 border-slate-200">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "Toutes les catégories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Nom du Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Catégorie</TableHead>
                  {!isAgent && <TableHead className="text-right">Prix d'Achat</TableHead>}
                  <TableHead className="text-right">Prix de Vente</TableHead>
                  {!isAgent && <TableHead className="text-right">Commission Agent</TableHead>}
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  {!isAgent && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAgent ? 6 : 9} className="text-center py-8 text-slate-400 text-sm">
                      Aucun produit dans le catalogue.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/30">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-xs">{p.category}</TableCell>
                      {!isAgent && <TableCell className="text-right font-medium text-slate-500">{p.purchasePrice} KMF</TableCell>}
                      <TableCell className="text-right font-bold text-indigo-600">{p.salePrice} KMF</TableCell>
                      {!isAgent && <TableCell className="text-right font-semibold text-emerald-600">{p.agentCommission} KMF</TableCell>}
                      <TableCell className="text-center font-black">{p.stockAvailable}</TableCell>
                      <TableCell>
                        {p.stockAvailable <= 0 ? (
                          <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">En rupture</Badge>
                        ) : p.stockAvailable <= p.alertThreshold ? (
                          <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Stock faible</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">En stock</Badge>
                        )}
                      </TableCell>
                      {!isAgent && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openHistoryModal(p)}
                            className="h-8 w-8 hover:text-indigo-600"
                          >
                            <History className="h-4 w-4" />
                            <span className="sr-only">Historique</span>
                          </Button>
                        </TableCell>
                      )}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer une fiche produit</DialogTitle>
            <DialogDescription>
              Enregistrez un nouvel article dans le catalogue. Il sera immédiatement disponible pour les ventes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nom de l'article</Label>
                <Input
                  id="name"
                  placeholder="ex: Montre Connectée X"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sku">SKU unique</Label>
                <Input
                  id="sku"
                  placeholder="ex: MNT-CONN-X"
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
                  placeholder="ex: Électronique"
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

            <div className="space-y-1">
              <Label htmlFor="description">Description (facultatif)</Label>
              <Input
                id="description"
                placeholder="Brève description du produit..."
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="purchasePrice" className="flex items-center"><DollarSign className="h-3 w-3 mr-0.5 text-slate-400"/> Achat (€)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.purchasePrice}
                  onChange={(e) => setAddForm({ ...addForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="salePrice" className="flex items-center"><DollarSign className="h-3 w-3 mr-0.5 text-slate-400"/> Vente (€)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.salePrice}
                  onChange={(e) => setAddForm({ ...addForm, salePrice: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="agentCommission" className="flex items-center"><Coins className="h-3 w-3 mr-0.5 text-slate-400"/> Commission (€)</Label>
                <Input
                  id="agentCommission"
                  type="number"
                  step="0.01"
                  min="0"
                  value={addForm.agentCommission}
                  onChange={(e) => setAddForm({ ...addForm, agentCommission: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="stockAvailable">Stock initial</Label>
              <Input
                id="stockAvailable"
                type="number"
                min="0"
                value={addForm.stockAvailable}
                onChange={(e) => setAddForm({ ...addForm, stockAvailable: parseInt(e.target.value) || 0 })}
              />
              <p className="text-[10px] text-slate-400">Une entrée de stock automatique de ce montant sera enregistrée.</p>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? "Création..." : "Ajouter le produit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Stock Movement Modal */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un mouvement de stock</DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des articles physiquement (hors ventes automatiques).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStockMovement} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="productId">Sélectionner un produit</Label>
              <Select
                value={moveForm.productId}
                onValueChange={(val) => {
                  setMoveForm({ ...moveForm, productId: val || "" });
                  // prefill cost with product purchase price
                  const p = products.find((x) => x.id === val);
                  if (p) {
                    setMoveForm((prev) => ({ ...prev, cost: p.purchasePrice }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un produit">
                    {moveForm.productId ? (products.find((p) => p.id === moveForm.productId)?.name) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}) • Stock : {p.stockAvailable}
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
                    <SelectItem value="IN">Entrée (Nouvel Achat / Réassort)</SelectItem>
                    <SelectItem value="OUT_RETURN">Entrée (Retour Client)</SelectItem>
                    <SelectItem value="OUT_LOSS">Sortie (Perte / Inventaire)</SelectItem>
                    <SelectItem value="OUT_DAMAGE">Sortie (Produit Endommagé)</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="cost">Coût Unitaire (€) - Optionnel</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={moveForm.cost}
                  onChange={(e) => setMoveForm({ ...moveForm, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="supplier">Fournisseur / Motif</Label>
                <Input
                  id="supplier"
                  placeholder="ex: Fournisseur SARL / Casse"
                  value={moveForm.supplier}
                  onChange={(e) => setMoveForm({ ...moveForm, supplier: e.target.value })}
                />
              </div>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
              Les 5 derniers mouvements de stock enregistrés pour cet article.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedProduct?.recentMovements.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Aucun mouvement de stock enregistré.</p>
            ) : (
              <div className="rounded-md border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Coût U.</TableHead>
                      <TableHead>Fournisseur/Détail</TableHead>
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
                        <TableCell className="text-slate-500">
                          {move.cost ? `${move.cost} KMF` : "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium truncate max-w-[150px]">
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
