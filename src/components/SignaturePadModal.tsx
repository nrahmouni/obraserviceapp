import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2, X, Sparkles } from 'lucide-react';

interface SignaturePadModalProps {
  title: string;
  subtitle: string;
  signerName: string;
  signerRoleLabel: string;
  albaranNumber?: string;
  defaultComment?: string;
  accentColor?: 'blue' | 'emerald' | 'amber';
  onConfirm: (signatureDataUrl: string, comments: string) => void;
  onCancel: () => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  title,
  subtitle,
  signerName,
  signerRoleLabel,
  albaranNumber,
  defaultComment = '',
  accentColor = 'emerald',
  onConfirm,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [comments, setComments] = useState(defaultComment);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize canvas with crisp baseline and high-DPI scaling
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle signature baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, canvas.height - 36);
    ctx.lineTo(canvas.width - 24, canvas.height - 36);
    ctx.stroke();

    // Configure pen style
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    initCanvas();
  }, []);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
    setErrorMsg(null);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    setHasDrawn(false);
    setErrorMsg(null);
  };

  // Helper to generate a clean rubric stamp if the user is on a device without touch/mouse convenience
  const handleGenerateRubric = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    initCanvas();
    ctx.save();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(60, 110);
    ctx.bezierCurveTo(110, 45, 160, 135, 220, 75);
    ctx.bezierCurveTo(260, 40, 310, 115, 390, 65);
    ctx.quadraticCurveTo(240, 130, 110, 125);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic bold 16px sans-serif';
    ctx.fillText(`Firmado: ${signerName.split('(')[0].trim()}`, 70, 142);
    ctx.restore();

    setHasDrawn(true);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDrawn) {
      setErrorMsg('Por favor, dibuja tu firma con el dedo o el ratón en el recuadro antes de confirmar.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl, comments.trim() || defaultComment);
  };

  const buttonColorClass =
    accentColor === 'blue'
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : accentColor === 'amber'
      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950'
      : 'bg-emerald-600 hover:bg-emerald-700 text-white';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-slate-200 overflow-hidden">
        {/* Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Firma Digital Táctil en Obra
                </span>
                {albaranNumber && (
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {albaranNumber}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white leading-tight">{title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">{subtitle}</p>

          {/* Signer Info Badge */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Firmante Autorizado ({signerRoleLabel})
              </span>
              <span className="font-black text-slate-900">{signerName}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {new Date().toLocaleDateString('es-ES')}
            </span>
          </div>

          {/* Touch Signature Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-amber-600" />
                <span>Dibuja tu firma aquí (con el dedo o ratón):</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateRubric}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Insertar rúbrica digital rápida"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Rúbrica Rápida</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Borrar</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={460}
                height={170}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[165px] touch-none cursor-crosshair block"
              />
              {!hasDrawn && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium select-none">
                  Firma con el dedo dentro de este recuadro
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600">{errorMsg}</p>
            )}
          </div>

          {/* Optional Comments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones / Conformidad de Firma:
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ej. Visto bueno y conforme con las unidades (Ud.) ejecutadas en obra..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer ${buttonColorClass}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar y Estampar Firma</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
