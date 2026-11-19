import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-sm print:hidden">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Modo Sin Cobertura en Obra — Trabajando con caché local. Los partes se sincronizarán al recuperar conexión.
      </span>
    </div>
  );
};
