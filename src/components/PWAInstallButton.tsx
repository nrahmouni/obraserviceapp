import React, { useState } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  MoreVertical,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const {
    canTriggerNativePrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isInAppBrowser,
    showIOSPrompt,
    setShowIOSPrompt,
    promptInstall,
  } = usePWAInstall();

  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const sharedUrl = 'https://ais-pre-wgmrqfn3b4mcr7py5bbl7i-828288345083.europe-west2.run.app';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(sharedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={promptInstall}
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
          compact
            ? 'px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800'
            : 'px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-amber-400 border border-amber-400/40'
        }`}
        title="Instalar ObraService como aplicación en tu móvil u ordenador"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{canTriggerNativePrompt ? 'Instalar App Ahora' : 'Instalar App'}</span>
      </button>

      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border-2 border-amber-400 text-slate-900 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowIOSPrompt(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar instrucciones de instalación"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black shadow-xs">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  App Instalable en Obra (PWA)
                </span>
                <h3 className="text-base font-black text-slate-950">
                  {isIOS
                    ? 'Instalar en iPhone / iPad'
                    : isAndroid
                    ? 'Instalar en tu móvil Android'
                    : 'Instalar ObraService'}
                </h3>
              </div>
            </div>

            {(isInIframe || isInAppBrowser) && (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-950 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-bold">
                      ¿Te da error al abrir el enlace o no te sale «Instalar»?
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-900">
                      1. Arriba a la derecha de esta pantalla (en la barra superior de Google AI Studio), pulsa el botón <strong>Compartir (Share / Publicar)</strong> para activar el enlace público, o el icono <strong>Abrir en pestaña nueva (↗)</strong>.
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-900">
                      2. Una vez activado el botón Compartir, abre este enlace en <strong>Google Chrome</strong>:
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-slate-800 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ¡Enlace público copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar enlace público (ais-pre)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  Instala <strong>ObraService</strong> en la pantalla de inicio de tu iPhone o iPad:
                </p>
                <ol className="space-y-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
                      1
                    </span>
                    <span>
                      Toca el botón <strong>Compartir</strong>{' '}
                      <Share className="inline h-4 w-4 text-blue-600" /> en la barra de Safari.
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
                      2
                    </span>
                    <span>
                      Desliza y selecciona <strong>Añadir a pantalla de inicio</strong>{' '}
                      <PlusSquare className="inline h-4 w-4 text-slate-800" />.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  Sigue estos <strong>2 pasos en Google Chrome (Android)</strong> para dejar el icono de <strong>ObraService</strong> instalado en tu pantalla de inicio:
                </p>
                <ol className="space-y-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950 mt-0.5">
                      1
                    </span>
                    <span>
                      Toca el botón de menú de <strong>3 puntos</strong>{' '}
                      <span className="inline-flex items-center justify-center rounded bg-slate-200 px-1 py-0.5 text-slate-900 font-bold">
                        <MoreVertical className="h-3.5 w-3.5 inline" />
                      </span>{' '}
                      arriba a la derecha en <strong>Google Chrome</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950 mt-0.5">
                      2
                    </span>
                    <span>
                      Pulsa en <strong>«Instalar aplicación»</strong> o{' '}
                      <strong>«Añadir a pantalla de inicio»</strong>{' '}
                      <Download className="inline h-3.5 w-3.5 text-emerald-600" /> y confirma.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIOSPrompt(false)}
              className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-500 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
