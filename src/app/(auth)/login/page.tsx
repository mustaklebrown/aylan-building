"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Mail, Sparkles, Database, Loader2, ArrowRight } from "lucide-react";
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
        setEmail("admin@digecom.com");
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
    <div className="min-h-screen flex" style={{ background: "#060F26" }}>
      {/* ── LEFT PANEL — Brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #050D21 0%, #08163D 50%, #0B3DF5 140%)" }}
      >
        {/* Decorative rings */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(11,61,245,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,168,0,0.12) 0%, transparent 50%)",
          }}
        />
        {/* Gold accent line top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, transparent, #FFA800, #0B3DF5, transparent)" }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          {/* Logo */}
          <div className="relative mb-8">
            <div
              className="absolute -inset-4 rounded-3xl blur-2xl opacity-35"
              style={{ background: "#FFA800" }}
            />
            <Image
              src="/logo-dig.jpg"
              alt="Dig e-com"
              width={260}
              height={130}
              className="relative rounded-2xl shadow-2xl drop-shadow-[0_8px_32px_rgba(11,61,245,0.45)]"
              priority
            />
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white mb-3">
            Dig e-com
          </h1>
          <p className="text-lg max-w-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            Plateforme tout-en-un de gestion e-commerce, stock et livraisons.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: "📊", label: "Tableau de bord & Ventes en temps réel" },
              { icon: "📦", label: "Gestion des stocks & Produits" },
              { icon: "🚚", label: "Suivi des commandes & Livraisons" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,168,0,0.25)" }}
              >
                <span className="text-base">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div
          className="absolute bottom-6 text-xs font-medium"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Dig e-com Agency · Système Central de Gestion
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={{ background: "#060F26" }}
      >
        {/* Subtle glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 80% 10%, rgba(11,61,245,0.15) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo (visible only on small screens) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src="/logo.jpeg"
              alt="Dig e-com"
              width={180}
              height={90}
              className="rounded-xl shadow-xl drop-shadow-[0_4px_20px_rgba(11,61,245,0.35)]"
              priority
            />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Connexion
            </h2>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              Accédez à votre espace de travail Dig e-com
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleLogin}
            className="rounded-2xl p-6 space-y-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#FFA800" }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="commercial@digecom.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-white placeholder:opacity-30 focus-visible:ring-1 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                Mot de passe
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#FFA800" }} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 text-white placeholder:opacity-30 focus-visible:ring-1 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.99]"
              style={{
                background: loading ? "rgba(255,168,0,0.6)" : "linear-gradient(135deg, #FFA800 0%, #FFBA24 100%)",
                color: "#060F26",
                boxShadow: "0 4px 18px rgba(255,168,0,0.35)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors hover:underline"
              style={{ color: "#FFA800" }}
            >
              Créer un compte
            </Link>
          </p>

          {/* Dev seed box */}
        </div>
      </div>
    </div>
  );
}
