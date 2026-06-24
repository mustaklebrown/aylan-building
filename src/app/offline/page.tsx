'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      if (navigator.onLine) {
        window.location.href = '/';
      } else {
        // Simple reload to trigger browser/service worker connection check
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1D33] p-4 text-white">
      <Card className="w-full max-w-md border-[#F3C442]/30 bg-[#162744] text-white shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <WifiOff className="h-10 w-10 text-[#F3C442]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Connexion Perdue
          </CardTitle>
          <CardDescription className="text-slate-300">
            Il semble que vous soyez hors ligne.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-slate-300">
            L'application Aylan Group nécessite une connexion Internet active pour charger de nouvelles pages ou synchroniser les données commerciales et les stocks.
          </p>
          <div className="rounded-lg bg-[#0F1D33]/50 p-4 text-left border border-slate-700/50">
            <h4 className="text-sm font-semibold text-[#F3C442] mb-1">Que pouvez-vous faire ?</h4>
            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
              <li>Vérifiez la connexion Wi-Fi ou vos données mobiles.</li>
              <li>Activez et désactivez le mode avion.</li>
              <li>Réessayez une fois la connexion rétablie.</li>
            </ul>
          </div>
          <Button 
            onClick={handleRetry}
            className="w-full bg-[#F3C442] text-[#0F1D33] hover:bg-[#F3C442]/90 font-semibold"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer la connexion
          </Button>
        </CardContent>
      </Card>
      <div className="mt-8 text-center text-xs text-slate-500">
        Aylan Group Dashboard • Mode Hors-ligne
      </div>
    </div>
  );
}
