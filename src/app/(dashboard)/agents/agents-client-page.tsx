"use client";

import { useState } from "react";
import Link from "next/link";
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
  Users,
  ShoppingCart,
  Banknote,
  Percent,
  TrendingUp,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Shield,
  Mail,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  createAgentAction,
  deleteAgentAction,
  updateAgentAction,
} from "@/server/actions/agent-actions";
import { formatCurrency, formatDate } from "@/lib/format-utils";

interface Agent {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  prospectsCount: number;
  salesCount: number;
  totalCommissions: number;
  totalRevenue: number;
  conversionRate: number;
  leaderName: string | null;
  leaderId: string | null;
}

interface AgentsClientPageProps {
  initialAgents: Agent[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AgentsClientPage({
  initialAgents,
  currentUser,
}: AgentsClientPageProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "conversion" | "sales">("name");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "AGENT" });

  const isAdmin = currentUser.role === "ADMIN";
  const isLeader = currentUser.role === "LEADER";
  const canManage = isAdmin || isLeader;

  // Filter and sort agents
  const filteredAgents = agents
    .filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
      if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
      if (sortBy === "sales") return b.salesCount - a.salesCount;
      return 0;
    });

  // Global metrics summary
  const totalSales = agents.reduce((sum, a) => sum + a.salesCount, 0);
  const totalRevenue = agents.reduce((sum, a) => sum + a.totalRevenue, 0);
  const totalCommissions = agents.reduce((sum, a) => sum + a.totalCommissions, 0);
  const averageConversion =
    agents.length > 0
      ? parseFloat(
          (
            agents.reduce((sum, a) => sum + a.conversionRate, 0) / agents.length
          ).toFixed(1)
        )
      : 0;

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email) {
      toast.error("Veuillez remplir le nom et l'email.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await createAgentAction(addForm);
      if (res.success && res.agentId) {
        toast.success("Agent créé avec succès !");
        
        // Optimistic update
        const newAgent: Agent = {
          id: res.agentId,
          name: addForm.name,
          email: addForm.email,
          createdAt: new Date(),
          prospectsCount: 0,
          salesCount: 0,
          totalCommissions: 0,
          totalRevenue: 0,
          conversionRate: 0,
          leaderName: isLeader ? currentUser.name : null,
          leaderId: isLeader ? currentUser.id : null,
        };
        setAgents([newAgent, ...agents]);
        
        // Save generated password and open success modal
        setCreatedPassword(res.generatedPassword || "");
        setCopied(false);
        setIsSuccessOpen(true);
        
        setAddForm({ name: "", email: "", password: "" });
        setIsAddOpen(false);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    
    setIsSubmitting(true);
    try {
      const res = await updateAgentAction(selectedAgent.id, editForm);
      if (res.success && res.agent) {
        toast.success("Informations de l'agent mises à jour !");
        
        setAgents(
          agents.map((a) =>
            a.id === selectedAgent.id
              ? {
                  ...a,
                  name: editForm.name,
                  email: editForm.email,
                }
              : a
          )
        );
        setIsEditOpen(false);
        setSelectedAgent(null);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    
    setIsSubmitting(true);
    try {
      const res = await deleteAgentAction(selectedAgent.id);
      if (res.success) {
        toast.success("Agent supprimé avec succès !");
        setAgents(agents.filter((a) => a.id !== selectedAgent.id));
        setIsDeleteOpen(false);
        setSelectedAgent(null);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.name,
      email: agent.email,
      role: "AGENT",
    });
    setIsEditOpen(true);
  };

  const openDeleteModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteOpen(true);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Gestion des Téléconseillers
          </h2>
          <p className="text-muted-foreground mt-1">
            Supervisez les performances, gérez les profils et suivez les conversions des commerciaux de votre équipe.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Ajouter un commercial
          </Button>
        )}
      </div>

      {/* Global Performance Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-indigo-500/10 bg-indigo-500/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-indigo-700">CA Global Equipe</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-indigo-600/70 font-medium mt-1">Généré par les agents</p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-500/10 bg-purple-500/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-purple-700">Commissions Equipe</CardTitle>
            <Banknote className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalCommissions)}
            </div>
            <p className="text-xs text-purple-600/70 font-medium mt-1">Total accumulé</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/10 bg-rose-500/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-rose-700">Ventes Totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalSales}
            </div>
            <p className="text-xs text-rose-600/70 font-medium mt-1">Transactions conclues</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/10 bg-emerald-500/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-emerald-700">Taux de Conv. Moyen</CardTitle>
            <Percent className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {averageConversion} %
            </div>
            <p className="text-xs text-emerald-600/70 font-medium mt-1">Prospects convertis en clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Listing */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">Commerciaux ({filteredAgents.length})</CardTitle>
            <CardDescription>Visualisez la liste et filtrez par différents indicateurs.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-background h-9 text-sm border-slate-200"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-[180px] h-9 border-slate-200">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Trier par Nom</SelectItem>
                <SelectItem value="revenue">Chiffre d'affaires</SelectItem>
                <SelectItem value="conversion">Taux de conversion</SelectItem>
                <SelectItem value="sales">Nombre de ventes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="mx-auto h-12 w-12 text-slate-200 mb-3" />
              <p className="font-medium text-sm">Aucun agent trouvé</p>
              <p className="text-xs text-slate-400/80">Essayez d'ajuster votre recherche.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-2">
              {filteredAgents.map((agent) => (
                <Card
                  key={agent.id}
                  className="overflow-hidden border border-slate-100 hover:border-indigo-500/30 transition-all hover:shadow-md group flex flex-col justify-between"
                >
                  <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-100/50 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-sm">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold group-hover:text-indigo-600 transition-colors">
                          {agent.name}
                        </CardTitle>
                        <CardDescription className="text-xs truncate max-w-[170px] flex items-center mt-0.5">
                          <Mail className="h-3 w-3 mr-1 text-slate-400" /> {agent.email}
                        </CardDescription>
                      </div>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-0">
                            <Link href={`/agents/${agent.id}`} className="cursor-pointer flex items-center w-full px-2 py-1.5 text-sm">
                              <Eye className="mr-2 h-4 w-4" /> Voir les KPI
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditModal(agent)}
                            className="cursor-pointer flex items-center"
                          >
                            <Edit className="mr-2 h-4 w-4" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(agent)}
                            className="text-red-600 focus:text-red-600 cursor-pointer flex items-center"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 pb-4 flex-1">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg border border-slate-100/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Prospects</span>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-100">{agent.prospectsCount}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg border border-slate-100/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ventes</span>
                        <div className="text-lg font-black text-slate-800 dark:text-slate-100">{agent.salesCount}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg border border-slate-100/30 col-span-2 flex justify-between items-center px-4 py-2.5">
                        <div className="text-left">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Chiffre d'affaires</span>
                          <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(agent.totalRevenue)}</span>
                        </div>
                        <div className="text-right border-l border-slate-200/60 dark:border-slate-800 pl-4">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Taux Conv.</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{agent.conversionRate}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <div className="bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100/80 px-4 py-2.5 flex justify-between items-center text-xs text-slate-500">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-slate-400" /> Créé le {formatDate(agent.createdAt)}
                    </span>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline flex items-center"
                    >
                      Voir le profil KPI →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Agent Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau commercial</DialogTitle>
            <DialogDescription>
              Créez un compte pour un nouvel agent. Un mot de passe sécurisé sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgent} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="Jean Dupont"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="j.dupont@aylangroup.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
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
                {isSubmitting ? "Création..." : "Générer et créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Modal (Generated Password) */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2 font-heading font-bold">
              <Check className="h-5 w-5 bg-emerald-500/10 p-0.5 rounded-full" /> Agent créé avec succès !
            </DialogTitle>
            <DialogDescription>
              Veuillez copier le mot de passe généré automatiquement pour le transmettre à l'agent commercial. Il devra le modifier depuis son profil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-slate-500 text-xs font-bold uppercase">Mot de passe généré</Label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-sm text-slate-800 dark:text-slate-200 select-all overflow-x-auto">
                  {createdPassword}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassword);
                    setCopied(true);
                    toast.success("Mot de passe copié !");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="w-full bg-slate-900 text-white hover:bg-slate-850"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier l'agent</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du profil.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAgent} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelectedAgent(null);
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
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer le commercial</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong>{selectedAgent?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-500">
            {selectedAgent && (selectedAgent.prospectsCount > 0 || selectedAgent.salesCount > 0) ? (
              <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-xs leading-normal">
                ⚠️ Cet agent possède actuellement {selectedAgent.prospectsCount} prospects et {selectedAgent.salesCount} ventes. 
                Le système bloquera la suppression pour préserver l'intégrité de la base de données. 
                Vous devriez plutôt modifier son compte ou réaffecter ses données.
              </div>
            ) : (
              <p>Cet agent ne possède aucun prospect ni vente associée, sa suppression est donc possible sans risque.</p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedAgent(null);
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAgent}
              disabled={isSubmitting || (selectedAgent ? (selectedAgent.prospectsCount > 0 || selectedAgent.salesCount > 0) : false)}
            >
              {isSubmitting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
