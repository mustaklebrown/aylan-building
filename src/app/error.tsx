'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  LifeBuoy, 
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}

export default function ErrorPage({
  error,
  reset,
  unstable_retry,
}: ErrorPageProps) {
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log the error for tracking
    console.error('Captured Runtime Error in ErrorBoundary:', error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      if (typeof unstable_retry === 'function') {
        unstable_retry();
      } else if (typeof reset === 'function') {
        reset();
      } else {
        window.location.reload();
      }
    });
  };

  const handleFullReload = () => {
    window.location.reload();
  };

  const errorReport = `[RAPPORT D'INCIDENT DIG E-COM]
Date: ${new Date().toISOString()}
Message: ${error?.message || 'Erreur non spécifiée'}
Code Digest: ${error?.digest || 'Non disponible (Erreur client)'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'Inconnue'}
User Agent: ${typeof window !== 'undefined' ? window.navigator.userAgent : 'Inconnu'}
Stack: ${error?.stack || 'Non disponible'}`;

  const copyErrorReport = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(errorReport);
        setCopied(true);
        toast.success('Rapport d\'erreur copié dans le presse-papier !');
        setTimeout(() => setCopied(false), 3000);
      } else {
        toast.error('Impossible d\'accéder au presse-papier.');
      }
    } catch {
      toast.error('Échec de la copie du rapport.');
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0a1220] px-4 py-16 sm:px-6 lg:px-8 text-white">
      {/* Dynamic ambient gradients */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 -z-10 h-[450px] w-[450px] translate-x-1/2 translate-y-1/2 rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto space-y-8 text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 text-xs font-semibold text-red-400 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
          CODE 500 • INCIDENT D&apos;EXÉCUTION DU SYSTÈME
        </div>

        {/* Central Graphic Element */}
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-b from-[#221319] to-[#120a0d] border border-red-500/30 shadow-2xl shadow-red-950/50">
          <AlertTriangle className="h-14 w-14 text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.4)]" />
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFA800]/20 border border-[#FFA800]/40 text-[#FFA800] text-xs font-bold">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl font-[var(--font-heading)]">
            Une erreur inattendue est survenue
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            L&apos;application a rencontré une anomalie lors du traitement de cette page. Rassurez-vous, vos données et votre session sont sécurisées.
          </p>
        </div>

        {/* Incident Summary Card */}
        <div className="rounded-2xl bg-[#0A1945]/90 border border-white/10 p-5 sm:p-6 text-left shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#FFA800]">
              <LifeBuoy className="h-4 w-4 shrink-0" />
              <span>Diagnostic de l&apos;incident</span>
            </div>
            {error?.digest && (
              <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700 text-slate-400">
                Digest: <strong className="text-slate-200">{error.digest}</strong>
              </span>
            )}
          </div>

          <div className="text-xs sm:text-sm text-slate-300 space-y-2">
            <p>
              <strong className="text-white">Que s&apos;est-il passé ?</strong> Un dysfonctionnement temporaire ou une réponse inattendue du serveur a empêché le chargement normal de ce module.
            </p>
            <p className="text-slate-400">
              <strong className="text-slate-200">Recommandation :</strong> Tentez une nouvelle tentative avec le bouton ci-dessous. Si le problème se répète, copiez le rapport technique pour l&apos;équipe de support.
            </p>
          </div>

          {/* Collapsible Technical Details */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Masquer les détails techniques
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Afficher les détails techniques (pour développeur / support)
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-3 rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-3 overflow-hidden">
                <div>
                  <span className="text-slate-500">Message :</span>
                  <div className="text-red-400 mt-1 break-words">
                    {error?.message || 'Erreur non détaillée'}
                  </div>
                </div>

                {error?.digest && (
                  <div>
                    <span className="text-slate-500">Identifiant d&apos;incident (Digest) :</span>
                    <div className="text-amber-400 mt-0.5">{error.digest}</div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyErrorReport}
                    className="border-slate-700 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800 hover:text-white h-8"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                        Rapport copié !
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copier le rapport d&apos;incident
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isPending}
            className="bg-[#FFA800] hover:bg-[#ffb726] text-[#060F26] font-bold px-6 py-2.5 h-auto rounded-xl shadow-lg shadow-[#FFA800]/25 transition-all cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Récupération en cours...' : 'Réessayer l&apos;opération'}
          </Button>

          <Button
            onClick={handleFullReload}
            variant="outline"
            className="border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white px-5 py-2.5 h-auto rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Recharger la page complète
          </Button>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 px-5 py-2.5 text-sm transition-all"
          >
            <Home className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>

        {/* Footer Support Info */}
        <div className="pt-6 border-t border-slate-800/80 text-xs text-slate-500 space-y-1">
          <p>Dig e-com Platform • Système de tolérance aux pannes et résilience</p>
          <p>Besoin d&apos;aide immédiate ? Contactez le support technique avec l&apos;identifiant de l&apos;incident.</p>
        </div>
      </div>
    </main>
  );
}
