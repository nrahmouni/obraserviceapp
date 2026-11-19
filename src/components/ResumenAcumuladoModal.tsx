import React, { useState, useMemo } from 'react';
import { ObraProject, Subcontrata, AlbaranDiario, UserRole } from '../types';
import { CURRENT_CONSTRUCTORA } from '../data/mockData';
import {
  X,
  Printer,
  Calendar,
  Building2,
  HardHat,
  Users,
  Clock,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  Filter,
  FileSpreadsheet,
  Download,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface ResumenAcumuladoModalProps {
  obras: ObraProject[];
  subcontratas: Subcontrata[];
  albaranes: AlbaranDiario[];
  initialObraId?: string;
  initialSubcontrataId?: string; // If locked to a specific subcontrata
  userRole: UserRole;
  currentUserName: string;
  onClose: () => void;
  onViewAlbaranDetail?: (albaran: AlbaranDiario) => void;
}

export const ResumenAcumuladoModal: React.FC<ResumenAcumuladoModalProps> = ({
  obras,
  subcontratas,
  albaranes,
  initialObraId,
  initialSubcontrataId,
  userRole,
  currentUserName,
  onClose,
  onViewAlbaranDetail,
}) => {
  // Selected Obra
  const [selectedObraId, setSelectedObraId] = useState<string>(
    initialObraId || obras[0]?.id || ''
  );

  // Selected Subcontrata (can be 'all' for constructora/jefe_obra, or specific)
  const isSubcontrataUser = userRole === 'subcontrata';
  const defaultSubId = isSubcontrataUser
    ? initialSubcontrataId || subcontratas[0]?.id || ''
    : initialSubcontrataId || 'all';

  const [selectedSubId, setSelectedSubId] = useState<string>(defaultSubId);

  // Predefined default dates: full month (1 to last day)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const lastDayOfMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();

  const defaultStartDate = `${currentYear}-${currentMonthNum}-01`;
  const defaultEndDate = `${currentYear}-${currentMonthNum}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  // Toggle print sheet layout preview
  const [viewSheetMode, setViewSheetMode] = useState<boolean>(false);

  // Quick preset dates handlers
  const handleSetPreset = (preset: 'dia_1_a_25' | 'mes_completo' | 'quincena_1' | 'quincena_2' | 'mes_anterior') => {
    if (preset === 'dia_1_a_25') {
      setStartDate(`${currentYear}-${currentMonthNum}-01`);
      setEndDate(`${currentYear}-${currentMonthNum}-25`);
    } else if (preset === 'mes_completo') {
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
    } else if (preset === 'quincena_1') {
      setStartDate(`${currentYear}-${currentMonthNum}-01`);
      setEndDate(`${currentYear}-${currentMonthNum}-15`);
    } else if (preset === 'quincena_2') {
      setStartDate(`${currentYear}-${currentMonthNum}-16`);
      setEndDate(defaultEndDate);
    } else if (preset === 'mes_anterior') {
      const prevDate = new Date(currentYear, now.getMonth() - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonthNum = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevLastDay = new Date(prevYear, prevDate.getMonth() + 1, 0).getDate();
      setStartDate(`${prevYear}-${prevMonthNum}-01`);
      setEndDate(`${prevYear}-${prevMonthNum}-${String(prevLastDay).padStart(2, '0')}`);
    }
  };

  const activeObra = obras.find((o) => o.id === selectedObraId);
  const activeSubcontrata = subcontratas.find((s) => s.id === selectedSubId);

  // Filtered subcontratas in this obra
  const availableSubcontratas = useMemo(() => {
    if (!activeObra) return subcontratas;
    return subcontratas.filter((s) => activeObra.subcontrataIds.includes(s.id));
  }, [activeObra, subcontratas]);

  // Filtered Albaranes by Obra, Subcontrata and Date Range
  const filteredAlbaranes = useMemo(() => {
    return albaranes
      .filter((a) => {
        if (a.projectId !== selectedObraId) return false;
        if (selectedSubId !== 'all' && a.subcontrataId !== selectedSubId) return false;
        if (startDate && a.date < startDate) return false;
        if (endDate && a.date > endDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [albaranes, selectedObraId, selectedSubId, startDate, endDate]);

  // Calculations for Oficiales vs Peones
  const stats = useMemo(() => {
    let horasOficial = 0;
    let horasPeon = 0;
    let horasExtraOficial = 0;
    let horasExtraPeon = 0;

    const workerMap = new Map<
      string,
      {
        workerId: string;
        workerName: string;
        category: string;
        isOficial: boolean;
        subcontrataName: string;
        diasTrabajados: Set<string>;
        totalHoras: number;
        extraHoras: number;
        tareas: Set<string>;
      }
    >();

    filteredAlbaranes.forEach((alb) => {
      alb.workers.forEach((w) => {
        const cat = w.workerCategory || '';
        const isOficial = cat.includes('Oficial') || cat.includes('Encargado');
        const isPeon = cat.includes('Peón');

        if (isOficial) {
          horasOficial += w.hours;
          horasExtraOficial += w.extraHours || 0;
        } else {
          // If category is Peón or other non-official
          horasPeon += w.hours;
          horasExtraPeon += w.extraHours || 0;
        }

        // Accumulate worker breakdown
        const existing = workerMap.get(w.workerId) || {
          workerId: w.workerId,
          workerName: w.workerName,
          category: w.workerCategory,
          isOficial,
          subcontrataName: alb.subcontrataName,
          diasTrabajados: new Set<string>(),
          totalHoras: 0,
          extraHoras: 0,
          tareas: new Set<string>(),
        };

        existing.diasTrabajados.add(alb.date);
        existing.totalHoras += w.hours;
        existing.extraHoras += w.extraHours || 0;
        if (w.taskDescription) existing.tareas.add(w.taskDescription);

        workerMap.set(w.workerId, existing);
      });
    });

    const totalHoras = horasOficial + horasPeon;
    const pctOficial = totalHoras > 0 ? Math.round((horasOficial / totalHoras) * 100) : 0;
    const pctPeon = totalHoras > 0 ? Math.round((horasPeon / totalHoras) * 100) : 0;

    const workersList = Array.from(workerMap.values()).sort((a, b) => {
      // Sort Oficiales first, then by total hours descending
      if (a.isOficial && !b.isOficial) return -1;
      if (!a.isOficial && b.isOficial) return 1;
      return b.totalHoras - a.totalHoras;
    });

    return {
      horasOficial,
      horasPeon,
      horasExtraOficial,
      horasExtraPeon,
      totalHoras,
      pctOficial,
      pctPeon,
      totalAlbaranes: filteredAlbaranes.length,
      workersList,
    };
  }, [filteredAlbaranes]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 block">
                Herramienta de Unificación & Control Técnico
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Resumen Acumulado de Obra por Rango de Fechas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewSheetMode(!viewSheetMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewSheetMode
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{viewSheetMode ? 'Ver Panel Interactivo' : 'Ver Hoja Oficial Imprimible'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Imprimir documento oficial en papel o guardar en PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-slate-900 bg-slate-50/50">
          {/* ============================================================ */}
          {/* BARRA DE FILTROS Y SELECCIÓN DE FECHAS (PRINT: HIDDEN) */}
          {/* ============================================================ */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Selector de Obra */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  1. Seleccionar Obra:
                </label>
                <select
                  value={selectedObraId}
                  onChange={(e) => setSelectedObraId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Subcontrata */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  2. Subcontrata:
                </label>
                <select
                  value={selectedSubId}
                  disabled={isSubcontrataUser}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {!isSubcontrataUser && (
                    <option value="all">Todas las Subcontratas (Unificado Total)</option>
                  )}
                  {availableSubcontratas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.trade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Desde */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  3. Fecha Inicio (Desde):
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold bg-white text-slate-900"
                />
              </div>

              {/* Fecha Hasta */}
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">
                  4. Fecha Fin (Hasta):
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Accesos Rápidos de Rango de Fechas */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[11px]">
                Rangos Predefinidos Rápidos:
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPreset('dia_1_a_25')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-colors cursor-pointer ${
                    startDate.endsWith('-01') && endDate.endsWith('-25')
                      ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  ⭐ Día 1 al 25 (Ejemplo)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('mes_completo')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    startDate === defaultStartDate && endDate === defaultEndDate
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  Mes Completo (1 al {lastDayOfMonth})
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('quincena_1')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  1ª Quincena (1 al 15)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('quincena_2')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  2ª Quincena (16 al fin)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('mes_anterior')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Mes Anterior
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* MODO 1: HOJA OFICIAL IMPRIMIBLE ("EN UNA SOLA HOJA") */}
          {/* ============================================================ */}
          {viewSheetMode ? (
            <div className="bg-white p-6 sm:p-10 rounded-2xl border-2 border-slate-900 shadow-md space-y-6 text-slate-900 print:p-0 print:border-none print:shadow-none">
              {/* Membrete Oficial */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">
                    Documento Oficial de Control de Producción y Unidades (Ud.)
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                    {CURRENT_CONSTRUCTORA.name}
                  </h1>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    CIF: {CURRENT_CONSTRUCTORA.cif} · {CURRENT_CONSTRUCTORA.address}
                  </p>
                  <p className="text-xs text-slate-500">
                    Dpto. Técnico y Dirección de Obra · Tel: {CURRENT_CONSTRUCTORA.phone}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-slate-200 w-full sm:w-auto">
                  <span className="inline-block px-3 py-1 bg-slate-950 text-amber-400 font-black text-xs uppercase tracking-wider rounded-lg font-mono mb-1">
                    CERTIFICACIÓN ACUMULADA DE UNIDADES (Ud.)
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    Periodo: {formatDateDisplay(startDate)} al {formatDateDisplay(endDate)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Fecha de Emisión: {new Date().toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              {/* Ficha de la Obra y Subcontrata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                    Datos de la Obra
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {activeObra?.title}
                  </h3>
                  <p className="text-slate-600 mt-0.5">
                    Código: <span className="font-mono font-bold">{activeObra?.code}</span> · {activeObra?.address}, {activeObra?.city}
                  </p>
                  <p className="text-slate-600">
                    Jefe de Obra: <span className="font-semibold">{activeObra?.jefeObraName}</span> · Encargado: <span className="font-semibold">{activeObra?.encargadoName}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                    Subcontrata / Gremio Ejecutante
                  </span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {activeSubcontrata?.companyName || 'Todas las Subcontratas Unificadas'}
                  </h3>
                  {activeSubcontrata && (
                    <>
                      <p className="text-slate-600 mt-0.5">
                        CIF: <span className="font-mono font-bold">{activeSubcontrata.cif}</span> · Especialidad: {activeSubcontrata.trade}
                      </p>
                      <p className="text-slate-600">
                        Responsable: {activeSubcontrata.contactPerson} · Tel: <span className="font-mono font-semibold">{activeSubcontrata.phone}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* CUADRO RESUMEN OFICIAL: UNIDADES DE OFICIAL Y UNIDADES DE PEÓN */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  Cuadro Resumen Acumulado de Unidades (Oficiales vs Peones)
                </h3>
                <div className="overflow-hidden rounded-xl border-2 border-slate-900">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-white font-extrabold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Categoría Profesional</th>
                        <th className="py-2.5 px-4 text-center">Nº Operarios</th>
                        <th className="py-2.5 px-4 text-right">Ud. Ordinarias</th>
                        <th className="py-2.5 px-4 text-right">Ud. Adicionales</th>
                        <th className="py-2.5 px-4 text-right">Total Unidades</th>
                        <th className="py-2.5 px-4 text-right">% Sobre Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-amber-50/50 font-medium">
                        <td className="py-3 px-4 font-black text-amber-950 flex items-center gap-2">
                          <HardHat className="w-4 h-4 text-amber-700" />
                          <span>UNIDADES DE OFICIAL (1ª, 2ª y Encargado)</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {stats.workersList.filter((w) => w.isOficial).length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {stats.horasOficial - stats.horasExtraOficial} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                          {stats.horasExtraOficial} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-base text-slate-950">
                          {stats.horasOficial} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-700">
                          {stats.pctOficial}%
                        </td>
                      </tr>

                      <tr className="bg-blue-50/40 font-medium">
                        <td className="py-3 px-4 font-black text-blue-950 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-700" />
                          <span>UNIDADES DE PEÓN (Especialista y Ordinario)</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {stats.workersList.filter((w) => !w.isOficial).length}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {stats.horasPeon - stats.horasExtraPeon} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {stats.horasExtraPeon} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-base text-slate-950">
                          {stats.horasPeon} Ud.
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-700">
                          {stats.pctPeon}%
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-black text-xs">
                      <tr>
                        <td className="py-3 px-4 uppercase tracking-wider font-extrabold" colSpan={4}>
                          TOTAL ACUMULADO DEL PERIODO ({stats.totalAlbaranes} partes diarios unificados)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-lg text-amber-400">
                          {stats.totalHoras} Ud.
                        </td>
                        <td className="py-3 px-4 text-right">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Desglose por Operarios */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  Relación Nominal de Trabajadores y Unidades (Ud.) Imputadas
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Operario</th>
                        <th className="py-2 px-3">DNI / NIE</th>
                        <th className="py-2 px-3">Categoría</th>
                        <th className="py-2 px-3 text-center">Tipo</th>
                        <th className="py-2 px-3 text-center">Jornadas</th>
                        <th className="py-2 px-3 text-right">Total Unidades (Ud.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.workersList.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{w.workerName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">
                            {w.workerId.replace('w-', '538910')}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{w.category}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                w.isOficial
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {w.isOficial ? 'OFICIAL' : 'PEÓN'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            {w.diasTrabajados.size} días
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            {w.totalHoras} Ud.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lista sintética de partes unificados comprendidos */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                  Partes Diarios Comprendidos en esta Hoja ({stats.totalAlbaranes})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {filteredAlbaranes.map((alb) => (
                    <div
                      key={alb.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 block text-[11px]">
                          {alb.albaranNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDateDisplay(alb.date)}
                        </span>
                      </div>
                      <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        {alb.totalHours} Ud.
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CAJETINES DE FIRMAS OFICIALES (TRIPLE VALIDACIÓN) */}
              <div className="pt-8 border-t-2 border-slate-900">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-4 text-center">
                  Conformidad, Aprobación y Validación Técnica en Obra
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-center">
                  {/* Firma Subcontrata */}
                  <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-slate-50/50">
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Por la Subcontrata
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {activeSubcontrata?.companyName || 'Empresa Subcontratista'}
                      </span>
                    </div>
                    <div className="pt-8 border-t border-dashed border-slate-300">
                      <p className="font-mono text-[11px] font-bold text-slate-700">
                        Firma & Sello de Conformidad
                      </p>
                      <p className="text-[10px] text-slate-400">Fecha: ___/___/2026</p>
                    </div>
                  </div>

                  {/* Firma Encargado */}
                  <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-slate-50/50">
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Encargado de Obra
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {activeObra?.encargadoName || 'Manuel Gómez'}
                      </span>
                    </div>
                    <div className="pt-8 border-t border-dashed border-slate-300">
                      <p className="font-mono text-[11px] font-bold text-slate-700">
                        Verificado a pie de obra
                      </p>
                      <p className="text-[10px] text-slate-400">Fecha: ___/___/2026</p>
                    </div>
                  </div>

                  {/* Firma Jefe de Obra */}
                  <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between min-h-[140px] bg-slate-50/50">
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Jefe de Obra (Constructora)
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {activeObra?.jefeObraName || 'Javier Aranda'}
                      </span>
                    </div>
                    <div className="pt-8 border-t border-dashed border-slate-300">
                      <p className="font-mono text-[11px] font-bold text-slate-700">
                        Aprobado y Certificado Final
                      </p>
                      <p className="text-[10px] text-slate-400">Fecha: ___/___/2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* MODO 2: PANEL INTERACTIVO DE ANÁLISIS */
            /* ============================================================ */
            <div className="space-y-6">
              {/* Tarjetas KPI Principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Unidades Oficial */}
                <div className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                      Unidades de Oficial
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <HardHat className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black font-mono text-slate-950">
                      {stats.horasOficial} Ud.
                    </span>
                    <span className="text-xs text-amber-700 font-bold ml-2">
                      ({stats.pctOficial}% del total)
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>Oficiales 1ª, 2ª y Enc.</span>
                    <span className="font-mono font-bold text-slate-700">
                      {stats.horasExtraOficial > 0 ? `+${stats.horasExtraOficial} Ud. adic.` : 'Ordinarias'}
                    </span>
                  </div>
                </div>

                {/* Unidades Peón */}
                <div className="bg-white p-5 rounded-2xl border-2 border-blue-300 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-800">
                      Unidades de Peón
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black font-mono text-slate-950">
                      {stats.horasPeon} Ud.
                    </span>
                    <span className="text-xs text-blue-700 font-bold ml-2">
                      ({stats.pctPeon}% del total)
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>Especialistas y Ord.</span>
                    <span className="font-mono font-bold text-slate-700">
                      {stats.horasExtraPeon > 0 ? `+${stats.horasExtraPeon} Ud. adic.` : 'Ordinarias'}
                    </span>
                  </div>
                </div>

                {/* Total Unidades Acumuladas */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-amber-400 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Total Acumulado
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black font-mono text-white">
                      {stats.totalHoras} Ud.
                    </span>
                    <span className="text-xs text-slate-400 ml-2">en {stats.totalAlbaranes} partes</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-amber-300/80">
                    Periodo: {formatDateDisplay(startDate)} al {formatDateDisplay(endDate)}
                  </div>
                </div>

                {/* Operarios Activos */}
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Operarios Activos
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black font-mono text-slate-950">
                      {stats.workersList.length}
                    </span>
                    <span className="text-xs text-slate-500 font-bold ml-2">operarios</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    Registrados en el periodo seleccionado
                  </div>
                </div>
              </div>

              {/* Barra Gráfica Visual de Unidades */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    Unidades de Oficial: {stats.horasOficial} Ud. ({stats.pctOficial}%)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    Unidades de Peón: {stats.horasPeon} Ud. ({stats.pctPeon}%)
                  </span>
                </div>

                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${stats.pctOficial}%` }}
                    className="bg-amber-400 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-slate-950"
                  />
                  <div
                    style={{ width: `${stats.pctPeon}%` }}
                    className="bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                  />
                </div>
              </div>

              {/* Tabla de Operarios */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">
                    Resumen Acumulado por Trabajador en el Periodo
                  </h3>
                  <span className="text-xs text-slate-500 font-mono font-bold">
                    {stats.workersList.length} trabajadores activos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Operario</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3 text-center">Tipo</th>
                        <th className="py-2.5 px-3 text-center">Jornadas</th>
                        <th className="py-2.5 px-3 text-right">Ud. Adicionales</th>
                        <th className="py-2.5 px-3 text-right">Total Unidades (Ud.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.workersList.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {w.workerName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{w.category}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                w.isOficial
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {w.isOficial ? 'OFICIAL' : 'PEÓN'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {w.diasTrabajados.size} días
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-800 font-bold">
                            {w.extraHoras > 0 ? `+${w.extraHoras} Ud.` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900">
                            {w.totalHoras} Ud.
                          </td>
                        </tr>
                      ))}

                      {stats.workersList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No se encontraron operarios en el rango de fechas seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detalle Cronológico de Todos los Partes Unificados */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">
                    Detalle Cronológico de los Partes Unificados ({filteredAlbaranes.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewSheetMode(true)}
                    className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <span>Ver en formato Hoja Oficial de Certificación</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {filteredAlbaranes.map((alb) => {
                    // Count oficiales vs peones in this single albaran
                    let albOficial = 0;
                    let albPeon = 0;
                    alb.workers.forEach((w) => {
                      if (w.workerCategory.includes('Oficial') || w.workerCategory.includes('Encargado')) {
                        albOficial += w.hours;
                      } else {
                        albPeon += w.hours;
                      }
                    });

                    return (
                      <div
                        key={alb.id}
                        onClick={() => onViewAlbaranDetail && onViewAlbaranDetail(alb)}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-slate-950">
                              {alb.albaranNumber}
                            </span>
                            <span className="text-slate-500 font-mono font-bold">
                              {formatDateDisplay(alb.date)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                alb.status === 'aprobado_final'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : alb.status === 'validado_subcontrata'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {alb.status === 'aprobado_final'
                                ? '✓ Aprobado Final'
                                : alb.status === 'validado_subcontrata'
                                ? 'Validado Subcontrata'
                                : 'Esperando Subcontrata'}
                            </span>
                          </div>

                          <p className="font-semibold text-slate-800 mt-1">
                            {alb.subcontrataName} · <span className="text-slate-500">{alb.tajoZone}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            Oficial: {albOficial} Ud.
                          </span>
                          <span className="text-[11px] font-mono text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                            Peón: {albPeon} Ud.
                          </span>
                          <span className="font-mono font-black text-sm text-slate-950 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {alb.totalHours} Ud.
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredAlbaranes.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      No hay partes en este rango de fechas. Selecciona otro rango arriba.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden shrink-0">
          <div className="text-xs text-slate-600">
            Resumen unificado de <span className="font-bold text-slate-900">{activeObra?.title}</span> · Del{' '}
            <span className="font-mono font-bold text-slate-900">{formatDateDisplay(startDate)}</span> al{' '}
            <span className="font-mono font-bold text-slate-900">{formatDateDisplay(endDate)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewSheetMode(!viewSheetMode)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
            >
              {viewSheetMode ? 'Volver a Vista Interactiva' : 'Ver en Hoja de Certificación'}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Exportar Hoja</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
