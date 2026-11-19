import React, { useState, useEffect, useRef } from 'react';
import {
  AlbaranDiario,
  ObraProject,
  Subcontrata,
} from '../types';
import {
  getMonthYearString,
  getMonthKey,
  getCurrentMonthKey,
  formatDayHeader,
} from '../utils/dateUtils';
import { DayCalendarBar, groupAlbaranesByDay } from './DayCalendarBar';
import {
  Folder,
  FolderOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  ArrowLeft,
  ArrowRight,
  Printer,
  FileCheck,
  HardHat,
  Users,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  PenTool,
} from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';

interface JefeObraApprovalViewProps {
  obras: ObraProject[];
  subcontratas: Subcontrata[];
  albaranes: AlbaranDiario[];
  onFinalApproveAlbaran: (
    albaranId: string,
    jefeName: string,
    comments?: string,
    signatureDataUrl?: string
  ) => void;
  onViewAlbaranDetail: (albaran: AlbaranDiario) => void;
  onOpenResumenAcumulado?: (obraId?: string) => void;
}

export const JefeObraApprovalView: React.FC<JefeObraApprovalViewProps> = ({
  obras,
  subcontratas,
  albaranes,
  onFinalApproveAlbaran,
  onViewAlbaranDetail,
  onOpenResumenAcumulado,
}) => {
  const jefeName = 'Javier Aranda (Jefe de Obra)';

  // Hierarchy Navigation State:
  // Level 1: selectedObraId === null -> Shows Obra Folders
  // Level 2: selectedObraId !== null -> Shows Months inside that Obra
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string>('all');

  // Selected Month key (e.g. '2026-11')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Touch Signature modal state for Final Certification
  const [signingAlbaran, setSigningAlbaran] = useState<AlbaranDiario | null>(null);

  const knownAlbaranIdsRef = useRef<Set<string>>(new Set(albaranes.map((a) => a.id)));

  const activeObra = obras.find((o) => o.id === selectedObraId);

  // Albaranes strictly belonging to the active obra
  const obraAlbaranes = selectedObraId
    ? albaranes.filter((a) => a.projectId === selectedObraId)
    : [];

  // Group the active obra's albaranes by month
  const monthsMap = new Map<string, AlbaranDiario[]>();
  obraAlbaranes.forEach((alb) => {
    const mKey = getMonthKey(alb.date);
    const existing = monthsMap.get(mKey) || [];
    monthsMap.set(mKey, [...existing, alb]);
  });

  // Ensure default current month exists if empty
  if (monthsMap.size === 0 && selectedObraId) {
    monthsMap.set(getCurrentMonthKey(), []);
  }

  // Sorted list of months available in this obra
  const availableMonths = Array.from(monthsMap.keys()).sort().reverse();

  // Auto-sync month when real-time albaranes arrive for the selected obra
  useEffect(() => {
    const newAlbs = albaranes.filter((a) => !knownAlbaranIdsRef.current.has(a.id));
    knownAlbaranIdsRef.current = new Set(albaranes.map((a) => a.id));

    if (!selectedObraId) return;

    const newInSelectedObra = newAlbs.find((a) => a.projectId === selectedObraId);
    if (newInSelectedObra) {
      setSelectedMonthKey(getMonthKey(newInSelectedObra.date));
      return;
    }

    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonthKey)) {
      setSelectedMonthKey(availableMonths[0]);
      setSelectedDay('all');
    }
  }, [albaranes, selectedObraId, availableMonths, selectedMonthKey]);

  // Subcontratas participating in this obra
  const subsInObra = activeObra
    ? Array.from(
        new Set([
          ...activeObra.subcontrataIds.filter(Boolean),
          ...obraAlbaranes.map((a) => a.subcontrataId),
        ])
      )
        .map((id) => subcontratas.find((s) => s.id === id))
        .filter((s): s is Subcontrata => Boolean(s))
    : [];

  // Albaranes of the selected month (filtered by Subcontrata first, then by Day)
  const rawMonthAlbaranes = monthsMap.get(selectedMonthKey) || [];
  const currentMonthAlbaranes =
    selectedSubId === 'all'
      ? rawMonthAlbaranes
      : rawMonthAlbaranes.filter((a) => a.subcontrataId === selectedSubId);

  const visibleDayAlbaranes =
    selectedDay === 'all'
      ? currentMonthAlbaranes
      : currentMonthAlbaranes.filter((a) => a.date === selectedDay);

  const dayGroups = groupAlbaranesByDay(visibleDayAlbaranes);

  const totalHoursInMonth = currentMonthAlbaranes.reduce(
    (sum, a) => sum + a.totalHours,
    0
  );

  const handleApproveFinal = (alb: AlbaranDiario) => {
    setSigningAlbaran(alb);
  };

  const handleConfirmFinalSignature = (signatureDataUrl: string, comments: string) => {
    if (!signingAlbaran) return;
    onFinalApproveAlbaran(
      signingAlbaran.id,
      jefeName,
      comments || 'Aprobado y verificado técnicamente en obra. Parte certificado y archivado.',
      signatureDataUrl
    );
    setSigningAlbaran(null);
  };

  return (
    <div className="space-y-6">
      {/* Jefe de Obra Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-emerald-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                Jefatura de Obra · Archivo Central de Albaranes
              </span>
              <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                Organizado por Obras y Meses
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              {selectedObraId && activeObra ? activeObra.title : 'Mis Obras Asignadas'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Jefe de Obra: <span className="font-bold text-white">{jefeName}</span>
              {selectedObraId && activeObra && (
                <> · Encargado a pie de obra: <span className="font-semibold text-amber-400">{activeObra.encargadoName}</span></>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(selectedObraId || undefined)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 transition-colors shadow-sm cursor-pointer"
              title="Generar resumen unificado de unidades (Ud.) de oficial y peón por rango de fechas"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
              <span>Unificar & Hoja Resumen (Oficial / Peón)</span>
            </button>

            {selectedObraId && (
              <button
                onClick={() => setSelectedObraId(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors self-start sm:self-auto cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Volver a Todas mis Obras</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* NIVEL 1: CARPETAS DE OBRAS (Nada de albaranes sueltos) */}
      {/* ============================================================ */}
      {!selectedObraId && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Carpetas de Obras en Ejecución
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona la obra que deseas consultar para ver sus partes y albaranes archivados por meses.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
              {obras.length} Obras en Supervisión
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {obras.map((obra) => {
              // Count total albaranes and pending final approvals for this specific obra
              const thisObraAlbaranes = albaranes.filter((a) => a.projectId === obra.id);
              const pendingCount = thisObraAlbaranes.filter(
                (a) => a.status === 'validado_subcontrata'
              ).length;
              const awaitingSubCount = thisObraAlbaranes.filter(
                (a) => a.status === 'pendiente_subcontrata'
              ).length;
              const totalHours = thisObraAlbaranes.reduce(
                (sum, a) => sum + a.totalHours,
                0
              );

              return (
                <div
                  key={obra.id}
                  onClick={() => {
                    setSelectedObraId(obra.id);
                    setSelectedSubId('all');
                    setSelectedDay('all');
                    // Select most recent month of this obra
                    const mKeys = Array.from(
                      new Set(thisObraAlbaranes.map((a) => getMonthKey(a.date)))
                    ).sort().reverse();
                    setSelectedMonthKey(mKeys[0] || getCurrentMonthKey());
                  }}
                  className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-500 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Folder Icon Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                        <Folder className="w-6 h-6 stroke-[2.2]" />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {pendingCount > 0 ? (
                          <span className="text-[11px] font-extrabold bg-amber-100 border border-amber-300 text-amber-950 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>{pendingCount} por firmar</span>
                          </span>
                        ) : awaitingSubCount === 0 ? (
                          <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Al día</span>
                          </span>
                        ) : null}

                        {awaitingSubCount > 0 && (
                          <span className="text-[11px] font-bold bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>{awaitingSubCount} en revisión subcontrata</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-emerald-700">
                      {obra.code}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-950 leading-snug mt-0.5">
                      {obra.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {obra.address}, {obra.city}
                    </p>

                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <p>
                        <span className="font-bold text-slate-800">Encargado:</span>{' '}
                        {obra.encargadoName}
                      </p>
                      <p>
                        <span className="font-bold text-slate-800">Subcontratas:</span>{' '}
                        {obra.subcontrataIds.length} empresas en tajo
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 group-hover:border-emerald-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {totalHours} Ud.
                      </span>{' '}
                      <span className="text-slate-400 font-medium">
                        ({thisObraAlbaranes.length} albaranes)
                      </span>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1 shadow-xs">
                      <span>Abrir Obra</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* NIVEL 2 Y 3: CARPETAS POR MESES DENTRO DE LA OBRA SELECCIONADA */}
      {/* ============================================================ */}
      {selectedObraId && activeObra && (
        <div className="space-y-6">
          {/* Obra breadcrumb & Month Selector Navigation */}
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {activeObra.code}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                      Obra Abierta
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    {activeObra.title}
                  </h2>
                </div>
              </div>

              {/* Total hours in active obra */}
              <div className="text-right flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-left">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Total Acumulado Obra
                  </span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    {obraAlbaranes.reduce((s, a) => s + a.totalHours, 0)} Ud.
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de SUBCONTRATA EN LA OBRA */}
            <div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                1. Subcontrata en Obra:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubId('all');
                    setSelectedDay('all');
                  }}
                  className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
                    selectedSubId === 'all'
                      ? 'border-emerald-600 bg-emerald-600 text-white font-black shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                  }`}
                >
                  Todas ({rawMonthAlbaranes.length})
                </button>

                {subsInObra.map((sub) => {
                  const isSelected = selectedSubId === sub.id;
                  const countInSub = rawMonthAlbaranes.filter((a) => a.subcontrataId === sub.id).length;
                  const pendingInSub = rawMonthAlbaranes.filter(
                    (a) => a.subcontrataId === sub.id && a.status === 'validado_subcontrata'
                  ).length;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubId(sub.id);
                        setSelectedDay('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      <span>{sub.companyName}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
                        {countInSub}
                      </span>
                      {pendingInSub > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                          {pendingInSub} firm.
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de MESES (Carpetas Mensuales) */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                2. Selecciona el Mes de Trabajo:
              </span>

              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {availableMonths.map((mKey) => {
                  const isSelected = selectedMonthKey === mKey;
                  const monthName = getMonthYearString(`${mKey}-01`);
                  const albaranesInThisMonth = (monthsMap.get(mKey) || []).filter(
                    (a) => selectedSubId === 'all' || a.subcontrataId === selectedSubId
                  );
                  const pendingInThisMonth = albaranesInThisMonth.filter(
                    (a) => a.status === 'validado_subcontrata'
                  ).length;
                  const awaitingSubInMonthCount = albaranesInThisMonth.filter(
                    (a) => a.status === 'pendiente_subcontrata'
                  ).length;
                  const hoursInThisMonth = albaranesInThisMonth.reduce(
                    (s, a) => s + a.totalHours,
                    0
                  );

                  return (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => {
                        setSelectedMonthKey(mKey);
                        setSelectedDay('all');
                      }}
                      className={`px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      <Calendar className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <span className="text-sm block">{monthName}</span>
                        <span className="text-[11px] font-mono font-medium text-slate-500 block">
                          {albaranesInThisMonth.length} partes · {hoursInThisMonth} Ud.
                        </span>
                      </div>

                      {pendingInThisMonth > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black ml-1">
                          {pendingInThisMonth} por firmar
                        </span>
                      )}
                      {pendingInThisMonth === 0 && awaitingSubInMonthCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-black ml-1">
                          {awaitingSubInMonthCount} en subcontrata
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BARRA DE DÍAS / CALENDARIO Y PARTES SEGMENTADOS POR DÍA */}
          {/* ============================================================ */}
          <div className="space-y-5">
            {/* Header del Mes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Albaranes de {getMonthYearString(`${selectedMonthKey}-01`)}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentMonthAlbaranes.length} albaranes registrados en este periodo ({totalHoursInMonth} Unidades (Ud.) totales)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(selectedObraId || undefined)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs transition-colors cursor-pointer"
                  title="Unificar partes por rango de fechas (ej. del 1 al 25) y ver unidades (Ud.) de oficiales y peones"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Resumen por Rango de Fechas (ej. 1 al 25)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Certificación del Mes</span>
                </button>
              </div>
            </div>

            {/* Barra de Días + Calendario del Mes */}
            <DayCalendarBar
              monthKey={selectedMonthKey}
              albaranes={currentMonthAlbaranes}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              accentColor="emerald"
            />

            {/* Lista de Partes Segmentada por Días */}
            <div className="space-y-6">
              {dayGroups.map((group) => {
                // Inside each day, place pending-for-signature first, then approved, then waiting subcontrata
                const sortedAlbs = [...group.albaranes].sort((a, b) => {
                  const rank = (s: AlbaranDiario['status']) =>
                    s === 'validado_subcontrata' ? 0 : s === 'aprobado_final' ? 1 : 2;
                  return rank(a.status) - rank(b.status);
                });

                return (
                  <div key={group.date} className="space-y-3">
                    {/* Day Section Header */}
                    <div className="bg-emerald-950 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span className="text-xs sm:text-sm font-black capitalize">
                          {formatDayHeader(group.date)}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-200">
                        {group.albaranes.length} {group.albaranes.length === 1 ? 'parte' : 'partes'} · {group.totalUd} Ud.
                      </span>
                    </div>

                    {sortedAlbs.map((alb) => {
                      if (alb.status === 'validado_subcontrata') {
                        return (
                          <div
                            key={alb.id}
                            className="bg-white rounded-2xl border-2 border-emerald-400 p-6 shadow-sm space-y-4 hover:border-emerald-500 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-sm text-slate-950">
                                    {alb.albaranNumber}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    Paso 3: Esperando tu Firma Final
                                  </span>
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                  Subcontrata:{' '}
                                  <span className="text-blue-700">{alb.subcontrataName}</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Zona: {alb.tajoZone} · Encargado emisor: {alb.createdByEncargadoName}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-slate-400 block font-medium">Total Unidades</span>
                                <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                                  {alb.totalHours} Ud.
                                </span>
                              </div>
                            </div>

                            {alb.subcontrataReview && (
                              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span>
                                    <span className="font-bold">Visto Bueno de la Subcontrata:</span>{' '}
                                    {alb.subcontrataReview.reviewedBy} ({alb.subcontrataReview.comments})
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-blue-700">
                                  {alb.subcontrataReview.date.split('T')[0]}
                                </span>
                              </div>
                            )}

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2 px-3">Operario</th>
                                    <th className="py-2 px-3">Categoría</th>
                                    <th className="py-2 px-3">Trabajo / Tajo Realizado</th>
                                    <th className="py-2 px-3 text-right">Unidades (Ud.)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {alb.workers.map((w, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-3 font-bold text-slate-900">
                                        {w.workerName}
                                      </td>
                                      <td className="py-2 px-3 text-slate-500">{w.workerCategory}</td>
                                      <td className="py-2 px-3 text-slate-700">{w.taskDescription}</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                                        {w.hours} Ud.
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                              <button
                                onClick={() => onViewAlbaranDetail(alb)}
                                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Ver Ficha Oficial / Imprimir</span>
                              </button>

                              <button
                                onClick={() => handleApproveFinal(alb)}
                                className="px-6 py-3 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <PenTool className="w-4 h-4 stroke-[2.5]" />
                                <span>✓ FIRMAR Y CERTIFICAR ALBARÁN</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      const isApproved = alb.status === 'aprobado_final';
                      return (
                        <div
                          key={alb.id}
                          onClick={() => onViewAlbaranDetail(alb)}
                          className={`bg-white p-4 rounded-xl border-2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                            isApproved
                              ? 'border-slate-200 hover:border-emerald-400'
                              : 'border-slate-200 hover:border-blue-300 opacity-90 hover:opacity-100'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {alb.albaranNumber}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                  isApproved
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}
                              >
                                {isApproved
                                  ? '✓ Certificado con Triple Firma'
                                  : `Paso 2: Esperando VºBº de ${alb.subcontrataName}`}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-1">
                              Subcontrata: <span className="font-bold">{alb.subcontrataName}</span> · {alb.workers.length} operarios ({alb.totalHours} Ud.)
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Zona: {alb.tajoZone} · Emitido por {alb.createdByEncargadoName}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-bold hover:underline ${
                                isApproved ? 'text-emerald-700' : 'text-slate-600'
                              }`}
                            >
                              {isApproved ? 'Ver Albarán →' : 'Consultar →'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {dayGroups.length === 0 && (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No hay albaranes registrados para esta selección.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Touch Signature Modal for Jefe de Obra Final Certification */}
      {signingAlbaran && (
        <SignaturePadModal
          title="Firma de Certificación Final (Jefe de Obra)"
          subtitle={`Aprueba definitivamente las ${signingAlbaran.totalHours} Unidades (Ud.) ejecutadas por ${signingAlbaran.subcontrataName} en ${signingAlbaran.projectTitle}.`}
          signerName={jefeName}
          signerRoleLabel="Jefe de Obra (Constructora)"
          albaranNumber={signingAlbaran.albaranNumber}
          defaultComment="Aprobado y verificado técnicamente en obra. Parte certificado y archivado."
          accentColor="emerald"
          onConfirm={handleConfirmFinalSignature}
          onCancel={() => setSigningAlbaran(null)}
        />
      )}
    </div>
  );
};
