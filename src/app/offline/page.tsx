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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060F26] p-4 text-white">
      <Card className="w-full max-w-md border-white/10 bg-[#0A1945]/90 text-white shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <WifiOff className="h-10 w-10 text-[#FFA800]" />
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
            L'application Dig e-com nécessite une connexion Internet active pour charger de nouvelles pages ou synchroniser les données commerciales et les stocks.
          </p>
          <div className="rounded-lg bg-[#0A1945]/60 p-4 text-left border border-white/10">
            <h4 className="text-sm font-semibold text-[#FFA800] mb-1">Que pouvez-vous faire ?</h4>
            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
              <li>Vérifiez la connexion Wi-Fi ou vos données mobiles.</li>
              <li>Activez et désactivez le mode avion.</li>
              <li>Réessayez une fois la connexion rétablie.</li>
            </ul>
          </div>
          <Button 
            onClick={handleRetry}
            className="w-full bg-[#FFA800] text-[#060F26] hover:bg-[#ffb726] font-semibold"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer la connexion
          </Button>
        </CardContent>
      </Card>
      <div className="mt-8 text-center text-xs text-slate-500">
        Dig e-com Dashboard • Mode Hors-ligne
      </div>
    </div>
  );
}
