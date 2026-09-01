"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Database,
  Plus,
  Edit,
  Trash2,
  Search,
  User,
  Mail,
  Lock,
  Check,
  Copy,
  MapPin,
  HelpCircle,
  AlertTriangle,
  KeyRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAgentAction,
  updateAgentAction,
  deleteUserAction,
} from "@/server/actions/agent-actions";
import { changePasswordAction } from "@/server/actions/auth-actions";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  leaderId: string | null;
  leaderName: string | null;
}

interface Leader {
  id: string;
  name: string;
  email: string;
}

interface SettingsClientPageProps {
  initialUsers: SystemUser[];
  leaders: Leader[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrateur", color: "#F3C442", bg: "rgba(243,196,66,0.12)" },
  ACCOUNTANT: { label: "Comptable", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  LEADER: { label: "Leader", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  AGENT: { label: "Commercial", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ECOMMERCANT: { label: "E-commerçant", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  STOCKISTE: { label: "Stockiste", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  DELIVERY: { label: "Livreur", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  DELIVERY_ASSISTANT: { label: "Livraisons", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};

export function SettingsClientPage({
  initialUsers,
  leaders,
  currentUser,
}: SettingsClientPageProps) {
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [leadersList, setLeadersList] = useState<Leader[]>(leaders);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const isAdmin = currentUser.role === "ADMIN";

  // Password Change Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
    leaderId: "none",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "AGENT",
    leaderId: "none",
  });

  // Filter users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Veuillez saisir votre mot de passe actuel.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        toast.success("Votre mot de passe a été modifié avec succès !");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error || "Impossible de modifier le mot de passe.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAgentAction({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password || undefined,
        role: addForm.role,
        leaderId: addForm.leaderId === "none" ? undefined : addForm.leaderId,
      });

      if (res.success && res.agentId) {
        toast.success("Utilisateur créé avec succès !");
        setCreatedPassword(res.generatedPassword || addForm.password || "password123");
        setIsSuccessOpen(true);

        // Append user to state
        const targetLeader = leadersList.find((l) => l.id === addForm.leaderId);
        const newUser: SystemUser = {
          id: res.agentId,
          name: addForm.name,
          email: addForm.email,
          role: addForm.role,
          createdAt: new Date(),
          leaderId: addForm.leaderId === "none" ? null : addForm.leaderId,
          leaderName: targetLeader ? targetLeader.name : null,
        };
        setUsers([newUser, ...users]);

        // If the new user is a LEADER, add them to the local leaders state
        if (addForm.role === "LEADER") {
          setLeadersList([...leadersList, { id: res.agentId, name: addForm.name, email: addForm.email }]);
        }

        setIsAddOpen(false);

        // Reset
        setAddForm({
          name: "",
          email: "",
          password: "",
          role: "AGENT",
          leaderId: "none",
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

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await updateAgentAction(selectedUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        leaderId: editForm.leaderId === "none" ? null : editForm.leaderId,
      });

      if (res.success && res.agent) {
        toast.success("Profil mis à jour !");

        const targetLeader = leadersList.find((l) => l.id === editForm.leaderId);
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                leaderId: editForm.leaderId === "none" ? null : editForm.leaderId,
                leaderName: targetLeader ? targetLeader.name : null,
              }
              : u
          )
        );

        // If role is LEADER, update or add to leadersList state
        if (editForm.role === "LEADER") {
          const alreadyExists = leadersList.some((l) => l.id === selectedUser.id);
          if (alreadyExists) {
            setLeadersList(
              leadersList.map((l) =>
                l.id === selectedUser.id
                  ? { ...l, name: editForm.name, email: editForm.email }
                  : l
              )
            );
          } else {
            setLeadersList([
              ...leadersList,
              { id: selectedUser.id, name: editForm.name, email: editForm.email },
            ]);
          }
        } else if (selectedUser.role === "LEADER") {
          // If the role was changed from LEADER to something else, remove from leadersList
          setLeadersList(leadersList.filter((l) => l.id !== selectedUser.id));
        }

        setIsEditOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await deleteUserAction(selectedUser.id);
      if (res.success) {
        toast.success("Utilisateur supprimé.");
        setUsers(users.filter((u) => u.id !== selectedUser.id));

        // If deleted user was a LEADER, remove from leadersList state
        if (selectedUser.role === "LEADER") {
          setLeadersList(leadersList.filter((l) => l.id !== selectedUser.id));
        }

        setIsDeleteOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: SystemUser) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      leaderId: u.leaderId || "none",
    });
    setIsEditOpen(true);
  };

  const openDeleteModal = (u: SystemUser) => {
    setSelectedUser(u);
    setIsDeleteOpen(true);
  };

  const roleInfo = ROLE_LABELS[currentUser.role] ?? {
    label: currentUser.role,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent font-heading">
            Profil & Paramètres
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos informations de connexion, la sécurité de votre compte et accédez aux configurations.
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/40 rounded-lg ${isAdmin ? "w-full sm:w-[550px] grid-cols-3" : "w-full sm:w-[200px] grid-cols-1"}`}>
          <TabsTrigger value="profile" className="font-semibold text-xs py-1.5 rounded-md">
            <User className="h-3.5 w-3.5 mr-2" />
            Mon Profil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="font-semibold text-xs py-1.5 rounded-md">
              <Users className="h-3.5 w-3.5 mr-2" />
              Utilisateurs & Accès
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="system" className="font-semibold text-xs py-1.5 rounded-md">
              <Database className="h-3.5 w-3.5 mr-2" />
              Paramètres Système
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Mon Profil */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* User Details Summary */}
            <Card className="glass-card md:col-span-1 border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-2xl shadow-md mb-3">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
                  {currentUser.name}
                </CardTitle>
                <div className="mt-2 flex justify-center">
                  <Badge
                    variant="outline"
                    className="font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider text-[10px]"
                    style={{ color: roleInfo.color, background: roleInfo.bg, borderColor: roleInfo.color + "33" }}
                  >
                    {roleInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 border-t border-slate-100/80 dark:border-slate-800/40 text-sm">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="overflow-hidden">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Adresse Email</p>
                    <p className="truncate font-medium">{currentUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
                  <Shield className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rôle Habilitation</p>
                    <p className="font-medium">{currentUser.role}</p>
                  </div>
                </div>
              </CardContent>
              <div className="bg-slate-50/50 dark:bg-slate-900/10 px-4 py-3 rounded-b-xl border-t border-slate-100/80 dark:border-slate-800/40 text-[11px] text-slate-400 text-center">
                AYLAN GROUP • Espace de travail sécurisé
              </div>
            </Card>

            {/* Password Change form */}
            <Card className="glass-card md:col-span-2 border-slate-200/50 dark:border-slate-800/50 shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-500" /> Sécurité du compte
                </CardTitle>
                <CardDescription>
                  Modifier votre mot de passe pour sécuriser l'accès à votre compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Mot de passe actuel</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Saisissez votre mot de passe actuel"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pl-8 bg-background border-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Minimum 8 caractères"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-8 bg-background border-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirmez le nouveau mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-8 bg-background border-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20 px-6"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Modification...
                        </>
                      ) : (
                        "Mettre à jour le mot de passe"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: User Management (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4 mt-6">
            <Card className="glass-card border-slate-200/50 dark:border-slate-800/50">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Registre des Comptes Utilisateurs</CardTitle>
                  <CardDescription>
                    Créez des comptes et gérez l'ensemble des administrateurs, comptables, leaders et commerciaux.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsAddOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20"
                >
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un utilisateur
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 bg-background h-9 text-sm border-slate-200"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || "all")}>
                    <SelectTrigger className="w-[180px] h-9 border-slate-200">
                      <SelectValue placeholder="Tous les rôles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="ADMIN">Administrateurs</SelectItem>
                      <SelectItem value="ACCOUNTANT">Comptables</SelectItem>
                      <SelectItem value="LEADER">Leaders</SelectItem>
                      <SelectItem value="AGENT">Commerciaux</SelectItem>
                      <SelectItem value="ECOMMERCANT">E-commerçants</SelectItem>
                      <SelectItem value="DELIVERY_ASSISTANT">Livreurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table list */}
                <div className="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Leader (Pour commercial)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                            Aucun utilisateur trouvé.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => {
                          const rInfo = ROLE_LABELS[u.role] || {
                            label: u.role,
                            color: "#94a3b8",
                            bg: "rgba(148,163,184,0.12)",
                          };
                          return (
                            <TableRow key={u.id} className="hover:bg-slate-50/30">
                              <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                                {u.name}
                              </TableCell>
                              <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                                  style={{ color: rInfo.color, background: rInfo.bg }}
                                >
                                  {rInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {u.role === "AGENT" ? (
                                  u.leaderName ? (
                                    <span className="font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 px-2 py-0.5 rounded text-xs border border-violet-100/30">
                                      👤 {u.leaderName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Non affecté</span>
                                  )
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                                    onClick={() => openEditModal(u)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50/50"
                                    disabled={u.id === currentUser.id}
                                    onClick={() => openDeleteModal(u)}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        )}

        {/* Tab 3: System parameters (Admin Only) */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Rates Reference */}
              <Card className="glass-card border-slate-200/50 dark:border-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-500" /> Tarifs de Livraison Standard
                  </CardTitle>
                  <CardDescription>
                    Grille des coûts et frais de livraison par défaut appliqués lors de la prise de commande.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-slate-100 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow>
                          <TableHead>Zone / Ville de Livraison</TableHead>
                          <TableHead className="text-right">Frais Applicables</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold text-slate-700">Moroni</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">1 000 KMF</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold text-slate-700">Grande Comore (Hors Moroni)</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">1 500 KMF</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold text-slate-700">Anjouan</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">1 500 KMF</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold text-slate-700">Mohéli</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">1 500 KMF</TableCell>
                        </TableRow>
                        <TableRow className="bg-slate-50/30">
                          <TableCell className="font-semibold text-slate-500">Retrait physique sur place</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">Gratuit (0 KMF)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Architecture Card */}
              <Card className="glass-card border-slate-200/50 dark:border-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" /> Technologies et Sécurité
                  </CardTitle>
                  <CardDescription>Informations et configurations techniques du portail.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-500">
                  <div className="space-y-2 border-b border-slate-100 pb-3">
                    <p className="flex justify-between">
                      <span className="font-medium text-slate-700">Moteur d'Authentification :</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600">Better Auth v1.6</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium text-slate-700">ORM & Base de données :</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600">Prisma Client v7 / PostgreSQL</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-medium text-slate-700">Framework Web :</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600">Next.js v16 (Turbopack)</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 rounded-lg p-3 text-xs leading-normal flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-850 block mb-0.5">Note de Maintenance</span>
                      Pour toute modification des tarifs de livraison ou des taux de commission par défaut, veuillez vous adresser au service de support technique pour modification dans le code source de l'application.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add User Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Créez un compte utilisateur. Un mot de passe sécurisé sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-2">
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
                  placeholder="jean.dupont@aylan.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Mot de passe (optionnel)</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Généré si vide"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role">Rôle utilisateur</Label>
              <Select
                value={addForm.role}
                onValueChange={(val) => setAddForm({ ...addForm, role: val || "AGENT", leaderId: "none" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="ACCOUNTANT">Comptable</SelectItem>
                  <SelectItem value="LEADER">Leader d'équipe</SelectItem>
                  <SelectItem value="AGENT">Téléconseiller / Agent Commercial</SelectItem>
                  <SelectItem value="ECOMMERCANT">E-commerçant</SelectItem>
                  <SelectItem value="DELIVERY_ASSISTANT">Assistant Livraisons</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addForm.role === "AGENT" && (
              <div className="space-y-1">
                <Label htmlFor="leaderId">Assigner à un Leader</Label>
                <Select
                  value={addForm.leaderId}
                  onValueChange={(val) => setAddForm({ ...addForm, leaderId: val || "none" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un leader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun leader</SelectItem>
                    {leadersList.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {isSubmitting ? "Création..." : "Créer le compte"}
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
              <Check className="h-5 w-5 bg-emerald-500/10 p-0.5 rounded-full" /> Compte créé avec succès !
            </DialogTitle>
            <DialogDescription>
              Veuillez copier le mot de passe généré automatiquement pour le transmettre à l'utilisateur. Il pourra le modifier ultérieurement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <Label className="text-slate-500 text-xs font-bold uppercase">Mot de passe temporaire</Label>
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

      {/* Edit User Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier les accès de l'utilisateur</DialogTitle>
            <DialogDescription>
              Ajustez le profil, le rôle et l'affectation d'équipe de l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUserSubmit} className="space-y-4 py-2">
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

            <div className="space-y-1">
              <Label htmlFor="edit-role">Rôle de l'utilisateur</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm({ ...editForm, role: val || "AGENT", leaderId: "none" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="ACCOUNTANT">Comptable</SelectItem>
                  <SelectItem value="LEADER">Leader d'équipe</SelectItem>
                  <SelectItem value="AGENT">Téléconseiller / Agent Commercial</SelectItem>
                  <SelectItem value="ECOMMERCANT">E-commerçant</SelectItem>
                  <SelectItem value="DELIVERY_ASSISTANT">Assistant Livraisons</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.role === "AGENT" && (
              <div className="space-y-1">
                <Label htmlFor="edit-leaderId">Leader Affecté</Label>
                <Select
                  value={editForm.leaderId}
                  onValueChange={(val) => setEditForm({ ...editForm, leaderId: val || "none" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un leader" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun leader</SelectItem>
                    {leadersList.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelectedUser(null);
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
                {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Supprimer le compte utilisateur
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte de <strong>{selectedUser?.name}</strong> ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-500 space-y-2">
            <p>
              Cette action supprimera définitivement les identifiants d'accès. La suppression ne peut être faite que si l'utilisateur ne possède aucune vente, commission ou prospect actif.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUserSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
