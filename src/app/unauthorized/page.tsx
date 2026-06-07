import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-rose-500/10 blur-[128px]" />

      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-lg mb-2">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Accès Non Autorisé
        </h1>

        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page. Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
        </p>

        <div className="pt-4">
          <Button className="bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-all">
            <Link href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
