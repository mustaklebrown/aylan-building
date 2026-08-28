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
import { KeyRound, Shield, User, Mail, Loader2, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction } from "@/server/actions/auth-actions";

interface ProfileClientPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Administrateur", color: "text-[#F3C442]", bg: "bg-[#F3C442]/12 border-[#F3C442]/20" },
  ACCOUNTANT: { label: "Comptable", color: "text-blue-500", bg: "bg-blue-500/12 border-blue-500/20" },
  AGENT: { label: "Agent Commercial", color: "text-emerald-500", bg: "bg-emerald-500/12 border-emerald-500/20" },
  DELIVERY_ASSISTANT: { label: "Livraisons", color: "text-orange-500", bg: "bg-orange-500/12 border-orange-500/20" },
  DELIVERY: { label: "Livreur", color: "text-teal-500", bg: "bg-teal-500/12 border-teal-500/20" },
};

export function ProfileClientPage({ user }: ProfileClientPageProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleInfo = ROLE_LABELS[user.role] ?? {
    label: user.role,
    color: "text-indigo-500",
    bg: "bg-indigo-500/12 border-indigo-500/20",
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);

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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-heading">
          Mon Profil
        </h2>
        <p className="text-muted-foreground mt-1">
          Gérez vos informations personnelles et configurez la sécurité de votre compte.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info Summary */}
        <Card className="glass-card md:col-span-1 border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-2xl shadow-md mb-3">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100">
              {user.name}
            </CardTitle>
            <div className="mt-2 flex justify-center">
              <Badge variant="outline" className={`${roleInfo.bg} ${roleInfo.color} font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider text-[10px]`}>
                {roleInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t border-slate-100/80 dark:border-slate-800/40 text-sm">
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Adresse Email</p>
                <p className="truncate font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <Shield className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rôle Habilitation</p>
                <p className="font-medium">{user.role}</p>
              </div>
            </div>
          </CardContent>
          <div className="bg-slate-50/50 dark:bg-slate-900/10 px-4 py-3 rounded-b-xl border-t border-slate-100/80 dark:border-slate-800/40 text-[11px] text-slate-400 text-center">
            AYLAN GROUP • Espace de travail sécurisé
          </div>
        </Card>

        {/* Change Password Form */}
        <Card className="glass-card md:col-span-2 border-slate-100 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-500" /> Sécurité du compte
            </CardTitle>
            <CardDescription>
              Modifier votre mot de passe pour sécuriser l'accès à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
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
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/20 px-6"
                >
                  {isSubmitting ? (
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
    </div>
  );
}
