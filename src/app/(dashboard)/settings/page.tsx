import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Database, Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Only ADMIN can access settings
  if (session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Sécurité et Rôles</CardTitle>
              <CardDescription>Gérer les habilitations et les profils d'accès.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>En tant qu'administrateur, vous pouvez superviser l'ensemble des agents et des comptables.</p>
            <p>Module de gestion des utilisateurs en cours de développement.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Données & Système</CardTitle>
              <CardDescription>Sauvegarde, base de données SQLite et maintenance.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>Base de données locale : <code className="bg-muted px-1.5 py-0.5 rounded text-xs">dev.db</code></p>
            <p>Le système utilise Prisma 7 et Better Auth 1.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
