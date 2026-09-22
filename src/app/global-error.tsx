'use client';

import { useEffect, useState, useTransition } from 'react';
import { AlertOctagon, RefreshCw, RotateCcw } from 'lucide-react';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}

export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: GlobalErrorProps) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error('Fatal Root Application Error:', error);
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

  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <title>Erreur Critique Système • Dig e-com</title>
      </head>
      <body className="min-h-full flex flex-col items-center justify-center bg-[#060F26] px-4 py-16 text-white font-sans">
        <div className="w-full max-w-xl mx-auto space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 shadow-xl">
            <AlertOctagon className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Erreur Critique du Système
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
              Une interruption majeure est survenue au niveau du cœur de l&apos;application.
            </p>
          </div>

          <div className="rounded-xl bg-[#0A1945] border border-white/10 p-5 text-left text-xs sm:text-sm text-slate-300 space-y-3">
            <p>
              <strong className="text-white">Diagnostic :</strong> L&apos;arborescence principale n&apos;a pas pu être initialisée correctement.
            </p>
            {error?.digest && (
              <p className="font-mono text-xs text-amber-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                Code Incident (Digest) : {error.digest}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Veuillez relancer l&apos;application. Si l&apos;anomalie subsiste, vérifiez votre connexion ou contactez le support technique de Dig e-com.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetry}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFA800] hover:bg-[#ffb726] text-[#060F26] font-bold px-5 py-2.5 text-sm shadow-lg transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Tentative en cours...' : 'Tenter une récupération'}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white px-5 py-2.5 text-sm transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Recharger la page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
