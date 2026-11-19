import React, { useState } from 'react';
import { AlbaranDiario } from '../types';
import { CURRENT_CONSTRUCTORA } from '../data/mockData';
import { SignaturePadModal } from './SignaturePadModal';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PenTool,
  Camera,
} from 'lucide-react';

interface AlbaranDetailModalProps {
  albaran: AlbaranDiario;
  onClose: () => void;
  onValidateSubcontrata?: (albaranId: string, signatureDataUrl?: string, comments?: string) => void;
  onApproveJefeObra?: (albaranId: string, signatureDataUrl?: string, comments?: string) => void;
}

export const AlbaranDetailModal: React.FC<AlbaranDetailModalProps> = ({
  albaran,
  onClose,
  onValidateSubcontrata,
  onApproveJefeObra,
}) => {
  const [signingRole, setSigningRole] = useState<'subcontrata' | 'jefe_obra' | null>(null);

  const isDataUrl = (val?: string) => Boolean(val && val.startsWith('data:image/'));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 text-sm">
              {albaran.albaranNumber}
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              · Albarán Diario Oficial de Obra
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onValidateSubcontrata && albaran.status === 'pendiente_subcontrata' && (
              <button
                type="button"
                onClick={() => setSigningRole('subcontrata')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Firmar VºBº Subcontrata</span>
              </button>
            )}

            {onApproveJefeObra && albaran.status === 'validado_subcontrata' && (
              <button
                type="button"
                onClick={() => setSigningRole('jefe_obra')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Firmar y Certificar (Jefe Obra)</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Printable Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start gap-6 pb-6 border-b-2 border-slate-900">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                Empresa Constructora Principal
              </span>
              <h1 className="text-xl font-black text-slate-900">
                {CURRENT_CONSTRUCTORA.name}
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                CIF: {CURRENT_CONSTRUCTORA.cif} · {CURRENT_CONSTRUCTORA.address}
              </p>
              <p className="text-xs text-slate-600">
                Tel: {CURRENT_CONSTRUCTORA.phone} · {CURRENT_CONSTRUCTORA.email}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-amber-400 font-black text-xs uppercase tracking-wider rounded-lg font-mono">
                PARTE / ALBARÁN DIARIO
              </span>
              <p className="text-sm font-black font-mono text-slate-900 mt-2">
                Nº: {albaran.albaranNumber}
              </p>
              <p className="text-xs font-mono text-slate-600">
                Fecha: {albaran.date}
              </p>
            </div>
          </div>

          {/* Obra & Subcontrata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Datos de la Obra y Tajo
              </span>
              <p className="text-sm font-black text-slate-900">
                {albaran.projectTitle}
              </p>
              <p className="text-slate-600 mt-0.5">
                <span className="font-semibold">Zona / Tajo:</span> {albaran.tajoZone}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold">Encargado Emisor:</span>{' '}
                {albaran.createdByEncargadoName}
              </p>
            </div>

            <div>
              <span className="font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Subcontrata Adjudicataria
              </span>
              <p className="text-sm font-black text-blue-900">
                {albaran.subcontrataName}
              </p>
              <p className="text-slate-600 mt-0.5">
                <span className="font-semibold">Operarios imputados:</span>{' '}
                {albaran.workers.length} trabajadores
              </p>
              <p className="text-slate-600">
                <span className="font-semibold">Unidades computadas:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {albaran.totalHours} Unidades (Ud.)
                </span>
              </p>
            </div>
          </div>

          {/* Table of Workers */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Relación de Operarios y Unidades (Ud.) Imputadas:
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Nombre y Apellidos</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Descripción de Trabajos en Tajo</th>
                    <th className="py-2.5 px-3 text-right">Unidades (Ud.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {albaran.workers.map((w, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {w.workerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {w.workerCategory}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {w.taskDescription || 'Trabajos asignados en obra'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm tabular-nums">
                        {w.hours} Ud.
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 text-xs font-bold">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-slate-800">
                      TOTAL UNIDADES (Ud.) DEL ALBARÁN:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 text-base">
                      {albaran.totalHours} Ud.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes & Worksite Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {albaran.generalNotes && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">
                  Observaciones del Encargado:
                </span>
                <p className="text-slate-600 leading-relaxed">{albaran.generalNotes}</p>
              </div>
            )}

            {albaran.photoUrl && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>Evidencia Fotográfica del Tajo:</span>
                </span>
                <div className="rounded-lg overflow-hidden border border-slate-300 bg-white">
                  <img
                    src={albaran.photoUrl}
                    alt={`Foto de tajo ${albaran.tajoZone || ''}`}
                    className="w-full h-36 object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rectification audit banner */}
          {albaran.rectification && (
            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-amber-950 uppercase tracking-wider">
                  Albarán Rectificado por Encargado
                </span>
                <span className="font-mono font-bold text-amber-800 text-[11px]">
                  {albaran.rectification.rectifiedAt.replace('T', ' ').substring(0, 16)}
                </span>
              </div>
              <p className="text-amber-900">
                <span className="font-bold">Motivo:</span> {albaran.rectification.reason}
              </p>
              <p className="text-amber-800 text-[11px]">
                <span className="font-semibold">Encargado:</span> {albaran.rectification.rectifiedBy} ·{' '}
                <span className="font-semibold">Unidades anteriores:</span>{' '}
                <span className="font-mono font-bold">{albaran.rectification.previousTotalHours} Ud.</span>{' '}
                → <span className="font-mono font-bold">{albaran.totalHours} Ud.</span>
              </p>
            </div>
          )}

          {/* 3 Step Trazabilidad Digital (Firmas Manuscritas y Sello) */}
          <div className="pt-4 border-t-2 border-slate-300">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Trazabilidad y Firmas Digitales de Validación (3 Pasos Oficiales):
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Step 1: Encargado */}
              <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1. Creado por Encargado</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{albaran.createdByEncargadoName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {albaran.createdAt.replace('T', ' ').substring(0, 16)}
                  </p>

                  {isDataUrl(albaran.encargadoSignature) && (
                    <div className="mt-2 p-1.5 bg-white rounded-lg border border-slate-200">
                      <img
                        src={albaran.encargadoSignature}
                        alt="Firma Encargado"
                        className="h-12 mx-auto object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 font-mono text-[10px] text-emerald-700 font-bold">
                  ✓ Firma Verificada en Obra
                </div>
              </div>

              {/* Step 2: Subcontrata */}
              <div
                className={`p-3 rounded-xl border-2 flex flex-col justify-between ${
                  albaran.subcontrataReview?.approved
                    ? 'border-blue-300 bg-blue-50/60'
                    : 'border-dashed border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                    {albaran.subcontrataReview?.approved ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>2. VºBº Subcontrata</span>
                  </div>

                  {albaran.subcontrataReview?.approved ? (
                    <>
                      <p className="text-[11px] text-blue-800">
                        {albaran.subcontrataReview.reviewedBy}
                      </p>
                      <p className="text-[10px] text-blue-600 font-mono mt-0.5">
                        {albaran.subcontrataReview.date.replace('T', ' ').substring(0, 16)}
                      </p>
                      {isDataUrl(albaran.subcontrataReview.signature) && (
                        <div className="mt-2 p-1.5 bg-white rounded-lg border border-blue-200">
                          <img
                            src={albaran.subcontrataReview.signature}
                            alt="Firma Subcontrata"
                            className="h-12 mx-auto object-contain"
                          />
                        </div>
                      )}
                      <p className="text-[10px] italic text-blue-700 mt-1">
                        "{albaran.subcontrataReview.comments}"
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Pendiente de visto bueno por {albaran.subcontrataName}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-blue-200 font-mono text-[10px] font-bold">
                  {albaran.subcontrataReview?.approved ? (
                    <span className="text-blue-800">✓ Firma Digital Acreditada</span>
                  ) : (
                    <span className="text-slate-400">Sin validar</span>
                  )}
                </div>
              </div>

              {/* Step 3: Jefe de Obra */}
              <div
                className={`p-3 rounded-xl border-2 flex flex-col justify-between ${
                  albaran.jefeObraApproval?.approved
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-dashed border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-1">
                    {albaran.jefeObraApproval?.approved ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>3. Aprobación Jefe Obra</span>
                  </div>

                  {albaran.jefeObraApproval?.approved ? (
                    <>
                      <p className="text-[11px] text-emerald-900 font-semibold">
                        {albaran.jefeObraApproval.approvedBy}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                        {albaran.jefeObraApproval.date.replace('T', ' ').substring(0, 16)}
                      </p>
                      {isDataUrl(albaran.jefeObraApproval.signature) && (
                        <div className="mt-2 p-1.5 bg-white rounded-lg border border-emerald-200">
                          <img
                            src={albaran.jefeObraApproval.signature}
                            alt="Firma Jefe de Obra"
                            className="h-12 mx-auto object-contain"
                          />
                        </div>
                      )}
                      <p className="text-[10px] italic text-emerald-800 mt-1">
                        "{albaran.jefeObraApproval.comments}"
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Pendiente de aprobación técnica final
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-emerald-200 font-mono text-[10px] font-bold">
                  {albaran.jefeObraApproval?.approved ? (
                    <span className="text-emerald-800">✓ Certificado Técnico Final</span>
                  ) : (
                    <span className="text-slate-400">Pendiente de firma</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Touch Signature Modal triggered inside AlbaranDetailModal */}
      {signingRole === 'subcontrata' && onValidateSubcontrata && (
        <SignaturePadModal
          title="Firmar Visto Bueno (Subcontrata)"
          subtitle={`Valida las ${albaran.totalHours} Ud. del albarán ${albaran.albaranNumber}.`}
          signerName={albaran.subcontrataName}
          signerRoleLabel="Subcontrata"
          albaranNumber={albaran.albaranNumber}
          defaultComment="Visto Bueno y conformidad con las unidades (Ud.) registradas."
          accentColor="blue"
          onConfirm={(sigUrl, comments) => {
            onValidateSubcontrata(albaran.id, sigUrl, comments);
            setSigningRole(null);
          }}
          onCancel={() => setSigningRole(null)}
        />
      )}

      {signingRole === 'jefe_obra' && onApproveJefeObra && (
        <SignaturePadModal
          title="Firmar y Certificar Albarán (Jefe de Obra)"
          subtitle={`Certifica definitivamente las ${albaran.totalHours} Ud. del albarán ${albaran.albaranNumber}.`}
          signerName="Jefe de Obra"
          signerRoleLabel="Jefatura de Obra"
          albaranNumber={albaran.albaranNumber}
          defaultComment="Aprobado y verificado técnicamente en obra."
          accentColor="emerald"
          onConfirm={(sigUrl, comments) => {
            onApproveJefeObra(albaran.id, sigUrl, comments);
            setSigningRole(null);
          }}
          onCancel={() => setSigningRole(null)}
        />
      )}
    </div>
  );
};

