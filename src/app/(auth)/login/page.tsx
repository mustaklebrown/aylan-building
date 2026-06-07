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
    <div className="min-h-screen flex" style={{ background: "#0F1D33" }}>
      {/* ── LEFT PANEL — Brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0B1626 0%, #0F1D33 50%, #1F3864 100%)" }}
      >
        {/* Decorative rings */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(243,196,66,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(243,196,66,0.05) 0%, transparent 50%)",
          }}
        />
        {/* Gold accent line top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, transparent, #F3C442, transparent)" }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          {/* Logo */}
          <div className="relative mb-10">
            <div
              className="absolute -inset-4 rounded-3xl blur-xl opacity-20"
              style={{ background: "#F3C442" }}
            />
            <Image
              src="/logo.jpeg"
              alt="Aylan Group"
              width={260}
              height={130}
              className="relative rounded-2xl shadow-2xl"
              priority
            />
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white mb-3">
            Portail de Gestion
          </h1>
          <p className="text-lg max-w-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Gestion commerciale, stock et livraisons — tout en un.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: "📊", label: "Tableau de bord en temps réel" },
              { icon: "📦", label: "Suivi des stocks & produits" },
              { icon: "🚚", label: "Gestion des livraisons Comores" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(243,196,66,0.15)" }}
              >
                <span className="text-base">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom location badge */}
        <div
          className="absolute bottom-6 text-xs"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Moroni Magoudjou · Grande Comore · Comores
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={{ background: "#0F1D33" }}
      >
        {/* Subtle glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 80% 10%, rgba(243,196,66,0.06) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo (visible only on small screens) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image
              src="/logo.jpeg"
              alt="Aylan Group"
              width={180}
              height={90}
              className="rounded-xl shadow-xl"
              priority
            />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Connexion
            </h2>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Accédez à votre espace de travail
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#F3C442" }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@aylangroup.com"
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
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#F3C442" }} />
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
              className="w-full h-11 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
              style={{
                background: loading ? "rgba(243,196,66,0.6)" : "#F3C442",
                color: "#0F1D33",
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
          <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: "#F3C442" }}
            >
              Créer un compte
            </Link>
          </p>

          {/* Dev seed box */}
          <div
            className="mt-8 rounded-xl p-4"
            style={{
              background: "rgba(243,196,66,0.05)",
              border: "1px solid rgba(243,196,66,0.15)",
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#F3C442" }}>
              <Sparkles className="h-3.5 w-3.5" />
              Environnement de Test
            </div>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              Initialisez les comptes prédéfinis pour tester les différents rôles.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="w-full h-8 text-xs font-medium rounded-lg transition-all"
              style={{
                background: "rgba(243,196,66,0.1)",
                border: "1px solid rgba(243,196,66,0.25)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {seeding ? (
                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Initialisation...</>
              ) : (
                <><Database className="mr-1.5 h-3 w-3" />Initialiser les comptes de test</>
              )}
            </Button>

            {/* Accounts grid */}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] pt-2 border-t" style={{ borderColor: "rgba(243,196,66,0.1)" }}>
              {[
                { role: "ADMIN", email: "admin@aylangroup.com" },
                { role: "COMPTABLE", email: "accountant@" },
                { role: "AGENT", email: "agent@" },
                { role: "LIVRAISON", email: "delivery@" },
              ].map((a) => (
                <div key={a.role}>
                  <span className="font-bold block" style={{ color: "#F3C442" }}>{a.role}</span>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{a.email}aylangroup.com</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Mot de passe commun :{" "}
              <span
                className="font-mono rounded px-1"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                password123
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
