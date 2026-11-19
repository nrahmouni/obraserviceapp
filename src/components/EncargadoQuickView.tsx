import React, { useState } from 'react';
import {
  ObraProject,
  Subcontrata,
  Worker,
  AlbaranDiario,
  AlbaranWorkerLine,
} from '../types';
import {
  HardHat,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Check,
  Send,
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Briefcase,
  History,
  Folder,
  FolderOpen,
  FileSpreadsheet,
  Camera,
  Image as ImageIcon,
  Trash2,
  PenTool,
  Edit3,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getTodayDateKey,
  shiftDateKey,
  getMonthYearString,
  getMonthKey,
  getCurrentMonthKey,
  formatDayHeader,
} from '../utils/dateUtils';
import { DayCalendarBar, groupAlbaranesByDay } from './DayCalendarBar';
import { compressWorksitePhoto } from '../utils/imageCompressor';
import { SignaturePadModal } from './SignaturePadModal';

interface EncargadoQuickViewProps {
  obras: ObraProject[];
  subcontratas: Subcontrata[];
  workers: Worker[];
  albaranes: AlbaranDiario[];
  onSaveAlbaran: (albaran: AlbaranDiario) => void;
  onRectifyAlbaran?: (albaran: AlbaranDiario) => void;
  onViewAlbaranDetail: (albaran: AlbaranDiario) => void;
  onOpenResumenAcumulado?: (obraId?: string) => void;
}

type EncargadoStep = 'select_obra' | 'select_subcontrata' | 'select_workers' | 'success';

export const EncargadoQuickView: React.FC<EncargadoQuickViewProps> = ({
  obras,
  subcontratas,
  workers,
  albaranes,
  onSaveAlbaran,
  onRectifyAlbaran,
  onViewAlbaranDetail,
  onOpenResumenAcumulado,
}) => {
  const encargadoName = 'Manuel Gómez (Encargado)';
  const encargadoId = 'staff-enc-1';

  // Navigation step in encargado wizard
  const [currentStep, setCurrentStep] = useState<EncargadoStep>('select_obra');

  // Selected Obra
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const activeObra = obras.find((o) => o.id === selectedObraId);

  // Selected Subcontrata
  const [selectedSubcontrataId, setSelectedSubcontrataId] = useState<string>('');
  const activeSubcontrata = subcontratas.find((s) => s.id === selectedSubcontrataId);

  // Subcontratas filtered strictly by the selected obra
  const subcontratasInObra = subcontratas.filter((s) =>
    activeObra?.subcontrataIds.includes(s.id)
  );

  // Workers strictly of the selected subcontrata
  const availableWorkers = workers.filter(
    (w) => w.subcontrataId === selectedSubcontrataId && w.active
  );

  // Worker hours selection state: map of workerId -> { selected: boolean, hours: number, task: string }
  const [workerHours, setWorkerHours] = useState<
    Record<string, { selected: boolean; hours: number; task: string }>
  >({});

  const [date, setDate] = useState<string>(() => getTodayDateKey());
  const [tajoZone, setTajoZone] = useState<string>('Planta 2ª - Forjado Bloque A');
  const [generalNotes, setGeneralNotes] = useState<string>(
    'Jornada completada según plan de obra y medidas de seguridad.'
  );

  // Worksite Photo (Camera or Gallery) & Encargado Digital Signature
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [encargadoSignatureUrl, setEncargadoSignatureUrl] = useState<string>('');
  const [isSigningModalOpen, setIsSigningModalOpen] = useState<boolean>(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Last submitted albaran to display in success screen
  const [lastSubmittedAlbaran, setLastSubmittedAlbaran] =
    useState<AlbaranDiario | null>(null);

  // Active main tab: create | rectify | history
  const [activeTab, setActiveTab] = useState<'create' | 'rectify' | 'history'>('create');
  const [historyObraId, setHistoryObraId] = useState<string | null>(null);
  const [historySubId, setHistorySubId] = useState<string>('all');
  const [historyMonthKey, setHistoryMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [historyDay, setHistoryDay] = useState<string>('all');

  // Rectificar Albarán Ya Validado state (3-step wizard mirroring Nuevo Albarán)
  const [rectifyStep, setRectifyStep] = useState<
    'select_obra' | 'select_subcontrata' | 'select_day' | 'edit_albaran' | 'success'
  >('select_obra');
  const [rectifySelectedObraId, setRectifySelectedObraId] = useState<string>('');
  const [rectifySelectedSubId, setRectifySelectedSubId] = useState<string>('');
  const [rectifyMonthKey, setRectifyMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [rectifyDay, setRectifyDay] = useState<string>('all');
  const [rectifyingAlbaran, setRectifyingAlbaran] = useState<AlbaranDiario | null>(null);
  const [rectifyWorkerHours, setRectifyWorkerHours] = useState<
    Record<string, { selected: boolean; hours: number; task: string }>
  >({});
  const [rectifyDate, setRectifyDate] = useState<string>('');
  const [rectifyTajoZone, setRectifyTajoZone] = useState<string>('');
  const [rectifyNotes, setRectifyNotes] = useState<string>('');
  const [rectifyPhotoUrl, setRectifyPhotoUrl] = useState<string>('');
  const [isRectifyCompressingPhoto, setIsRectifyCompressingPhoto] = useState<boolean>(false);
  const [rectifyReason, setRectifyReason] = useState<string>('Error en unidades (Ud.)');
  const [rectifyValidationError, setRectifyValidationError] = useState<string | null>(null);
  const [isRectifySigningOpen, setIsRectifySigningOpen] = useState<boolean>(false);
  const [rectifySuccessAlbaran, setRectifySuccessAlbaran] = useState<AlbaranDiario | null>(null);

  // Helper for worker state
  const getWorkerState = (wId: string) => {
    return (
      workerHours[wId] || {
        selected: false,
        hours: 9,
        task: '',
      }
    );
  };

  const toggleWorkerSelection = (wId: string) => {
    const current = getWorkerState(wId);
    setWorkerHours({
      ...workerHours,
      [wId]: {
        ...current,
        selected: !current.selected,
      },
    });
    setFormValidationError(null);
  };

  const updateWorkerHours = (wId: string, hours: number) => {
    const current = getWorkerState(wId);
    setWorkerHours({
      ...workerHours,
      [wId]: {
        ...current,
        hours: Math.max(1, Math.min(16, hours)),
        selected: true,
      },
    });
    setFormValidationError(null);
  };

  const updateWorkerTask = (wId: string, task: string) => {
    const current = getWorkerState(wId);
    setWorkerHours({
      ...workerHours,
      [wId]: {
        ...current,
        task,
      },
    });
  };

  const handleSelectAll9Units = () => {
    const updated: Record<string, { selected: boolean; hours: number; task: string }> = {};
    availableWorkers.forEach((w) => {
      updated[w.id] = {
        selected: true,
        hours: 9,
        task: workerHours[w.id]?.task || 'Trabajos asignados en obra',
      };
    });
    setWorkerHours(updated);
    setFormValidationError(null);
  };

  // Step 1: Select Obra -> jumps directly to Step 2
  const handleSelectObra = (obraId: string) => {
    setSelectedObraId(obraId);
    setSelectedSubcontrataId('');
    setWorkerHours({});
    setCurrentStep('select_subcontrata');
  };

  // Step 2: Select Subcontrata -> jumps directly to Step 3
  const handleSelectSubcontrata = (subId: string) => {
    setSelectedSubcontrataId(subId);
    setWorkerHours({});
    setCurrentStep('select_workers');
  };

  // Photo Upload / Mobile Camera Capture Handler
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    try {
      const compressedDataUrl = await compressWorksitePhoto(file, 720, 0.65);
      setCapturedPhotoUrl(compressedDataUrl);
    } catch (err) {
      console.error('Error procesando foto de obra:', err);
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  // Step 3: Calculations & Submit
  const selectedWorkersList = availableWorkers.filter(
    (w) => getWorkerState(w.id).selected
  );
  const totalHoursCalculated = selectedWorkersList.reduce(
    (acc, w) => acc + getWorkerState(w.id).hours,
    0
  );

  const finalizeAndSubmitAlbaran = (signatureDataUrl?: string, customNotes?: string) => {
    if (!activeObra || !activeSubcontrata) return;

    const workerLines: AlbaranWorkerLine[] = selectedWorkersList.map((w) => {
      const state = getWorkerState(w.id);
      return {
        workerId: w.id,
        workerName: w.name,
        workerCategory: w.category,
        hours: state.hours,
        extraHours: state.hours > 8 ? state.hours - 8 : 0,
        taskDescription: state.task || 'Trabajos de su oficio en obra',
      };
    });

    const newAlbaran: AlbaranDiario = {
      id: `alb-${Date.now()}`,
      albaranNumber: `ALB-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      projectId: activeObra.id,
      projectTitle: activeObra.title,
      subcontrataId: activeSubcontrata.id,
      subcontrataName: activeSubcontrata.companyName,
      date,
      createdAt: new Date().toISOString(),
      createdByEncargadoId: encargadoId,
      createdByEncargadoName: encargadoName,
      tajoZone,
      generalNotes: customNotes || generalNotes,
      photoUrl: capturedPhotoUrl || activeObra.coverImage,
      encargadoSignature: signatureDataUrl || encargadoSignatureUrl || undefined,
      status: 'pendiente_subcontrata',
      workers: workerLines,
      totalHours: totalHoursCalculated,
    };

    onSaveAlbaran(newAlbaran);
    setLastSubmittedAlbaran(newAlbaran);
    setIsSigningModalOpen(false);
    setCurrentStep('success');
  };

  const handleSubmitAlbaran = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeObra || !activeSubcontrata) return;

    if (selectedWorkersList.length === 0) {
      setFormValidationError('Por favor, marca al menos un trabajador para generar el albarán.');
      return;
    }

    // If Encargado already signed, submit immediately; otherwise open Touch Signature Modal
    if (encargadoSignatureUrl) {
      finalizeAndSubmitAlbaran(encargadoSignatureUrl);
    } else {
      setIsSigningModalOpen(true);
    }
  };

  const handleStartNewAlbaran = () => {
    setWorkerHours({});
    setDate(getTodayDateKey());
    setCapturedPhotoUrl('');
    setEncargadoSignatureUrl('');
    setFormValidationError(null);
    setCurrentStep('select_obra');
  };

  // --- Rectification Helpers ---
  const rectifiableAlbaranes = albaranes.filter(
    (a) =>
      a.status === 'validado_subcontrata' ||
      a.status === 'aprobado_final' ||
      a.status === 'observado'
  );

  const rectifyActiveObra = obras.find((o) => o.id === rectifySelectedObraId);
  const rectifyActiveSubcontrata = subcontratas.find((s) => s.id === rectifySelectedSubId);

  const handleOpenRectifyTab = () => {
    setActiveTab('rectify');
    setRectifyingAlbaran(null);
    setRectifySuccessAlbaran(null);
    setRectifySelectedObraId('');
    setRectifySelectedSubId('');
    setRectifyDay('all');
    setRectifyStep('select_obra');
  };

  const handleRectifySelectObra = (obraId: string) => {
    setRectifySelectedObraId(obraId);
    setRectifySelectedSubId('');
    setRectifyDay('all');
    setRectifyStep('select_subcontrata');
  };

  const handleRectifySelectSubcontrata = (subId: string) => {
    setRectifySelectedSubId(subId);
    const matching = rectifiableAlbaranes.filter(
      (a) => a.projectId === rectifySelectedObraId && a.subcontrataId === subId
    );
    const months = Array.from(new Set(matching.map((a) => getMonthKey(a.date))))
      .sort()
      .reverse();
    setRectifyMonthKey(months[0] || getCurrentMonthKey());
    setRectifyDay('all');
    setRectifyStep('select_day');
  };

  const handleStartRectify = (alb: AlbaranDiario) => {
    const initialMap: Record<string, { selected: boolean; hours: number; task: string }> = {};
    alb.workers.forEach((w) => {
      initialMap[w.workerId] = {
        selected: true,
        hours: w.hours,
        task: w.taskDescription || '',
      };
    });
    setRectifySelectedObraId(alb.projectId);
    setRectifySelectedSubId(alb.subcontrataId);
    setRectifyMonthKey(getMonthKey(alb.date));
    setRectifyingAlbaran(alb);
    setRectifySuccessAlbaran(null);
    setRectifyWorkerHours(initialMap);
    setRectifyDate(alb.date);
    setRectifyTajoZone(alb.tajoZone || '');
    setRectifyNotes(alb.generalNotes || '');
    setRectifyPhotoUrl(alb.photoUrl || '');
    setRectifyReason(
      alb.status === 'observado'
        ? 'Corrección tras discrepancia reportada'
        : 'Error en unidades (Ud.)'
    );
    setRectifyValidationError(null);
    setRectifyStep('edit_albaran');
    setActiveTab('rectify');
  };

  const getRectifyWorkerState = (wId: string) => {
    return (
      rectifyWorkerHours[wId] || {
        selected: false,
        hours: 9,
        task: '',
      }
    );
  };

  const toggleRectifyWorkerSelection = (wId: string) => {
    const current = getRectifyWorkerState(wId);
    setRectifyWorkerHours({
      ...rectifyWorkerHours,
      [wId]: {
        ...current,
        selected: !current.selected,
      },
    });
    setRectifyValidationError(null);
  };

  const updateRectifyWorkerHours = (wId: string, hours: number) => {
    const current = getRectifyWorkerState(wId);
    setRectifyWorkerHours({
      ...rectifyWorkerHours,
      [wId]: {
        ...current,
        hours: Math.max(1, Math.min(16, hours)),
        selected: true,
      },
    });
    setRectifyValidationError(null);
  };

  const updateRectifyWorkerTask = (wId: string, task: string) => {
    const current = getRectifyWorkerState(wId);
    setRectifyWorkerHours({
      ...rectifyWorkerHours,
      [wId]: {
        ...current,
        task,
      },
    });
  };

  const rectifyAvailableWorkers = rectifyingAlbaran
    ? (() => {
        const subWorkers = workers.filter(
          (w) => w.subcontrataId === rectifyingAlbaran.subcontrataId && w.active
        );
        const existingIds = new Set(subWorkers.map((w) => w.id));
        const extraFromAlbaran: Worker[] = rectifyingAlbaran.workers
          .filter((aw) => !existingIds.has(aw.workerId))
          .map((aw) => ({
            id: aw.workerId,
            subcontrataId: rectifyingAlbaran.subcontrataId,
            subcontrataName: rectifyingAlbaran.subcontrataName,
            name: aw.workerName,
            dni: 'En parte',
            category: (aw.workerCategory as Worker['category']) || 'Oficial 1ª',
            active: true,
          }));
        return [...subWorkers, ...extraFromAlbaran];
      })()
    : [];

  const handleRectifySelectAll9Units = () => {
    const updated: Record<string, { selected: boolean; hours: number; task: string }> = {};
    rectifyAvailableWorkers.forEach((w) => {
      updated[w.id] = {
        selected: true,
        hours: 9,
        task: rectifyWorkerHours[w.id]?.task || 'Trabajos asignados en obra',
      };
    });
    setRectifyWorkerHours(updated);
    setRectifyValidationError(null);
  };

  const handleRectifyPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRectifyCompressingPhoto(true);
    try {
      const compressedDataUrl = await compressWorksitePhoto(file, 720, 0.65);
      setRectifyPhotoUrl(compressedDataUrl);
    } catch (err) {
      console.error('Error procesando foto de rectificación:', err);
    } finally {
      setIsRectifyCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const rectifySelectedWorkers = rectifyAvailableWorkers.filter(
    (w) => getRectifyWorkerState(w.id).selected
  );
  const rectifyTotalUd = rectifySelectedWorkers.reduce(
    (acc, w) => acc + getRectifyWorkerState(w.id).hours,
    0
  );

  const handleSubmitRectificationForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rectifyingAlbaran) return;
    if (rectifySelectedWorkers.length === 0) {
      setRectifyValidationError(
        'Por favor, marca al menos un trabajador para guardar la rectificación.'
      );
      return;
    }
    setIsRectifySigningOpen(true);
  };

  const finalizeRectification = (signatureDataUrl: string, customComment?: string) => {
    if (!rectifyingAlbaran || !onRectifyAlbaran) return;

    const updatedWorkerLines: AlbaranWorkerLine[] = rectifySelectedWorkers.map((w) => {
      const st = getRectifyWorkerState(w.id);
      return {
        workerId: w.id,
        workerName: w.name,
        workerCategory: w.category,
        hours: st.hours,
        extraHours: st.hours > 8 ? st.hours - 8 : 0,
        taskDescription: st.task || 'Trabajos de su oficio en obra',
      };
    });

    const rectifiedAlbaran: AlbaranDiario = {
      ...rectifyingAlbaran,
      date: rectifyDate,
      tajoZone: rectifyTajoZone,
      generalNotes: customComment || rectifyNotes,
      photoUrl: rectifyPhotoUrl || rectifyingAlbaran.photoUrl,
      encargadoSignature: signatureDataUrl || rectifyingAlbaran.encargadoSignature,
      workers: updatedWorkerLines,
      totalHours: rectifyTotalUd,
      status: 'pendiente_subcontrata',
      subcontrataReview: undefined,
      jefeObraApproval: undefined,
      rectification: {
        rectifiedAt: new Date().toISOString(),
        rectifiedBy: encargadoName,
        reason: rectifyReason.trim() || 'Rectificación de parte por el Encargado',
        previousTotalHours: rectifyingAlbaran.totalHours,
        previousStatus: rectifyingAlbaran.status,
      },
    };

    onRectifyAlbaran(rectifiedAlbaran);
    setIsRectifySigningOpen(false);
    setRectifyingAlbaran(null);
    setRectifySuccessAlbaran(rectifiedAlbaran);
    setRectifyStep('success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Navigation & Step Breadcrumb */}
      <div className="bg-amber-400 text-slate-950 p-5 sm:p-6 rounded-2xl shadow-sm border border-amber-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-md">
              <HardHat className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-950 block">
                Panel del Encargado de Obra · {encargadoName}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {activeTab === 'rectify'
                  ? (
                    <>
                      {rectifyStep === 'select_obra' && 'Rectificar · Página 1: Selecciona la Obra'}
                      {rectifyStep === 'select_subcontrata' && 'Rectificar · Página 2: Selecciona la Subcontrata'}
                      {rectifyStep === 'select_day' && 'Rectificar · Página 3: Agenda de Días'}
                      {rectifyStep === 'edit_albaran' && `Rectificando ${rectifyingAlbaran?.albaranNumber || 'Albarán'}`}
                      {rectifyStep === 'success' && '¡Albarán Rectificado con Éxito!'}
                    </>
                  )
                  : activeTab === 'history'
                  ? 'Historial de Albaranes de Obra'
                  : (
                    <>
                      {currentStep === 'select_obra' && 'Página 1: Selecciona la Obra'}
                      {currentStep === 'select_subcontrata' && 'Página 2: Selecciona la Subcontrata'}
                      {currentStep === 'select_workers' && 'Página 3: Trabajadores y Unidades (Ud.) de la Subcontrata'}
                      {currentStep === 'success' && '¡Albarán Diario Enviado con Éxito!'}
                    </>
                  )}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(selectedObraId || undefined)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-950 text-amber-400 hover:bg-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Unificar partes por rango de fechas (ej. día 1 al 25) y ver unidades (Ud.) de oficiales y peones"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
              <span>Hoja Resumen Acumulado</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setDate(getTodayDateKey());
                setRectifyingAlbaran(null);
                setRectifySuccessAlbaran(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-slate-950 shadow-sm ring-2 ring-slate-950'
                  : 'bg-slate-950/10 hover:bg-slate-950/20 text-slate-950'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Albarán</span>
            </button>

            <button
              type="button"
              onClick={handleOpenRectifyTab}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'rectify'
                  ? 'bg-white text-slate-950 shadow-sm ring-2 ring-slate-950'
                  : 'bg-slate-950/10 hover:bg-slate-950/20 text-slate-950'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Rectificar Albarán</span>
              {rectifiableAlbaranes.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 text-amber-400">
                  {rectifiableAlbaranes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                setRectifyingAlbaran(null);
                setRectifySuccessAlbaran(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-950 shadow-sm ring-2 ring-slate-950 font-black'
                  : 'bg-slate-950/10 hover:bg-slate-950/20 text-slate-950'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial de Partes</span>
            </button>
          </div>
        </div>

        {/* Step Progression Indicators */}
        {activeTab === 'create' && (
          <div className="mt-5 pt-4 border-t border-amber-500/30 flex items-center gap-2 overflow-x-auto text-xs font-bold no-scrollbar">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 'select_obra'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white/40 text-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                1
              </span>
              <span>1. Obra</span>
              {activeObra && (
                <span className="text-amber-300 font-normal">
                  ({activeObra.title.substring(0, 15)}...)
                </span>
              )}
            </div>

            <ArrowRight className="w-4 h-4 text-amber-800 shrink-0" />

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 'select_subcontrata'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white/40 text-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                2
              </span>
              <span>2. Subcontrata</span>
              {activeSubcontrata && (
                <span className="text-amber-300 font-normal">
                  ({activeSubcontrata.companyName.substring(0, 15)}...)
                </span>
              )}
            </div>

            <ArrowRight className="w-4 h-4 text-amber-800 shrink-0" />

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                currentStep === 'select_workers'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white/40 text-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                3
              </span>
              <span>3. Trabajadores & Ud.</span>
            </div>
          </div>
        )}
        {/* Step Progression Indicators for Rectificar */}
        {activeTab === 'rectify' && (
          <div className="mt-5 pt-4 border-t border-amber-500/30 flex items-center gap-2 overflow-x-auto text-xs font-bold no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setRectifyingAlbaran(null);
                setRectifySuccessAlbaran(null);
                setRectifyStep('select_obra');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                rectifyStep === 'select_obra'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : 'bg-white/40 hover:bg-white/70 text-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                1
              </span>
              <span>1. Obra</span>
              {rectifyActiveObra && (
                <span className={`font-normal ${rectifyStep === 'select_obra' ? 'text-amber-300' : 'text-slate-700'}`}>
                  ({rectifyActiveObra.title.substring(0, 15)}...)
                </span>
              )}
            </button>

            <ArrowRight className="w-4 h-4 text-amber-800 shrink-0" />

            <button
              type="button"
              disabled={!rectifyActiveObra}
              onClick={() => {
                if (!rectifyActiveObra) return;
                setRectifyingAlbaran(null);
                setRectifySuccessAlbaran(null);
                setRectifyStep('select_subcontrata');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                rectifyStep === 'select_subcontrata'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : rectifyActiveObra
                  ? 'bg-white/40 hover:bg-white/70 text-slate-800 cursor-pointer'
                  : 'bg-white/30 text-slate-500 cursor-default'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                2
              </span>
              <span>2. Subcontrata</span>
              {rectifyActiveSubcontrata && (
                <span className={`font-normal ${rectifyStep === 'select_subcontrata' ? 'text-amber-300' : 'text-slate-700'}`}>
                  ({rectifyActiveSubcontrata.companyName.substring(0, 15)}...)
                </span>
              )}
            </button>

            <ArrowRight className="w-4 h-4 text-amber-800 shrink-0" />

            <button
              type="button"
              disabled={!rectifyActiveSubcontrata}
              onClick={() => {
                if (!rectifyActiveSubcontrata) return;
                setRectifyingAlbaran(null);
                setRectifySuccessAlbaran(null);
                setRectifyStep('select_day');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                rectifyStep === 'select_day' || rectifyStep === 'edit_albaran'
                  ? 'bg-slate-950 text-amber-400 shadow-sm'
                  : rectifyActiveSubcontrata
                  ? 'bg-white/40 hover:bg-white/70 text-slate-800 cursor-pointer'
                  : 'bg-white/30 text-slate-500 cursor-default'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                3
              </span>
              <span>
                {rectifyStep === 'edit_albaran' ? '3. Agenda → Editando Parte' : '3. Agenda de Días'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* APARTADO: RECTIFICAR ALBARÁN YA VALIDADO (Misma estructura 1. Obra -> 2. Subcontrata -> 3. Agenda de Días) */}
      {activeTab === 'rectify' ? (
        <div className="space-y-6">
          {rectifyStep === 'success' && rectifySuccessAlbaran ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-400 p-8 shadow-lg text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block font-mono">
                  Albarán Nº {rectifySuccessAlbaran.albaranNumber} Rectificado
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  ¡Rectificación Guardada en la Nube!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2">
                  El parte actualizado con <span className="font-bold text-slate-900">{rectifySuccessAlbaran.workers.length} trabajadores</span> y{' '}
                  <span className="font-bold font-mono text-slate-900">{rectifySuccessAlbaran.totalHours} Ud.</span>{' '}
                  (antes <span className="font-mono">{rectifySuccessAlbaran.rectification?.previousTotalHours} Ud.</span>) se ha enviado a{' '}
                  <span className="font-bold text-blue-700">{rectifySuccessAlbaran.subcontrataName}</span> para su nuevo visto bueno.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onViewAlbaranDetail(rectifySuccessAlbaran)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                >
                  Ver Ficha Actualizada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRectifySuccessAlbaran(null);
                    setRectifyingAlbaran(null);
                    setRectifyStep('select_day');
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                >
                  Volver a Agenda de Días
                </button>
                <button
                  type="button"
                  onClick={handleOpenRectifyTab}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rectificar Otro Albarán</span>
                </button>
              </div>
            </div>
          ) : rectifyStep === 'edit_albaran' && rectifyingAlbaran ? (
            <form onSubmit={handleSubmitRectificationForm} className="space-y-6">
              <div className="bg-white rounded-2xl border-2 border-amber-400 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Back & Context Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setRectifyingAlbaran(null);
                      setRectifyStep('select_day');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>← Volver a la Agenda de Días</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 font-mono font-black text-amber-400">
                      {rectifyingAlbaran.albaranNumber}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 font-bold text-amber-950">
                      {rectifyingAlbaran.projectTitle}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 font-bold text-blue-950">
                      {rectifyingAlbaran.subcontrataName}
                    </span>
                  </div>
                </div>

                {/* Alert Notice */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-amber-950 block">
                      Rectificando albarán ya validado (Antes: {rectifyingAlbaran.totalHours} Ud. · {rectifyingAlbaran.workers.length} operarios)
                    </span>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Cambia fácilmente los trabajadores, las unidades (Ud.), la zona o la fecha. Al guardar, quedará actualizado al instante para nueva validación.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 shrink-0">
                    {rectifyingAlbaran.status === 'aprobado_final'
                      ? 'Estado anterior: Aprobado Final'
                      : rectifyingAlbaran.status === 'validado_subcontrata'
                      ? 'Estado anterior: Validado Subcontrata'
                      : 'Estado anterior: Con Discrepancia'}
                  </span>
                </div>

                {/* Motivo Rápido de Rectificación */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    1. Motivo de la Rectificación (toca una opción o escribe):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Error en unidades (Ud.)',
                      'Faltaba un operario',
                      'Operario de más',
                      'Cambio de zona o fecha',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRectifyReason(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          rectifyReason === preset
                            ? 'bg-amber-400 border-amber-500 text-slate-950 font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={rectifyReason}
                    onChange={(e) => setRectifyReason(e.target.value)}
                    placeholder="Indica brevemente qué se rectifica..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                  />
                </div>

                {/* Workers & Units Header + Quick 9 Ud. button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                      2. Operarios y Unidades (Ud.)
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      Ajusta los trabajadores o sus unidades (Ud.)
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleRectifySelectAll9Units}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Validar Todos a 9 Ud.</span>
                  </button>
                </div>

                {/* Worker Touch Cards */}
                <div className="space-y-3">
                  {rectifyAvailableWorkers.map((worker) => {
                    const state = getRectifyWorkerState(worker.id);
                    const isSelected = state.selected;

                    return (
                      <div
                        key={worker.id}
                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div
                            onClick={() => toggleRectifyWorkerSelection(worker.id)}
                            className="flex items-center gap-4 cursor-pointer select-none flex-1"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-6 h-6 stroke-[3]" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base sm:text-lg font-black text-slate-900">
                                  {worker.name}
                                </h4>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {worker.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                DNI: {worker.dni}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              {[7, 8, 9, 10].map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => updateRectifyWorkerHours(worker.id, u)}
                                  className={`px-3 py-2 text-xs font-black rounded-lg border transition-colors cursor-pointer ${
                                    isSelected && state.hours === u
                                      ? 'bg-slate-950 text-amber-400 border-slate-950 shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  {u} Ud.
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateRectifyWorkerHours(worker.id, state.hours - 1)}
                                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-800 font-bold shadow-xs cursor-pointer"
                                title="Restar 1 Ud."
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-14 text-center font-mono font-black text-sm text-slate-900 tabular-nums">
                                {state.hours} Ud.
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRectifyWorkerHours(worker.id, state.hours + 1)}
                                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-800 font-bold shadow-xs cursor-pointer"
                                title="Sumar 1 Ud."
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-amber-200/60">
                            <input
                              type="text"
                              placeholder="Tarea específica ejecutada..."
                              value={state.task}
                              onChange={(e) => updateRectifyWorkerTask(worker.id, e.target.value)}
                              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tajo, Fecha & Observaciones */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Zona / Tajo de la Obra
                    </label>
                    <input
                      type="text"
                      value={rectifyTajoZone}
                      onChange={(e) => setRectifyTajoZone(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Fecha del Albarán
                    </label>
                    <input
                      type="date"
                      value={rectifyDate}
                      onChange={(e) => setRectifyDate(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-medium"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">
                      Observaciones del Encargado
                    </label>
                    <input
                      type="text"
                      value={rectifyNotes}
                      onChange={(e) => setRectifyNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Foto opcional */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>Foto del Tajo (Opcional)</span>
                    </span>
                    {rectifyPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setRectifyPhotoUrl('')}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar foto</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer">
                      <Camera className="w-4 h-4" />
                      <span>{isRectifyCompressingPhoto ? 'Procesando...' : 'Actualizar Foto con Cámara'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleRectifyPhotoChange}
                        className="hidden"
                      />
                    </label>
                    <label className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-slate-600" />
                      <span>Subir de Galería</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRectifyPhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {rectifyPhotoUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-amber-400 bg-white max-w-sm">
                      <img
                        src={rectifyPhotoUrl}
                        alt="Foto actualizada del tajo"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                </div>

                {rectifyValidationError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                    {rectifyValidationError}
                  </div>
                )}
              </div>

              {/* Sticky Rectification Save Bar */}
              <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-2xl border-2 border-amber-400 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
                    {rectifySelectedWorkers.length}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider block">
                      Resumen de Rectificación · {rectifyingAlbaran.albaranNumber}
                    </span>
                    <p className="text-base sm:text-lg font-bold text-white">
                      Antes: <span className="font-mono text-slate-300">{rectifyingAlbaran.totalHours} Ud.</span> →{' '}
                      <span className="font-mono text-amber-400 font-black">
                        Nuevo Total: {rectifyTotalUd} Ud.
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Se sincronizará en la nube y volverá a quedar pendiente de VºBº.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={rectifySelectedWorkers.length === 0}
                  className={`w-full md:w-auto px-7 py-4 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2.5 shadow-lg whitespace-nowrap ${
                    rectifySelectedWorkers.length > 0
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 hover:scale-102 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <PenTool className="w-5 h-5 stroke-[2.5]" />
                  <span>✓ FIRMAR Y GUARDAR RECTIFICACIÓN</span>
                </button>
              </div>
            </form>
          ) : rectifyStep === 'select_obra' ? (
            /* RECTIFICAR PÁGINA 1: CUADRÍCULAS GRANDES DE OBRAS */
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                  Página 1 de 3 · Rectificar Albarán Validado
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ¿De qué obra quieres rectificar el albarán?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Toca una obra para ver sus subcontratas y abrir la agenda de días.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {obras.map((obra) => {
                  const obraValidated = rectifiableAlbaranes.filter(
                    (a) => a.projectId === obra.id
                  );
                  const obraTotalUd = obraValidated.reduce((s, a) => s + a.totalHours, 0);

                  return (
                    <button
                      key={obra.id}
                      type="button"
                      onClick={() => handleRectifySelectObra(obra.id)}
                      className="group p-6 rounded-2xl text-left transition-all border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-amber-800">
                            {obra.code}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              obraValidated.length > 0
                                ? 'bg-amber-100 text-amber-950'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {obraValidated.length} validados
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-950 leading-snug">
                          {obra.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0" />
                          <span>{obra.address}, {obra.city}</span>
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 group-hover:border-amber-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          {obraValidated.length} albaranes · <span className="font-mono font-black text-slate-900">{obraTotalUd} Ud.</span>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-xs">
                          <span>Entrar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : rectifyStep === 'select_subcontrata' && rectifyActiveObra ? (
            /* RECTIFICAR PÁGINA 2: CUADRÍCULAS GRANDES DE SUBCONTRATAS */
            (() => {
              const obraValidated = rectifiableAlbaranes.filter(
                (a) => a.projectId === rectifyActiveObra.id
              );
              const subsInRectifyObra = Array.from(
                new Set([
                  ...rectifyActiveObra.subcontrataIds.filter(Boolean),
                  ...obraValidated.map((a) => a.subcontrataId),
                ])
              )
                .map((id) => subcontratas.find((s) => s.id === id))
                .filter((s): s is Subcontrata => Boolean(s));

              return (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Back to Obra bar */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRectifyStep('select_obra')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Cambiar de Obra</span>
                    </button>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block uppercase font-bold">
                        Obra seleccionada
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {rectifyActiveObra.title}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                      Página 2 de 3 · Subcontratas en {rectifyActiveObra.title}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      ¿De qué subcontrata es el albarán?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Toca la subcontrata para abrir su agenda de días y elegir el parte a rectificar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subsInRectifyObra.map((sub) => {
                      const subValidated = obraValidated.filter(
                        (a) => a.subcontrataId === sub.id
                      );
                      const subUd = subValidated.reduce((s, a) => s + a.totalHours, 0);

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleRectifySelectSubcontrata(sub.id)}
                          className="group p-6 rounded-2xl text-left transition-all border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/40 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono font-bold text-slate-500">
                                CIF: {sub.cif}
                              </span>
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                                {sub.trade}
                              </span>
                            </div>

                            <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-950 leading-snug">
                              {sub.companyName}
                            </h3>

                            <p className="text-xs text-slate-600 mt-2">
                              Contacto: <span className="font-semibold">{sub.contactPerson}</span> ({sub.phone})
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 group-hover:border-blue-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-900">
                              {subValidated.length} validados · <span className="font-mono font-black">{subUd} Ud.</span>
                            </span>
                            <span className="px-3.5 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs">
                              <span>Ver Agenda</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {subsInRectifyObra.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No hay subcontratas asignadas a esta obra actualmente.
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* RECTIFICAR PÁGINA 3: AGENDA DE DÍAS PARA SELECCIONAR EL DÍA A RECTIFICAR */
            (() => {
              const matchingAlbaranes = rectifiableAlbaranes.filter(
                (a) =>
                  a.projectId === rectifySelectedObraId &&
                  a.subcontrataId === rectifySelectedSubId
              );

              const rectifyMonths = Array.from(
                new Set(matchingAlbaranes.map((a) => getMonthKey(a.date)))
              )
                .sort()
                .reverse();
              if (rectifyMonths.length === 0) rectifyMonths.push(getCurrentMonthKey());

              const activeRectifyMonth = rectifyMonths.includes(rectifyMonthKey)
                ? rectifyMonthKey
                : rectifyMonths[0];

              const monthParts = matchingAlbaranes.filter(
                (a) => getMonthKey(a.date) === activeRectifyMonth
              );
              const visibleParts =
                rectifyDay === 'all'
                  ? monthParts
                  : monthParts.filter((a) => a.date === rectifyDay);

              const dayGroups = groupAlbaranesByDay(visibleParts);

              return (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Back to Subcontrata bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRectifyStep('select_subcontrata')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Cambiar de Subcontrata</span>
                    </button>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 font-bold text-amber-950">
                        Obra: {rectifyActiveObra?.title}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-100 font-bold text-blue-950">
                        Subcontrata: {rectifyActiveSubcontrata?.companyName}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                      Página 3 de 3 · Agenda de Días
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Selecciona el día que quieres rectificar
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Toca cualquier día marcado en la agenda para ver su albarán validado y rectificarlo al instante.
                    </p>
                  </div>

                  {/* Selector de Mes */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {rectifyMonths.map((mKey) => {
                      const isSel = activeRectifyMonth === mKey;
                      const cnt = matchingAlbaranes.filter(
                        (a) => getMonthKey(a.date) === mKey
                      ).length;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => {
                            setRectifyMonthKey(mKey);
                            setRectifyDay('all');
                          }}
                          className={`px-4 py-2.5 rounded-xl border-2 text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                            isSel
                              ? 'border-amber-500 bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{getMonthYearString(`${mKey}-01`)}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 rounded-full ${
                              isSel ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {cnt}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Agenda / Calendario del Mes (Desplegada por defecto) */}
                  <DayCalendarBar
                    key={`rectify-cal-${rectifySelectedObraId}-${rectifySelectedSubId}-${activeRectifyMonth}`}
                    monthKey={activeRectifyMonth}
                    albaranes={monthParts}
                    selectedDay={rectifyDay}
                    onSelectDay={setRectifyDay}
                    accentColor="amber"
                    defaultExpanded
                  />

                  {/* Partes Validados del Día Seleccionado */}
                  <div className="space-y-5">
                    {dayGroups.map((group) => (
                      <div key={group.date} className="space-y-3">
                        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-black capitalize">
                              {formatDayHeader(group.date)}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {group.albaranes.length} {group.albaranes.length === 1 ? 'parte' : 'partes'} · {group.totalUd} Ud.
                          </span>
                        </div>

                        {group.albaranes.map((alb) => (
                          <div
                            key={alb.id}
                            className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="font-mono font-black text-sm text-slate-900">
                                  {alb.albaranNumber}
                                </span>
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    alb.status === 'aprobado_final'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : alb.status === 'validado_subcontrata'
                                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                                      : 'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}
                                >
                                  {alb.status === 'aprobado_final'
                                    ? '✓ Aprobado Definitivo'
                                    : alb.status === 'validado_subcontrata'
                                    ? '✓ Validado por Subcontrata'
                                    : '⚠ Con Discrepancia'}
                                </span>
                                {alb.rectification && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    Rectificado antes
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-slate-800">
                                {alb.workers.length} operarios ·{' '}
                                <span className="font-mono font-black text-slate-950">{alb.totalHours} Ud.</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Zona: {alb.tajoZone || 'Sin zona'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onViewAlbaranDetail(alb)}
                                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              >
                                Ver Ficha
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartRectify(alb)}
                                className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                                <span>Rectificar Albarán</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {dayGroups.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        No hay albaranes validados para {rectifyActiveSubcontrata?.companyName} en este mes.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* Touch Signature Modal for Rectification */}
          {isRectifySigningOpen && rectifyingAlbaran && (
            <SignaturePadModal
              title="Firma de Rectificación del Encargado"
              subtitle={`Confirma la rectificación de ${rectifyingAlbaran.albaranNumber} (${rectifySelectedWorkers.length} operarios · ${rectifyTotalUd} Ud.).`}
              signerName={encargadoName}
              signerRoleLabel="Encargado de Obra"
              albaranNumber={rectifyingAlbaran.albaranNumber}
              defaultComment={rectifyNotes}
              accentColor="amber"
              onConfirm={(sigUrl, customComment) => finalizeRectification(sigUrl, customComment)}
              onCancel={() => setIsRectifySigningOpen(false)}
            />
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Archivo Digital de la Obra
                </span>
                <span className="text-xs text-slate-400">Agrupado por Obras, Subcontratas y Días</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                {historyObraId
                  ? obras.find((o) => o.id === historyObraId)?.title || 'Historial de la Obra'
                  : 'Historial de Albaranes por Obras'}
              </h2>
              <p className="text-xs text-slate-500">
                {historyObraId
                  ? 'Consulta los albaranes archivados por mes y día, y rectifica cualquiera si hace falta.'
                  : 'Selecciona una obra para abrir sus partes diarios.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {historyObraId && (
                <button
                  type="button"
                  onClick={() => setHistoryObraId(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Volver a Obras</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer"
              >
                + Nuevo Albarán
              </button>
            </div>
          </div>

          {/* NIVEL 1: CARPETAS DE OBRAS (Si no hay obra seleccionada en el historial) */}
          {!historyObraId && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {obras.map((obra) => {
                const obraParts = albaranes.filter((a) => a.projectId === obra.id);
                const totalHours = obraParts.reduce((acc, a) => acc + a.totalHours, 0);

                return (
                  <button
                    key={obra.id}
                    type="button"
                    onClick={() => {
                      setHistoryObraId(obra.id);
                      setHistorySubId('all');
                      setHistoryDay('all');
                      const mKeys = Array.from(
                        new Set(obraParts.map((a) => getMonthKey(a.date)))
                      ).sort().reverse();
                      setHistoryMonthKey(mKeys[0] || getCurrentMonthKey());
                    }}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/30 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-400 text-amber-900 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                          <Folder className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {obra.code}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-amber-950 leading-snug">
                        {obra.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {obra.address}, {obra.city}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 group-hover:border-amber-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">
                        {obraParts.length} albaranes · <span className="font-mono text-slate-900 font-extrabold">{totalHours} Ud.</span>
                      </span>
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <span>Abrir</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* NIVEL 2 Y 3: SUBCONTRATA, MES Y DÍA EN EL HISTORIAL DE OBRA */}
          {historyObraId && (() => {
            const currentHistoryObra = obras.find((o) => o.id === historyObraId);
            const thisObraAlbaranes = albaranes.filter((a) => a.projectId === historyObraId);

            const subsInHistoryObra = Array.from(
              new Set([
                ...(currentHistoryObra?.subcontrataIds.filter(Boolean) || []),
                ...thisObraAlbaranes.map((a) => a.subcontrataId),
              ])
            )
              .map((id) => subcontratas.find((s) => s.id === id))
              .filter((s): s is Subcontrata => Boolean(s));

            const subFilteredObraAlbaranes =
              historySubId === 'all'
                ? thisObraAlbaranes
                : thisObraAlbaranes.filter((a) => a.subcontrataId === historySubId);

            const monthsList = Array.from(
              new Set(subFilteredObraAlbaranes.map((a) => getMonthKey(a.date)))
            ).sort().reverse();
            if (monthsList.length === 0) monthsList.push(getCurrentMonthKey());

            const monthParts = subFilteredObraAlbaranes.filter(
              (a) => getMonthKey(a.date) === historyMonthKey
            );
            const visibleHistoryParts =
              historyDay === 'all'
                ? monthParts
                : monthParts.filter((a) => a.date === historyDay);

            const historyDayGroups = groupAlbaranesByDay(visibleHistoryParts);
            const totalHoursMonth = monthParts.reduce((acc, a) => acc + a.totalHours, 0);

            return (
              <div className="space-y-5">
                {/* Selector de Subcontrata */}
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                    1. Subcontrata en Obra:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySubId('all');
                        setHistoryDay('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
                        historySubId === 'all'
                          ? 'border-amber-500 bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                      }`}
                    >
                      Todas ({thisObraAlbaranes.length})
                    </button>

                    {subsInHistoryObra.map((sub) => {
                      const isSel = historySubId === sub.id;
                      const cnt = thisObraAlbaranes.filter((a) => a.subcontrataId === sub.id).length;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setHistorySubId(sub.id);
                            setHistoryDay('all');
                          }}
                          className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
                            isSel
                              ? 'border-amber-500 bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                          }`}
                        >
                          {sub.companyName} ({cnt})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selector de Meses */}
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                    2. Selecciona el Mes de Trabajo:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {monthsList.map((mKey) => {
                      const isSelected = historyMonthKey === mKey;
                      const monthName = getMonthYearString(`${mKey}-01`);
                      const countInMonth = subFilteredObraAlbaranes.filter(
                        (a) => getMonthKey(a.date) === mKey
                      ).length;

                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => {
                            setHistoryMonthKey(mKey);
                            setHistoryDay('all');
                          }}
                          className={`px-4 py-2.5 rounded-xl border-2 text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{monthName}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {countInMonth}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen del mes */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">
                    Mes: {getMonthYearString(`${historyMonthKey}-01`)} en {currentHistoryObra?.title}
                  </span>
                  <span className="font-mono font-black text-slate-900">
                    {monthParts.length} albaranes · {totalHoursMonth} Ud.
                  </span>
                </div>

                {/* Barra de Días + Calendario del Mes */}
                <DayCalendarBar
                  monthKey={historyMonthKey}
                  albaranes={monthParts}
                  selectedDay={historyDay}
                  onSelectDay={setHistoryDay}
                  accentColor="amber"
                />

                {/* Lista de Albaranes Segmentada por Días */}
                <div className="space-y-5">
                  {historyDayGroups.map((group) => (
                    <div key={group.date} className="space-y-3">
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-black capitalize">
                            {formatDayHeader(group.date)}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {group.albaranes.length} {group.albaranes.length === 1 ? 'parte' : 'partes'} · {group.totalUd} Ud.
                        </span>
                      </div>

                      {group.albaranes.map((alb) => (
                        <div
                          key={alb.id}
                          onClick={() => onViewAlbaranDetail(alb)}
                          className="p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono font-black text-xs text-slate-900">
                                {alb.albaranNumber}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                  alb.status === 'aprobado_final'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : alb.status === 'validado_subcontrata'
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : alb.status === 'observado'
                                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                {alb.status === 'aprobado_final'
                                  ? '✓ Aprobado Definitivo por Jefe de Obra'
                                  : alb.status === 'validado_subcontrata'
                                  ? 'Paso 2: Validado por Subcontrata (Esperando Jefe de Obra)'
                                  : alb.status === 'observado'
                                  ? '⚠ Con Discrepancia Reportada'
                                  : 'Paso 1: Enviado (Esperando VºBº Subcontrata)'}
                              </span>
                              {alb.rectification && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  Rectificado
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800">
                              Subcontrata: <span className="text-blue-700">{alb.subcontrataName}</span> · {alb.workers.length} operarios ({alb.totalHours} Ud.)
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Zona: {alb.tajoZone}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRectify(alb);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-100 hover:bg-amber-400 text-amber-950 border border-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Rectificar</span>
                            </button>
                            <span className="text-xs font-black text-amber-700 hover:underline">
                              Ver Ficha →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {historyDayGroups.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      No hay albaranes registrados en este periodo para esta selección.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* PÁGINA 1: SELECCIONAR LA OBRA */}
          {currentStep === 'select_obra' && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                  Página 1 de 3
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ¿En qué obra estás hoy?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Haz clic sobre la obra para acceder inmediatamente a sus subcontratas asignadas.
                </p>
              </div>

              {/* Big Touch Cards for Obras */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {obras.map((obra) => {
                  const subsCount = obra.subcontrataIds.length;
                  return (
                    <button
                      key={obra.id}
                      type="button"
                      onClick={() => handleSelectObra(obra.id)}
                      className="group p-6 rounded-2xl text-left transition-all border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-amber-800">
                            {obra.code}
                          </span>
                          <span className="text-[11px] font-bold bg-slate-100 group-hover:bg-amber-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                            Activa
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-950 leading-snug">
                          {obra.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0" />
                          <span>{obra.address}, {obra.city}</span>
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 group-hover:border-amber-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          {subsCount} subcontratas en esta obra
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-xs">
                          <span>Entrar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PÁGINA 2: SELECCIONAR LA SUBCONTRATA QUE HAY EN LA OBRA */}
          {currentStep === 'select_subcontrata' && activeObra && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Back to Obra bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep('select_obra')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Cambiar de Obra</span>
                </button>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block uppercase font-bold">
                    Obra seleccionada
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {activeObra.title}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                  Página 2 de 3
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ¿Qué subcontrata ha trabajado hoy?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Se muestran únicamente las subcontratas adjudicadas a {activeObra.title}. Haz clic en la correspondiente para ver sus trabajadores.
                </p>
              </div>

              {/* Big Touch Cards for Subcontratas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subcontratasInObra.map((sub) => {
                  const subWorkers = workers.filter(
                    (w) => w.subcontrataId === sub.id && w.active
                  );

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectSubcontrata(sub.id)}
                      className="group p-6 rounded-2xl text-left transition-all border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/40 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            CIF: {sub.cif}
                          </span>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                            {sub.trade}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-950 leading-snug">
                          {sub.companyName}
                        </h3>

                        <p className="text-xs text-slate-600 mt-2">
                          Contacto: <span className="font-semibold">{sub.contactPerson}</span> ({sub.phone})
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 group-hover:border-blue-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">
                          {subWorkers.length} trabajadores disponibles
                        </span>
                        <span className="px-3.5 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs">
                          <span>Seleccionar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {subcontratasInObra.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No hay subcontratas adjudicadas a esta obra actualmente.
                </div>
              )}
            </div>
          )}

          {/* PÁGINA 3: TRABAJADORES DE ESA SUBCONTRATA Y HORAS */}
          {currentStep === 'select_workers' && activeObra && activeSubcontrata && (
            <form onSubmit={handleSubmitAlbaran} className="space-y-6">
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Back to Subcontrata bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('select_subcontrata')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>← Cambiar de Subcontrata</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 font-bold text-amber-950">
                      Obra: {activeObra.title}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 font-bold text-blue-950">
                      Subcontrata: {activeSubcontrata.companyName}
                    </span>
                  </div>
                </div>

                {/* Page Title & Fast Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-wider block mb-1">
                      Página 3 de 3 · Operarios de {activeSubcontrata.companyName}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Selecciona los trabajadores y sus unidades (Ud.)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Marca con un toque a cada operario que ha estado en obra e indica sus unidades (Ud.) ejecutadas hoy.
                    </p>
                  </div>

                  {/* Fast 9-unit button */}
                  <button
                    type="button"
                    onClick={handleSelectAll9Units}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Validar Todos a 9 Ud.</span>
                  </button>
                </div>

                {/* Seleccionador de Día con flechas hacia delante y atrás (predefinido en HOY) */}
                {(() => {
                  const todayKey = getTodayDateKey();
                  const isToday = date === todayKey;
                  const isYesterday = date === shiftDateKey(todayKey, -1);

                  return (
                    <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-amber-700" />
                          <span>Día del Albarán</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                              isToday
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : isYesterday
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            {isToday ? '✓ Hoy' : isYesterday ? 'Ayer' : 'Fecha seleccionada'}
                          </span>
                          {!isToday && (
                            <button
                              type="button"
                              onClick={() => setDate(todayKey)}
                              className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Volver a Hoy
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <button
                          type="button"
                          onClick={() => setDate((prev) => shiftDateKey(prev, -1))}
                          className="px-3.5 py-3 rounded-xl bg-white hover:bg-amber-100 border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Día anterior"
                        >
                          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                          <span className="hidden sm:inline">Día anterior</span>
                        </button>

                        <div className="flex-1 text-center bg-white rounded-xl border-2 border-slate-200 px-3 py-2 shadow-xs">
                          <p className="text-sm sm:text-base font-black text-slate-950 capitalize leading-tight">
                            {formatDayHeader(date)}
                          </p>
                          <div className="mt-1 flex items-center justify-center">
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => {
                                if (e.target.value) setDate(e.target.value);
                              }}
                              className="text-[11px] font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 cursor-pointer"
                              aria-label="Seleccionar fecha exacta del albarán"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDate((prev) => shiftDateKey(prev, 1))}
                          className="px-3.5 py-3 rounded-xl bg-white hover:bg-amber-100 border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                          title="Día siguiente"
                        >
                          <span className="hidden sm:inline">Día siguiente</span>
                          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Big Worker Cards Grid / List */}
                <div className="space-y-3">
                  {availableWorkers.map((worker) => {
                    const state = getWorkerState(worker.id);
                    const isSelected = state.selected;

                    return (
                      <div
                        key={worker.id}
                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Worker Checkbox & Name */}
                          <div
                            onClick={() => toggleWorkerSelection(worker.id)}
                            className="flex items-center gap-4 cursor-pointer select-none flex-1"
                          >
                            {/* Giant Touch Checkbox */}
                            <div
                              className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-6 h-6 stroke-[3]" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base sm:text-lg font-black text-slate-900">
                                  {worker.name}
                                </h4>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {worker.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                DNI: {worker.dni} {worker.phone ? `· ${worker.phone}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Hours Selector - Big Touch Controls */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1">
                              {[7, 8, 9, 10].map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => updateWorkerHours(worker.id, h)}
                                  className={`px-3 py-2 text-xs font-black rounded-lg border transition-colors ${
                                    isSelected && state.hours === h
                                      ? 'bg-slate-950 text-amber-400 border-slate-950 shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  {h} Ud.
                                </button>
                              ))}
                            </div>

                            {/* Stepper +/- */}
                            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkerHours(worker.id, state.hours - 1)
                                }
                                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-800 font-bold shadow-xs"
                                title="Restar 1 Ud."
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-14 text-center font-mono font-black text-sm text-slate-900 tabular-nums">
                                {state.hours} Ud.
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateWorkerHours(worker.id, state.hours + 1)
                                }
                                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-800 font-bold shadow-xs"
                                title="Sumar 1 Ud."
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Task description */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-amber-200/60">
                            <input
                              type="text"
                              placeholder="Tarea específica ejecutada (ej. Encofrado forjado losa bloque A, ferrallado...)"
                              value={state.task}
                              onChange={(e) => updateWorkerTask(worker.id, e.target.value)}
                              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {availableWorkers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Esta subcontrata no tiene trabajadores dados de alta actualmente. Puedes volver atrás y seleccionar otra subcontrata.
                  </div>
                )}

                {/* Tajo y Observaciones */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Zona / Tajo de la Obra
                    </label>
                    <input
                      type="text"
                      value={tajoZone}
                      onChange={(e) => setTajoZone(e.target.value)}
                      placeholder="Ej. Planta 3ª - Forjado Bloque B"
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Observaciones del Encargado
                    </label>
                    <input
                      type="text"
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder="Observaciones de rendimientos, incidencias, etc."
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* FOTO DE OBRA CON CÁMARA MÓVIL & FIRMA TÁCTIL DEL ENCARGADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Cámara de Obra / Subida de Foto */}
                  <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-amber-600" />
                        <span>Evidencia Fotográfica del Tajo</span>
                      </span>
                      {capturedPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setCapturedPhotoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar foto</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Haz una foto en directo con la cámara del móvil o adjunta una imagen del avance de los trabajos.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors">
                        <Camera className="w-4 h-4" />
                        <span>{isCompressingPhoto ? 'Procesando...' : 'Hacer Foto con Cámara'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                      </label>

                      <label className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                        <ImageIcon className="w-4 h-4 text-slate-600" />
                        <span>Subir de Galería</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {capturedPhotoUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border-2 border-amber-400 bg-white relative">
                        <img
                          src={capturedPhotoUrl}
                          alt="Foto de obra capturada"
                          className="w-full h-36 object-cover"
                        />
                        <span className="absolute bottom-2 right-2 bg-slate-950/85 text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          ✓ Foto de Obra Adjunta
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Firma Digital Táctil del Encargado */}
                  <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <PenTool className="w-4 h-4 text-amber-600" />
                          <span>Firma Digital del Encargado</span>
                        </span>
                        {encargadoSignatureUrl && (
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            ✓ Firmado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Al pulsar en enviar se abrirá el recuadro táctil para firmar con el dedo, o puedes dejarla pre-firmada ahora.
                      </p>
                    </div>

                    {encargadoSignatureUrl ? (
                      <div className="p-2 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3">
                        <img
                          src={encargadoSignatureUrl}
                          alt="Firma del encargado"
                          className="h-14 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setEncargadoSignatureUrl('')}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-rose-700 bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Cambiar Firma
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSigningModalOpen(true)}
                        className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <PenTool className="w-4 h-4 text-amber-600" />
                        <span>Abrir Recuadro de Firma Táctil (Opcional antes de enviar)</span>
                      </button>
                    )}
                  </div>
                </div>

                {formValidationError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                    {formValidationError}
                  </div>
                )}
              </div>

              {/* Big Sticky Submission Bar */}
              <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-2xl border-2 border-amber-400 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
                    {selectedWorkersList.length}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider block">
                      Resumen del Albarán Diario
                    </span>
                    <p className="text-base sm:text-lg font-bold text-white">
                      {selectedWorkersList.length} Trabajadores seleccionados ·{' '}
                      <span className="font-mono text-amber-400 font-black">
                        {totalHoursCalculated} Unidades (Ud.) Totales
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Obra: {activeObra.title} · Subcontrata: {activeSubcontrata.companyName}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={selectedWorkersList.length === 0}
                  className={`w-full md:w-auto px-8 py-4 rounded-xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-lg whitespace-nowrap ${
                    selectedWorkersList.length > 0
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 hover:scale-102 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <PenTool className="w-5 h-5 stroke-[2.5]" />
                  <span>✓ FIRMAR Y ENVIAR ALBARÁN DIARIO</span>
                </button>
              </div>
            </form>
          )}

          {/* Touch Signature Modal for Encargado */}
          {isSigningModalOpen && activeObra && activeSubcontrata && (
            <SignaturePadModal
              title="Firma de Emisión del Encargado"
              subtitle={`Certifica en obra la asistencia de ${selectedWorkersList.length} operarios (${totalHoursCalculated} Ud.) de ${activeSubcontrata.companyName}.`}
              signerName={encargadoName}
              signerRoleLabel="Encargado de Obra"
              defaultComment={generalNotes}
              accentColor="amber"
              onConfirm={(sigUrl, customComment) => {
                setEncargadoSignatureUrl(sigUrl);
                if (selectedWorkersList.length > 0) {
                  finalizeAndSubmitAlbaran(sigUrl, customComment);
                } else {
                  setIsSigningModalOpen(false);
                }
              }}
              onCancel={() => setIsSigningModalOpen(false)}
            />
          )}

          {/* SUCCESS SCREEN */}
          {currentStep === 'success' && lastSubmittedAlbaran && (
            <div className="bg-white rounded-2xl border-2 border-emerald-400 p-8 shadow-lg text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block font-mono">
                  Albarán Nº {lastSubmittedAlbaran.albaranNumber}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  ¡Albarán Firmado y Enviado con Éxito!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2">
                  El parte diario con <span className="font-bold text-slate-900">{lastSubmittedAlbaran.workers.length} trabajadores</span> y{' '}
                  <span className="font-bold font-mono text-slate-900">{lastSubmittedAlbaran.totalHours} Unidades (Ud.)</span> ha quedado subido a la nube y notificado a{' '}
                  <span className="font-bold text-blue-700">{lastSubmittedAlbaran.subcontrataName}</span> para su visto bueno.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-1">
                <p>
                  <span className="font-bold">Obra:</span> {lastSubmittedAlbaran.projectTitle}
                </p>
                <p>
                  <span className="font-bold">Subcontrata:</span> {lastSubmittedAlbaran.subcontrataName}
                </p>
                <p>
                  <span className="font-bold">Estado actual:</span>{' '}
                  <span className="font-bold text-amber-700">
                    Paso 2: Esperando VºBº de la Subcontrata
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => onViewAlbaranDetail(lastSubmittedAlbaran)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                >
                  Ver Ficha Oficial del Albarán
                </button>
                <button
                  type="button"
                  onClick={handleStartNewAlbaran}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Otro Albarán (Nueva Subcontrata u Obra)</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
