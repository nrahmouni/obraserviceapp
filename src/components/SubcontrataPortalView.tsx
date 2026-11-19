import React, { useState, useEffect, useRef } from 'react';
import {
  Subcontrata,
  Worker,
  AlbaranDiario,
  ObraProject,
} from '../types';
import {
  getMonthYearString,
  getMonthKey,
  getCurrentMonthKey,
  formatDayHeader,
} from '../utils/dateUtils';
import { DayCalendarBar, groupAlbaranesByDay } from './DayCalendarBar';
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Building2,
  FileText,
  AlertTriangle,
  Check,
  X,
  Phone,
  ShieldCheck,
  Send,
  Eye,
  Folder,
  Calendar,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  PenTool,
  Camera,
} from 'lucide-react';
import { SignaturePadModal } from './SignaturePadModal';

interface SubcontrataPortalViewProps {
  subcontrata: Subcontrata;
  obras: ObraProject[];
  workers: Worker[];
  albaranes: AlbaranDiario[];
  onAddWorker: (worker: Worker) => void;
  onDeleteWorker: (workerId: string) => void;
  onValidateAlbaran: (
    albaranId: string,
    approved: boolean,
    reviewerName: string,
    comments?: string,
    signatureDataUrl?: string
  ) => void;
  onViewAlbaranDetail: (albaran: AlbaranDiario) => void;
  onOpenResumenAcumulado?: (obraId?: string) => void;
}

export const SubcontrataPortalView: React.FC<SubcontrataPortalViewProps> = ({
  subcontrata,
  obras,
  workers,
  albaranes,
  onAddWorker,
  onDeleteWorker,
  onValidateAlbaran,
  onViewAlbaranDetail,
  onOpenResumenAcumulado,
}) => {
  const [activeTab, setActiveTab] = useState<'albaranes' | 'trabajadores' | 'obras'>('albaranes');
  const [isAddingWorker, setIsAddingWorker] = useState(false);

  // New worker form state
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerDni, setNewWorkerDni] = useState('');
  const [newWorkerCategory, setNewWorkerCategory] = useState<Worker['category']>('Oficial 1ª');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');

  // Discrepancy modal state
  const [discrepancyAlbaranId, setDiscrepancyAlbaranId] = useState<string | null>(null);
  const [discrepancyComment, setDiscrepancyComment] = useState('');

  // Touch Signature modal state for Visto Bueno
  const [signingAlbaran, setSigningAlbaran] = useState<AlbaranDiario | null>(null);

  // Filter workers of this subcontrata
  const myWorkers = workers.filter((w) => w.subcontrataId === subcontrata.id);

  // Filter albaranes belonging to this subcontrata
  const myAlbaranes = albaranes.filter((a) => a.subcontrataId === subcontrata.id);

  // Obras assigned to this subcontrata
  const myObras = obras.filter((o) => subcontrata.assignedProjectIds.includes(o.id));

  // Total pending albaranes across ALL obras and months for this subcontrata
  const allPendingAlbaranes = myAlbaranes.filter(
    (a) => a.status === 'pendiente_subcontrata'
  );

  // Hierarchy filter state: Obra first, then Month
  const [selectedObraFilter, setSelectedObraFilter] = useState<string>(
    () => allPendingAlbaranes[0]?.projectId || myObras[0]?.id || ''
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const initialObraId = allPendingAlbaranes[0]?.projectId || myObras[0]?.id || '';
    const initialMonths = Array.from(
      new Set(
        myAlbaranes
          .filter((a) => a.projectId === initialObraId)
          .map((a) => getMonthKey(a.date))
      )
    )
      .sort()
      .reverse();
    return initialMonths[0] || getCurrentMonthKey();
  });
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const knownAlbaranIdsRef = useRef<Set<string>>(new Set(myAlbaranes.map((a) => a.id)));

  // Auto-sync obra/month when Firestore loads or a brand-new real-time albarán arrives
  useEffect(() => {
    if (!selectedObraFilter && myObras.length > 0) {
      const targetObraId = allPendingAlbaranes[0]?.projectId || myObras[0].id;
      setSelectedObraFilter(targetObraId);
    }

    // Detect brand-new incoming pending albaranes arriving via real-time onSnapshot
    const newlyArrivedPending = myAlbaranes.filter(
      (a) => a.status === 'pendiente_subcontrata' && !knownAlbaranIdsRef.current.has(a.id)
    );
    knownAlbaranIdsRef.current = new Set(myAlbaranes.map((a) => a.id));

    if (newlyArrivedPending.length > 0) {
      const latestIncoming = newlyArrivedPending[0];
      setSelectedObraFilter(latestIncoming.projectId);
      setSelectedMonthKey(getMonthKey(latestIncoming.date));
      return;
    }

    const currentObraAlbaranes = myAlbaranes.filter(
      (a) => a.projectId === selectedObraFilter
    );
    const currentMonths = Array.from(
      new Set(currentObraAlbaranes.map((a) => getMonthKey(a.date)))
    )
      .sort()
      .reverse();

    if (currentMonths.length > 0 && !currentMonths.includes(selectedMonthKey)) {
      setSelectedMonthKey(currentMonths[0]);
      setSelectedDay('all');
    }
  }, [myAlbaranes, myObras, selectedObraFilter, selectedMonthKey, allPendingAlbaranes]);

  // Filtered by selected Obra and Month
  const obraAlbaranes = myAlbaranes.filter(
    (a) => a.projectId === selectedObraFilter
  );

  const monthAlbaranes = obraAlbaranes.filter(
    (a) => getMonthKey(a.date) === selectedMonthKey
  );

  const visibleMonthAlbaranes =
    selectedDay === 'all'
      ? monthAlbaranes
      : monthAlbaranes.filter((a) => a.date === selectedDay);

  const dayGroups = groupAlbaranesByDay(visibleMonthAlbaranes);

  const pendingAlbaranes = monthAlbaranes.filter(
    (a) => a.status === 'pendiente_subcontrata'
  );
  const validatedAlbaranes = monthAlbaranes.filter(
    (a) => a.status === 'validado_subcontrata' || a.status === 'aprobado_final'
  );

  // Available months for this subcontrata in the chosen obra
  const availableMonths = Array.from(
    new Set(obraAlbaranes.map((a) => getMonthKey(a.date)))
  ).sort().reverse();

  if (availableMonths.length === 0) {
    availableMonths.push(getCurrentMonthKey());
  }

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerDni.trim()) return;

    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      subcontrataId: subcontrata.id,
      subcontrataName: subcontrata.companyName,
      name: newWorkerName.trim(),
      dni: newWorkerDni.trim().toUpperCase(),
      category: newWorkerCategory,
      phone: newWorkerPhone.trim() || undefined,
      active: true,
    };

    onAddWorker(newWorker);
    setIsAddingWorker(false);
    setNewWorkerName('');
    setNewWorkerDni('');
    setNewWorkerPhone('');
  };

  const handleApproveAlbaran = (alb: AlbaranDiario) => {
    setSigningAlbaran(alb);
  };

  const handleConfirmSignature = (signatureDataUrl: string, comments: string) => {
    if (!signingAlbaran) return;
    onValidateAlbaran(
      signingAlbaran.id,
      true,
      `${subcontrata.contactPerson} (${subcontrata.companyName})`,
      comments || 'Visto Bueno y conformidad con las unidades (Ud.) registradas.',
      signatureDataUrl
    );
    setSigningAlbaran(null);
  };

  const handleReportDiscrepancySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyAlbaranId) return;

    onValidateAlbaran(
      discrepancyAlbaranId,
      false,
      `${subcontrata.contactPerson} (${subcontrata.companyName})`,
      discrepancyComment.trim() || 'Discrepancia en las unidades (Ud.) de operarios.'
    );

    setDiscrepancyAlbaranId(null);
    setDiscrepancyComment('');
  };

  return (
    <div className="space-y-6">
      {/* Subcontrata Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-blue-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-blue-300">
                Portal de la Subcontrata
              </span>
              <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-200 font-mono">
                CIF: {subcontrata.cif}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              {subcontrata.companyName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Especialidad: <span className="font-semibold text-amber-400">{subcontrata.trade}</span> · Contacto:{' '}
              {subcontrata.contactPerson} ({subcontrata.phone})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(selectedObraFilter)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer border border-amber-300"
              title="Unificar partes por rango de fechas (ej. del 1 al 25) y ver unidades (Ud.) de oficiales y peones"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
              <span>Unificar & Hoja Resumen Acumulado</span>
            </button>

            <button
              onClick={() => setIsAddingWorker(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Trabajador</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar text-xs font-bold">
        <button
          onClick={() => setActiveTab('albaranes')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'albaranes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Albaranes Diarios Recibidos</span>
          {allPendingAlbaranes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {allPendingAlbaranes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('trabajadores')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'trabajadores'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nuestra Plantilla de Trabajadores ({myWorkers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('obras')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'obras'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Obras Adjudicadas ({myObras.length})</span>
        </button>
      </div>

      {/* TAB 1: ALBARANES DIARIOS RECIBIDOS (VERIFICACIÓN SUBCONTRATA) */}
      {activeTab === 'albaranes' && (
        <div className="space-y-6">
          {/* Obra and Month Navigation Filter */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
            <div>
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider block mb-2">
                1. Selecciona la Obra:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {myObras.map((o) => {
                  const isSelected = selectedObraFilter === o.id;
                  const countPendingInThisObra = myAlbaranes.filter(
                    (a) => a.projectId === o.id && a.status === 'pendiente_subcontrata'
                  ).length;

                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedObraFilter(o.id);
                        const mKeys = Array.from(
                          new Set(
                            myAlbaranes
                              .filter((a) => a.projectId === o.id)
                              .map((a) => getMonthKey(a.date))
                          )
                        ).sort().reverse();
                        setSelectedMonthKey(mKeys[0] || getCurrentMonthKey());
                        setSelectedDay('all');
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-black shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="text-xs block truncate">{o.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {o.code}
                        </span>
                      </div>
                      {countPendingInThisObra > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                          {countPendingInThisObra} por validar
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meses en esa obra */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider block mb-2">
                2. Selecciona el Mes:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {availableMonths.map((mKey) => {
                  const isSelected = selectedMonthKey === mKey;
                  const monthName = getMonthYearString(`${mKey}-01`);
                  const monthParts = obraAlbaranes.filter(
                    (a) => getMonthKey(a.date) === mKey
                  );
                  const albCount = monthParts.length;
                  const pendingInM = monthParts.filter(
                    (a) => a.status === 'pendiente_subcontrata'
                  ).length;

                  return (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => {
                        setSelectedMonthKey(mKey);
                        setSelectedDay('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white font-black shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{monthName}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {albCount}
                      </span>
                      {pendingInM > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                          {pendingInM} pend.
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pending albaranes in other obras/months alert */}
          {allPendingAlbaranes.length > pendingAlbaranes.length && (() => {
            const otherPending = allPendingAlbaranes.find(
              (a) => a.projectId !== selectedObraFilter || getMonthKey(a.date) !== selectedMonthKey
            );
            if (!otherPending) return null;
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-blue-950">
                  <span className="font-black">
                    Tienes {allPendingAlbaranes.length - pendingAlbaranes.length} albarán(es) adicional(es) pendiente(s) de visto bueno
                  </span>{' '}
                  (ej. {otherPending.albaranNumber} en {otherPending.projectTitle} · {getMonthYearString(otherPending.date)}).
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedObraFilter(otherPending.projectId);
                    setSelectedMonthKey(getMonthKey(otherPending.date));
                    setSelectedDay(otherPending.date);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold whitespace-nowrap cursor-pointer"
                >
                  Ir al Albarán Pendiente →
                </button>
              </div>
            );
          })()}

          {/* Pending verification alert banner */}
          {pendingAlbaranes.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm mb-1">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>
                  Tienes {pendingAlbaranes.length} albarán(es) pendiente(s) de tu visto bueno en {getMonthYearString(`${selectedMonthKey}-01`)}
                </span>
              </div>
              <p className="text-xs text-amber-900">
                Los encargados de obra han registrado los operarios y unidades (Ud.) trabajadas. Por favor, revisa cada albarán y haz clic en "Dar Visto Bueno" para que pase a la aprobación final del Jefe de Obra.
              </p>
            </div>
          )}

          {/* Barra de Días + Calendario del Mes */}
          <DayCalendarBar
            monthKey={selectedMonthKey}
            albaranes={monthAlbaranes}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            accentColor="blue"
          />

          {/* Partes Segmentados por Día */}
          <div className="space-y-6">
            {dayGroups.map((group) => {
              const sortedAlbs = [...group.albaranes].sort((a, b) => {
                const rank = (s: AlbaranDiario['status']) =>
                  s === 'pendiente_subcontrata' ? 0 : 1;
                return rank(a.status) - rank(b.status);
              });

              return (
                <div key={group.date} className="space-y-3">
                  {/* Day Header */}
                  <div className="bg-blue-950 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-300 shrink-0" />
                      <span className="text-xs sm:text-sm font-black capitalize">
                        {formatDayHeader(group.date)}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-200">
                      {group.albaranes.length} {group.albaranes.length === 1 ? 'parte' : 'partes'} · {group.totalUd} Ud.
                    </span>
                  </div>

                  {sortedAlbs.map((alb) => {
                    if (alb.status === 'pendiente_subcontrata') {
                      return (
                        <div
                          key={alb.id}
                          className="bg-white rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-sm text-slate-950">
                                  {alb.albaranNumber}
                                </span>
                                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                                  Paso 2: Requiere tu Visto Bueno
                                </span>
                                {alb.rectification && (
                                  <span className="text-[11px] font-black text-rose-900 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                                    Rectificado por Encargado (antes {alb.rectification.previousTotalHours} Ud.)
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-extrabold text-slate-900 mt-1">
                                Obra: {alb.projectTitle}
                              </p>
                              <p className="text-xs text-slate-500">
                                Emitido por: {alb.createdByEncargadoName} · Zona: {alb.tajoZone}
                              </p>
                              {alb.rectification && (
                                <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 mt-1.5 inline-block">
                                  Motivo de rectificación: {alb.rectification.reason}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-xs text-slate-400 block">Total Unidades</span>
                              <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                                {alb.totalHours} Ud.
                              </span>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Trabajadores registrados en este parte:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              {alb.workers.map((w, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                                >
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-slate-900">{w.workerName}</span>
                                    <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                      {w.hours} Ud.
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    {w.workerCategory}
                                  </span>
                                  {w.taskDescription && (
                                    <p className="text-[11px] text-slate-600 mt-1 italic">
                                      "{w.taskDescription}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {alb.generalNotes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-700">Nota del Encargado:</span>{' '}
                              {alb.generalNotes}
                            </p>
                          )}

                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <button
                              onClick={() => onViewAlbaranDetail(alb)}
                              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver Albarán Completo / Imprimir</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setDiscrepancyAlbaranId(alb.id)}
                                className="px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              >
                                Reportar Discrepancia
                              </button>

                              <button
                                onClick={() => handleApproveAlbaran(alb)}
                                className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <PenTool className="w-4 h-4" />
                                <span>✓ Dar Visto Bueno y Firmar Albarán</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={alb.id}
                        onClick={() => onViewAlbaranDetail(alb)}
                        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {alb.albaranNumber}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                alb.status === 'aprobado_final'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}
                            >
                              {alb.status === 'aprobado_final'
                                ? 'Aprobado Final por Jefe de Obra'
                                : 'Validado por Subcontrata (Esperando Jefe de Obra)'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 mt-1">
                            {alb.projectTitle} · {alb.workers.length} trabajadores ({alb.totalHours} Ud.)
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold text-blue-700 hover:underline">
                            Ver Ficha →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {dayGroups.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">No hay partes en este día o periodo.</p>
                <p className="text-slate-400 mt-0.5">
                  Cuando el encargado introduzca trabajadores en la obra, aparecerán aquí automáticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GESTIÓN DE TRABAJADORES DE LA SUBCONTRATA */}
      {activeTab === 'trabajadores' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Plantilla Oficial de {subcontrata.companyName}
              </h2>
              <p className="text-xs text-slate-500">
                Estos trabajadores son los que aparecen en la lista del encargado de obra para imputar unidades (Ud.) diarias.
              </p>
            </div>

            <button
              onClick={() => setIsAddingWorker(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Alta de Nuevo Trabajador</span>
            </button>
          </div>

          {/* Modal / Inline Add Worker Form */}
          {isAddingWorker && (
            <form
              onSubmit={handleCreateWorker}
              className="bg-blue-50/70 border-2 border-blue-300 p-6 rounded-2xl space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <span className="text-sm font-black text-blue-950">
                  Alta de Trabajador para las Obras
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingWorker(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Nombre Completo del Operario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Sergio Ramos Martínez"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    DNI / NIE
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 53891044A"
                    value={newWorkerDni}
                    onChange={(e) => setNewWorkerDni(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Categoría Profesional
                  </label>
                  <select
                    value={newWorkerCategory}
                    onChange={(e) =>
                      setNewWorkerCategory(e.target.value as Worker['category'])
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Oficial 1ª">Oficial 1ª</option>
                    <option value="Oficial 2ª">Oficial 2ª</option>
                    <option value="Peón Especialista">Peón Especialista</option>
                    <option value="Peón Ordinario">Peón Ordinario</option>
                    <option value="Encargado Subcontrata">Encargado Subcontrata</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={newWorkerPhone}
                    onChange={(e) => setNewWorkerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingWorker(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow"
                >
                  Guardar Trabajador en Plantilla
                </button>
              </div>
            </form>
          )}

          {/* Workers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myWorkers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full">
                      {worker.category}
                    </span>
                    <button
                      onClick={() => onDeleteWorker(worker.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                      title="Eliminar de la plantilla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">
                    {worker.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    DNI: {worker.dni}
                  </p>
                  {worker.phone && (
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {worker.phone}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Activo en obras
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OBRAS ADJUDICADAS */}
      {activeTab === 'obras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myObras.map((obra) => (
            <div
              key={obra.id}
              className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  {obra.code}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {obra.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {obra.address}, {obra.city}
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700">
                  <p>
                    <span className="font-bold">Jefe de Obra (Constructora):</span>{' '}
                    {obra.jefeObraName}
                  </p>
                  <p>
                    <span className="font-bold">Encargado a pie de obra:</span>{' '}
                    {obra.encargadoName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Touch Signature Modal for Subcontrata Visto Bueno */}
      {signingAlbaran && (
        <SignaturePadModal
          title="Firma de Visto Bueno (Subcontrata)"
          subtitle={`Valida y firma las ${signingAlbaran.totalHours} Unidades (Ud.) registradas para ${signingAlbaran.workers.length} trabajadores en ${signingAlbaran.projectTitle}.`}
          signerName={`${subcontrata.contactPerson} (${subcontrata.companyName})`}
          signerRoleLabel="Responsable de Subcontrata"
          albaranNumber={signingAlbaran.albaranNumber}
          defaultComment="Visto Bueno y conformidad con las unidades (Ud.) registradas."
          accentColor="blue"
          onConfirm={handleConfirmSignature}
          onCancel={() => setSigningAlbaran(null)}
        />
      )}

      {/* Discrepancy Modal */}
      {discrepancyAlbaranId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Reportar Discrepancia en Albarán
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Indica el motivo por el cual no coincide con tu registro (ej. unidades (Ud.) incorrectas o falta de operario). El encargado y el jefe de obra recibirán la notificación.
            </p>

            <form onSubmit={handleReportDiscrepancySubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={discrepancyComment}
                onChange={(e) => setDiscrepancyComment(e.target.value)}
                placeholder="Escribe la observación detallada..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300"
              />

              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDiscrepancyAlbaranId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow"
                >
                  Enviar Discrepancia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
