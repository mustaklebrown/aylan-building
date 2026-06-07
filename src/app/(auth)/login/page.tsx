"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Mail, Sparkles, UserPlus, Database, Loader2 } from "lucide-react";
import { seedTestAccountsAction } from "@/server/actions/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message || "Erreur de connexion");
      } else {
        toast.success("Connexion réussie !");
        router.refresh();
        router.push("/");
      }
    } catch (err: any) {
      toast.error("Une erreur inattendue est survenue");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    toast.info("Initialisation des comptes de test...");
    try {
      const res = await seedTestAccountsAction();
      if (res.success) {
        toast.success("Comptes de test initialisés avec succès !");
        // Pre-fill email to make it easy
        setEmail("admin@aylangroup.com");
        setPassword("password123");
      } else {
        toast.error("Erreur lors de l'initialisation.");
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'appel de l'action de seeding.");
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-rose-500/10 blur-[128px]" />

      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20">
            A
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            AYLAN GROUP
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Portail de gestion commerciale & stock
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Connexion</CardTitle>
            <CardDescription className="text-slate-400">
              Saisissez vos identifiants pour accéder à votre espace.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@aylangroup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-800 bg-slate-950/50 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-800 bg-slate-950/50 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-medium hover:from-indigo-600 hover:to-rose-600 transition-all shadow-md shadow-indigo-500/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>

              <div className="text-center text-xs text-slate-400">
                Vous n'avez pas de compte ?{" "}
                <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Créer un compte
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Development Helper Seed Box */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4" /> Environnement de Test
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Initialisez rapidement les comptes prédéfinis pour tester les différents rôles (Admin, Comptable, Agent).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="w-full border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Initialisation...
              </>
            ) : (
              <>
                <Database className="mr-2 h-3.5 w-3.5" /> Initialiser les comptes de test
              </>
            )}
          </Button>

          {/* Quick info of passwords */}
          <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-slate-500 border-t border-slate-800/50 pt-2">
            <div>
              <span className="font-bold text-slate-400 block">ADMIN:</span>
              admin@aylangroup.com
            </div>
            <div>
              <span className="font-bold text-slate-400 block">COMPTABLE:</span>
              accountant@aylangroup.com
            </div>
            <div>
              <span className="font-bold text-slate-400 block">AGENT:</span>
              agent@aylangroup.com
            </div>
          </div>
          <div className="mt-1 text-center text-[9px] text-slate-600">
            Mot de passe commun : <span className="font-mono bg-slate-950 px-1 py-0.5 rounded text-slate-500">password123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
