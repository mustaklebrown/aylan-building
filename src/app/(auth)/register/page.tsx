"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Mail, User, UserPlus, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message || "Erreur lors de l'inscription");
      } else {
        toast.success("Inscription réussie !");
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8" style={{ background: "#060F26" }}>
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/15 blur-[128px]" />

      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="absolute -inset-2 rounded-2xl bg-amber-500/20 blur-xl" />
            <img
              src="/logo.jpeg"
              alt="Dig e-com"
              className="relative h-16 w-auto object-contain rounded-xl drop-shadow-[0_4px_20px_rgba(11,61,245,0.4)]"
            />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Dig e-com
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Rejoignez le portail de gestion commerciale, stocks & livraisons
          </p>
        </div>

        <Card className="border-white/10 bg-[#0A1945]/80 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Inscription</CardTitle>
            <CardDescription className="text-white/60">
              Créez votre compte collaborateur pour démarrer.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Nom Complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-white/15 bg-white/5 pl-10 text-white placeholder-white/30 focus-visible:ring-[#FFA800]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="commercial@digecom.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/15 bg-white/5 pl-10 text-white placeholder-white/30 focus-visible:ring-[#FFA800]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="•••••••• (8 caractères min)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-800 bg-slate-950/50 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirmer le mot de passe</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                className="w-full font-bold text-sm h-11 rounded-xl transition-all shadow-lg hover:brightness-105"
                style={{
                  background: loading ? "rgba(255,168,0,0.6)" : "linear-gradient(135deg, #FFA800 0%, #FFBA24 100%)",
                  color: "#060F26",
                  boxShadow: "0 4px 18px rgba(255,168,0,0.3)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscription en cours...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>

              <div className="text-center text-xs text-white/50">
                Vous avez déjà un compte ?{" "}
                <Link href="/login" className="font-semibold text-[#FFA800] hover:underline transition-colors">
                  Se connecter
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
