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
import { Label } from "@/components/ui/label";
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
  Plus,
  Search,
  Users,
  UserCheck,
  TrendingUp,
  Phone,
  MapPin,
  MessageSquare,
  Contact,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  createProspectForAgentAction,
  updateProspectStatusForAgentAction,
} from "@/server/actions/prospect-actions";
import { formatDate } from "@/lib/format-utils";
import { exportToCSV } from "@/lib/export-utils";

interface Prospect {
  id: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  source: string | null;
  interestedProduct: string | null;
  comments: string | null;
  status: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CRMClientPageProps {
  initialProspects: Prospect[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const PROSPECT_SOURCES = [
  "Facebook",
  "Instagram",
  "WhatsApp",
  "TikTok",
  "Référence",
  "Site Web",
  "Appel entrant",
  "Autre",
];

const PROSPECT_STATUSES = [
  { value: "NEW", label: "Nouveau", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  { value: "CONTACTED", label: "Contacté", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200" },
  { value: "INTERESTED", label: "Intéressé", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  { value: "FOLLOWUP", label: "Relance", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" },
  { value: "NEGOTIATION", label: "Négociation", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  { value: "CONFIRMED", label: "Confirmé", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  { value: "CLIENT", label: "Client", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  { value: "LOST", label: "Perdu", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
];

function getStatusLabel(value: string) {
  return PROSPECT_STATUSES.find((s) => s.value === value)?.label || value;
}

function getStatusBadge(status: string) {
  const found = PROSPECT_STATUSES.find((s) => s.value === status.toUpperCase());
  if (found) {
    return (
      <Badge variant="secondary" className={`${found.color} font-semibold text-xs`}>
        {found.label}
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

export function CRMClientPage({
  initialProspects,
  currentUser,
}: CRMClientPageProps) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingProspectId, setUpdatingProspectId] = useState<string | null>(null);

  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "LEADER";

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    source: "",
    interestedProduct: "",
    comments: "",
    status: "NEW",
  });

  const resetForm = () => {
    setForm({
      fullName: "",
      phone: "",
      whatsapp: "",
      address: "",
      city: "",
      source: "",
      interestedProduct: "",
      comments: "",
      status: "NEW",
    });
  };

  // Filters
  const filteredProspects = prospects.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.interestedProduct && p.interestedProduct.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.agentName && p.agentName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalProspects = prospects.length;
  const newToday = prospects.filter((p) => {
    const today = new Date();
    const created = new Date(p.createdAt);
    return (
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate()
    );
  }).length;
  const clientsConverted = prospects.filter(
    (p) => p.status === "CLIENT" || p.status === "CONFIRMED"
  ).length;
  const conversionRate =
    totalProspects > 0 ? ((clientsConverted / totalProspects) * 100).toFixed(1) : "0";

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProspectForAgentAction(form);

      if (res.success && res.prospectId) {
        toast.success(`Prospect "${form.fullName}" ajouté avec succès !`);

        const newProspect: Prospect = {
          id: res.prospectId,
          fullName: form.fullName,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          address: form.address || null,
          city: form.city || null,
          source: form.source || null,
          interestedProduct: form.interestedProduct || null,
          comments: form.comments || null,
          status: form.status,
          agentId: currentUser.id,
          agentName: currentUser.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setProspects([newProspect, ...prospects]);
        setIsAddOpen(false);
        resetForm();
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (prospectId: string, newStatus: string) => {
    setUpdatingProspectId(prospectId);
    try {
      const res = await updateProspectStatusForAgentAction(prospectId, newStatus);
      if (res.success) {
        toast.success("Statut mis à jour !");
        setProspects(
          prospects.map((p) =>
            p.id === prospectId ? { ...p, status: newStatus } : p
          )
        );
      } else {
        toast.error(res.error || "Erreur de mise à jour.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setUpdatingProspectId(null);
    }
  };

  const handleExport = () => {
    exportToCSV(
      filteredProspects,
      [
        "Nom Complet",
        "Telephone",
        "WhatsApp",
        "Ville",
        "Adresse",
        "Source d'Acquisition",
        "Produit d'Interet",
        "Agent Affecte",
        "Statut",
        "Commentaires",
        "Date de Creation",
      ],
      (p) => [
        p.fullName,
        p.phone || "",
        p.whatsapp || "",
        p.city || "",
        p.address || "",
        p.source || "",
        p.interestedProduct || "",
        p.agentName,
        getStatusLabel(p.status),
        p.comments || "",
        formatDate(p.createdAt),
      ],
      "prospects_aylan"
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
            CRM / Prospects
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos contacts commerciaux et suivez l'avancement de chaque prospect dans le pipeline.
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
            <Plus className="mr-2 h-4 w-4" /> Ajouter un prospect
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-indigo-500/20 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 shadow-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Total Prospects
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {totalProspects}
            </div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium mt-1">
              Contacts dans votre pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-blue-500/20 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10 shadow-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Ajoutés aujourd'hui
            </CardTitle>
            <Contact className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {newToday}
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium mt-1">
              Nouveaux prospects du jour
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-emerald-500/20 bg-gradient-to-tr from-emerald-500/5 to-green-500/5 dark:from-emerald-500/10 dark:to-green-500/10 shadow-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Convertis en Clients
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {clientsConverted}
            </div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-1">
              Prospects devenus clients
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-rose-500/20 bg-gradient-to-tr from-rose-500/5 to-pink-500/5 dark:from-rose-500/10 dark:to-pink-500/10 shadow-rose-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Taux de Conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading mt-1">
              {conversionRate} %
            </div>
            <p className="text-xs text-rose-600/70 dark:text-rose-400/70 font-medium mt-1">
              Ratio prospects → clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prospects Table */}
      <Card className="glass-card hover:shadow-md transition-all duration-300 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Liste des Prospects</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Vue globale de tous les prospects de l'équipe."
                : "Vos contacts commerciaux et leur statut dans le pipeline."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Nom, téléphone, ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value || "all")}
            >
              <SelectTrigger className="w-[150px] h-9 border-slate-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {PROSPECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
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
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Produit d'intérêt</TableHead>
                  {isAdmin && <TableHead>Agent</TableHead>}
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d'ajout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 9 : 8}
                      className="text-center py-8 text-slate-400 text-sm"
                    >
                      Aucun prospect trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProspects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/30">
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                        {p.fullName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {p.phone || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {p.whatsapp || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {p.city || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {p.source || "Direct"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {p.interestedProduct || "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {p.agentName}
                        </TableCell>
                      )}
                      <TableCell>
                        <Select
                          disabled={updatingProspectId === p.id}
                          value={p.status}
                          onValueChange={(val) => {
                            if (val) handleUpdateStatus(p.id, val);
                          }}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs font-medium border-slate-200 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROSPECT_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un prospect</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau contact commercial reçu aujourd'hui.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProspect} className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="crmFullName">Nom complet *</Label>
              <div className="relative">
                <Contact className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="crmFullName"
                  placeholder="Prénom et nom du prospect"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            {/* Phone & WhatsApp */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="crmPhone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="crmPhone"
                    placeholder="06 12 34 56 78"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="crmWhatsapp">WhatsApp</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="crmWhatsapp"
                    placeholder="+212 6XX XXX XXX"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="crmAddress">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="crmAddress"
                    placeholder="Adresse postale"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="crmCity">Ville</Label>
                <Input
                  id="crmCity"
                  placeholder="Casablanca, Rabat..."
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            {/* Source & Product */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Source d'acquisition</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) => setForm({ ...form, source: val || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la source" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROSPECT_SOURCES.map((src) => (
                      <SelectItem key={src} value={src}>
                        {src}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="crmProduct">Produit d'intérêt</Label>
                <Input
                  id="crmProduct"
                  placeholder="Ex: Pack Premium"
                  value={form.interestedProduct}
                  onChange={(e) => setForm({ ...form, interestedProduct: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>Statut initial</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val || "NEW" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <Label htmlFor="crmComments">Commentaires</Label>
              <textarea
                id="crmComments"
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Notes internes, remarques..."
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? "Enregistrement..." : "Ajouter le prospect"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
