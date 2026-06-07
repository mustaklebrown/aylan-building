"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Users,
  ShoppingCart,
  Banknote,
  Percent,
  TrendingUp,
  Mail,
  Calendar,
  Contact,
  Plus,
  Phone,
  MapPin,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import {
  createProspectAction,
  updateProspectStatusAction,
} from "@/server/actions/agent-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";

interface Prospect {
  id: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  source: string | null;
  interestedProduct: string | null;
  status: string;
  createdAt: Date;
}

interface Sale {
  id: string;
  date: Date;
  customerName: string;
  productName: string;
  quantity: number;
  total: number;
  status: string;
}

interface Commission {
  id: string;
  date: Date;
  amount: number;
  status: string;
  customerName: string;
}

interface AgentDetailClientPageProps {
  agent: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  stats: {
    totalProspects: number;
    contactedProspects: number;
    clientsCount: number;
    totalSales: number;
    totalRevenue: number;
    totalCommission: number;
    conversionRate: number;
  };
  chartData: Array<{
    name: string;
    ventes: number;
    commissions: number;
  }>;
  recentProspects: Prospect[];
  recentSales: Sale[];
  recentCommissions: Commission[];
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    // Prospects
    case "NEW":
    case "NOUVEAU":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Nouveau</Badge>;
    case "CONTACTED":
    case "CONTACTÉ":
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">Contacté</Badge>;
    case "INTERESTED":
    case "INTÉRESSÉ":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Intéressé</Badge>;
    case "FOLLOWUP":
    case "RELANCE":
      return <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Relance</Badge>;
    case "NEGOTIATION":
    case "NÉGOCIATION":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">Négociation</Badge>;
    case "CONFIRMED":
    case "CONFIRMÉ":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Confirmé</Badge>;
    case "CLIENT":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">Client</Badge>;
    case "LOST":
    case "PERDU":
      return <Badge variant="destructive" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">Perdu</Badge>;
    
    // Sales / Delivery
    case "PENDING":
    case "EN ATTENTE":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">En attente</Badge>;
    case "SHIPPED":
    case "EXPÉDIÉE":
      return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">Expédiée</Badge>;
    case "DELIVERED":
    case "LIVRÉE":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Livrée</Badge>;
    case "CANCELLED":
    case "ANNULÉE":
      return <Badge variant="destructive">Annulée</Badge>;
    
    // Commissions
    case "PAID":
    case "PAYÉ":
      return <Badge className="bg-green-600 text-white">Payé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

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
  { value: "NEW", label: "Nouveau" },
  { value: "CONTACTED", label: "Contacté" },
  { value: "INTERESTED", label: "Intéressé" },
  { value: "FOLLOWUP", label: "Relance" },
  { value: "NEGOTIATION", label: "Négociation" },
  { value: "CONFIRMED", label: "Confirmé" },
  { value: "CLIENT", label: "Client" },
  { value: "LOST", label: "Perdu" },
];

export function AgentDetailClientPage({
  agent,
  stats,
  chartData,
  recentProspects,
  recentSales,
  recentCommissions,
}: AgentDetailClientPageProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>(recentProspects);
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingProspectId, setUpdatingProspectId] = useState<string | null>(null);

  const [prospectForm, setProspectForm] = useState({
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

  const resetProspectForm = () => {
    setProspectForm({
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectForm.fullName.trim()) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProspectAction({
        ...prospectForm,
        agentId: agent.id,
      });

      if (res.success && res.prospectId) {
        toast.success(`Prospect "${prospectForm.fullName}" ajouté avec succès !`);

        // Optimistic append
        const newProspect: Prospect = {
          id: res.prospectId,
          fullName: prospectForm.fullName,
          phone: prospectForm.phone || null,
          whatsapp: prospectForm.whatsapp || null,
          address: prospectForm.address || null,
          city: prospectForm.city || null,
          source: prospectForm.source || null,
          interestedProduct: prospectForm.interestedProduct || null,
          status: prospectForm.status,
          createdAt: new Date(),
        };
        setProspects([newProspect, ...prospects]);
        setIsAddProspectOpen(false);
        resetProspectForm();
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProspectStatus = async (prospectId: string, newStatus: string) => {
    setUpdatingProspectId(prospectId);
    try {
      const res = await updateProspectStatusAction(prospectId, newStatus);
      if (res.success) {
        toast.success("Statut du prospect mis à jour !");
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

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/agents"
          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </div>

      {/* Agent Banner */}
      <Card className="border-slate-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 to-purple-500/5 rounded-full blur-3xl -z-10" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {agent.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">{agent.name}</h2>
                <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100">
                  {agent.role}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1.5 text-sm text-slate-500">
                <span className="flex items-center">
                  <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {agent.email}
                </span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Membre depuis le {formatDate(agent.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500">Prospects Total</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalProspects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              dont <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.contactedProspects}</span> contactés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              sur <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.totalSales}</span> ventes livrées / en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500">Commissions cumulées</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.totalCommission)}
            </div>
            <p className="text-xs text-emerald-600/70 font-semibold mt-1">Gains personnels cumulés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500">Taux de conversion</CardTitle>
            <Percent className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.conversionRate} %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.clientsCount}</span> clients validés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Graphs */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Évolution des ventes et commissions</CardTitle>
          <CardDescription>Visualisation sur les 6 derniers mois d'activité.</CardDescription>
        </CardHeader>
        <CardContent>
          {isMounted ? (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCommissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="name" className="text-xs font-medium text-slate-400" />
                  <YAxis className="text-xs font-medium text-slate-400" unit=" €" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area
                    name="Chiffre d'affaires généré"
                    type="monotone"
                    dataKey="ventes"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVentes)"
                  />
                  <Area
                    name="Commissions obtenues"
                    type="monotone"
                    dataKey="commissions"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCommissions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">
              Chargement des graphiques...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Tabs */}
      <Tabs defaultValue="prospects" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-100/80 dark:bg-slate-900 p-1 rounded-lg">
          <TabsTrigger value="prospects" className="rounded-md font-medium text-sm">
            Prospects
          </TabsTrigger>
          <TabsTrigger value="sales" className="rounded-md font-medium text-sm">
            Ventes
          </TabsTrigger>
          <TabsTrigger value="commissions" className="rounded-md font-medium text-sm">
            Commissions
          </TabsTrigger>
        </TabsList>
        
        {/* Prospects Tab */}
        <TabsContent value="prospects" className="mt-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Prospects affectés</CardTitle>
                <CardDescription>Liste des contacts gérés par le commercial.</CardDescription>
              </div>
              <Button
                onClick={() => setIsAddProspectOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                size="sm"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Ajouter un prospect
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Produit d'intérêt</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-sm">
                          Aucun prospect géré par cet agent.
                        </TableCell>
                      </TableRow>
                    ) : (
                      prospects.map((prospect) => (
                        <TableRow key={prospect.id} className="hover:bg-slate-50/30">
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            {prospect.fullName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {prospect.phone || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {prospect.whatsapp || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] font-semibold">{prospect.source || "Direct"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-indigo-600">
                            {prospect.interestedProduct || "-"}
                          </TableCell>
                          <TableCell>
                            <Select
                              disabled={updatingProspectId === prospect.id}
                              value={prospect.status}
                              onValueChange={(val) => {
                                if (val) handleUpdateProspectStatus(prospect.id, val);
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
                            {formatDate(prospect.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Ventes réalisées récentes (max 10)</CardTitle>
              <CardDescription>Liste des transactions enregistrées par le commercial.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-sm">
                          Aucune vente enregistrée pour cet agent.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-xs text-slate-400">
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            {sale.customerName}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {sale.productName}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sale.quantity}
                          </TableCell>
                          <TableCell className="text-sm font-bold text-indigo-600">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="mt-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Historique des commissions (max 10)</CardTitle>
              <CardDescription>Détail des gains générés par chaque vente confirmée.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vente Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-sm">
                          Aucune commission générée pour cet agent.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentCommissions.map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell className="text-xs text-slate-400">
                            {formatDate(comm.date)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            Vente à {comm.customerName}
                          </TableCell>
                          <TableCell className="text-sm font-black text-emerald-600">
                            {formatCurrency(comm.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(comm.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Prospect Dialog */}
      <Dialog open={isAddProspectOpen} onOpenChange={setIsAddProspectOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un prospect</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau contact commercial affecté à <span className="font-semibold text-indigo-600">{agent.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProspect} className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="prospectFullName">Nom complet *</Label>
              <div className="relative">
                <Contact className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="prospectFullName"
                  placeholder="Prénom et nom du prospect"
                  value={prospectForm.fullName}
                  onChange={(e) => setProspectForm({ ...prospectForm, fullName: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            {/* Phone & WhatsApp */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prospectPhone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="prospectPhone"
                    placeholder="06 12 34 56 78"
                    value={prospectForm.phone}
                    onChange={(e) => setProspectForm({ ...prospectForm, phone: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="prospectWhatsapp">WhatsApp</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="prospectWhatsapp"
                    placeholder="+212 6XX XXX XXX"
                    value={prospectForm.whatsapp}
                    onChange={(e) => setProspectForm({ ...prospectForm, whatsapp: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prospectAddress">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="prospectAddress"
                    placeholder="Adresse postale"
                    value={prospectForm.address}
                    onChange={(e) => setProspectForm({ ...prospectForm, address: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="prospectCity">Ville</Label>
                <Input
                  id="prospectCity"
                  placeholder="Casablanca, Rabat..."
                  value={prospectForm.city}
                  onChange={(e) => setProspectForm({ ...prospectForm, city: e.target.value })}
                />
              </div>
            </div>

            {/* Source & Product Interest */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prospectSource">Source d'acquisition</Label>
                <Select
                  value={prospectForm.source}
                  onValueChange={(val) => setProspectForm({ ...prospectForm, source: val || "" })}
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
                <Label htmlFor="prospectProduct">Produit d'intérêt</Label>
                <Input
                  id="prospectProduct"
                  placeholder="Ex: Pack Premium"
                  value={prospectForm.interestedProduct}
                  onChange={(e) => setProspectForm({ ...prospectForm, interestedProduct: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label htmlFor="prospectStatus">Statut initial</Label>
              <Select
                value={prospectForm.status}
                onValueChange={(val) => setProspectForm({ ...prospectForm, status: val || "NEW" })}
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
              <Label htmlFor="prospectComments">Commentaires</Label>
              <textarea
                id="prospectComments"
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Notes internes, remarques..."
                value={prospectForm.comments}
                onChange={(e) => setProspectForm({ ...prospectForm, comments: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddProspectOpen(false); resetProspectForm(); }}
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
