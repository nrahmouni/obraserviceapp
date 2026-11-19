import React, { useState, useEffect } from 'react';
import {
  ObraProject,
  Subcontrata,
  StaffMember,
  AlbaranDiario,
} from '../types';
import { CURRENT_CONSTRUCTORA } from '../data/mockData';
import {
  getMonthYearString,
  getMonthKey,
  getCurrentMonthKey,
  formatDayHeader,
} from '../utils/dateUtils';
import { DayCalendarBar, groupAlbaranesByDay } from './DayCalendarBar';
import {
  Building2,
  Users,
  HardHat,
  ShieldCheck,
  Plus,
  Trash2,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Folder,
  FolderOpen,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Eye,
  FileText,
} from 'lucide-react';

interface ConstructoraAdminViewProps {
  obras: ObraProject[];
  subcontratas: Subcontrata[];
  staff: StaffMember[];
  albaranes: AlbaranDiario[];
  onCreateObra: (newObra: ObraProject) => void;
  onAddSubcontrata: (newSub: Subcontrata) => void;
  onAddStaff: (newStaff: StaffMember) => void;
  onViewAlbaranDetail: (albaran: AlbaranDiario) => void;
  onOpenResumenAcumulado?: (obraId?: string) => void;
}

export const ConstructoraAdminView: React.FC<ConstructoraAdminViewProps> = ({
  obras,
  subcontratas,
  staff,
  albaranes,
  onCreateObra,
  onAddSubcontrata,
  onAddStaff,
  onViewAlbaranDetail,
  onOpenResumenAcumulado,
}) => {
  const [activeTab, setActiveTab] = useState<'obras' | 'subcontratas' | 'staff'>('obras');

  // Modals state
  const [isNewObraOpen, setIsNewObraOpen] = useState(false);
  const [isNewSubOpen, setIsNewSubOpen] = useState(false);
  const [isNewStaffOpen, setIsNewStaffOpen] = useState(false);

  // Drill-down navigation: Level 1 (Obras) -> Level 2 (Subcontratas en Obra) -> Level 3 (Partes por Mes y Día)
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null); // 'all' or specific subcontrataId
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [selectedDay, setSelectedDay] = useState<string>('all');

  useEffect(() => {
    if (!selectedObraId) return;
    const scopedAlbaranes = albaranes.filter(
      (a) =>
        a.projectId === selectedObraId &&
        (!selectedSubId || selectedSubId === 'all' || a.subcontrataId === selectedSubId)
    );
    const months = Array.from(new Set(scopedAlbaranes.map((a) => getMonthKey(a.date))))
      .sort()
      .reverse();
    if (months.length > 0 && !months.includes(selectedMonthKey)) {
      setSelectedMonthKey(months[0]);
      setSelectedDay('all');
    }
  }, [albaranes, selectedObraId, selectedSubId, selectedMonthKey]);

  // New Obra Form
  const [obraTitle, setObraTitle] = useState('');
  const [obraCode, setObraCode] = useState(`OB-${new Date().getFullYear()}/04`);
  const [obraAddress, setObraAddress] = useState('');
  const [obraCity, setObraCity] = useState('Madrid');
  const [obraJefeId, setObraJefeId] = useState(staff.find((s) => s.role === 'jefe_obra')?.id || '');
  const [obraEncargadoId, setObraEncargadoId] = useState(staff.find((s) => s.role === 'encargado')?.id || '');
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  // New Subcontrata Form
  const [subName, setSubName] = useState('');
  const [subCif, setSubCif] = useState('');
  const [subTrade, setSubTrade] = useState('Estructuras & Albañilería');
  const [subContact, setSubContact] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subEmail, setSubEmail] = useState('');

  // New Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'jefe_obra' | 'encargado'>('encargado');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');

  const handleCreateObraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraTitle.trim() || !obraAddress.trim()) return;

    const jefe = staff.find((s) => s.id === obraJefeId);
    const encargado = staff.find((s) => s.id === obraEncargadoId);

    const newObra: ObraProject = {
      id: `obra-${Date.now()}`,
      code: obraCode.trim() || `OB-${Math.floor(100 + Math.random() * 900)}`,
      title: obraTitle.trim(),
      address: obraAddress.trim(),
      city: obraCity.trim(),
      startDate: new Date().toISOString().split('T')[0],
      status: 'activa',
      jefeObraId: obraJefeId,
      jefeObraName: jefe ? jefe.name : 'Jefe de Obra Asignado',
      encargadoId: obraEncargadoId,
      encargadoName: encargado ? encargado.name : 'Encargado Asignado',
      subcontrataIds: selectedSubIds.length > 0 ? selectedSubIds : [subcontratas[0]?.id || ''],
      coverImage: '/src/assets/images/hero_reforma_piso_1792174307000.jpg',
    };

    onCreateObra(newObra);
    setIsNewObraOpen(false);
    setObraTitle('');
    setObraAddress('');
  };

  const handleCreateSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCif.trim()) return;

    const newSub: Subcontrata = {
      id: `sub-${Date.now()}`,
      companyName: subName.trim(),
      cif: subCif.trim().toUpperCase(),
      trade: subTrade.trim(),
      contactPerson: subContact.trim() || 'Responsable',
      phone: subPhone.trim() || '+34 600 000 000',
      email: subEmail.trim() || 'contacto@subcontrata.es',
      hourlyRateStandard: 0,
      assignedProjectIds: [obras[0]?.id || ''],
    };

    onAddSubcontrata(newSub);
    setIsNewSubOpen(false);
    setSubName('');
    setSubCif('');
    setSubContact('');
    setSubPhone('');
  };

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: staffName.trim(),
      role: staffRole,
      phone: staffPhone.trim(),
      email: staffEmail.trim(),
      activeProjectsCount: 1,
    };

    onAddStaff(newMember);
    setIsNewStaffOpen(false);
    setStaffName('');
    setStaffPhone('');
    setStaffEmail('');
  };

  const toggleSubSelectionForNewObra = (id: string) => {
    if (selectedSubIds.includes(id)) {
      setSelectedSubIds(selectedSubIds.filter((s) => s !== id));
    } else {
      setSelectedSubIds([...selectedSubIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Constructora */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400">
                Sede Central · Dirección de Obras
              </span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                CIF: {CURRENT_CONSTRUCTORA.cif}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              {CURRENT_CONSTRUCTORA.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Control centralizado de obras, asignación de subcontratas y supervisión de albaranes diarios
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(selectedObraId || undefined)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer"
              title="Unificar partes por rango de fechas (ej. día 1 al 25) y ver unidades (Ud.) de oficiales y peones"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
              <span>Hoja Resumen Acumulado</span>
            </button>

            <button
              onClick={() => setIsNewObraOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Obra</span>
            </button>
            <button
              onClick={() => setIsNewSubOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Subcontrata</span>
            </button>
            <button
              onClick={() => setIsNewStaffOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl shadow transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Técnico</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar text-xs font-bold">
        <button
          onClick={() => setActiveTab('obras')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'obras'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Obras y Partes ({obras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subcontratas')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'subcontratas'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Subcontratas Homologadas ({subcontratas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Jefes de Obra y Encargados ({staff.length})</span>
        </button>
      </div>

      {/* TAB 1: ACCESO SENCILLO POR OBRAS -> SUBCONTRATAS EN OBRA -> PARTES */}
      {activeTab === 'obras' && (() => {
        const activeObra = obras.find((o) => o.id === selectedObraId);
        const obraAlbaranes = activeObra
          ? albaranes.filter((a) => a.projectId === activeObra.id)
          : [];

        // NIVEL 1: CARPETAS DE OBRAS
        if (!selectedObraId || !activeObra) {
          return (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Carpetas de Obras en Ejecución
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paso 1: Selecciona una obra para ver sus subcontratas y consultar todos sus partes diarios.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {obras.length} Obras · {albaranes.length} Partes totales
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {obras.map((obra) => {
                  const thisObraAlbs = albaranes.filter((a) => a.projectId === obra.id);
                  const totalHoursObra = thisObraAlbs.reduce((sum, a) => sum + a.totalHours, 0);
                  const certifiedCount = thisObraAlbs.filter((a) => a.status === 'aprobado_final').length;
                  const inProgressCount = thisObraAlbs.length - certifiedCount;
                  const uniqueSubCount = new Set([
                    ...obra.subcontrataIds.filter(Boolean),
                    ...thisObraAlbs.map((a) => a.subcontrataId),
                  ]).size;

                  return (
                    <div
                      key={obra.id}
                      onClick={() => {
                        setSelectedObraId(obra.id);
                        setSelectedSubId(null);
                      }}
                      className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-900 p-6 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-slate-900 text-amber-800 group-hover:text-amber-400 flex items-center justify-center transition-colors shadow-xs">
                            <Folder className="w-6 h-6 stroke-[2.2]" />
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {inProgressCount > 0 ? (
                              <span className="text-[11px] font-extrabold bg-amber-100 border border-amber-300 text-amber-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>{inProgressCount} en circuito</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Al día</span>
                              </span>
                            )}
                            {certifiedCount > 0 && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {certifiedCount} certificados
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-slate-700">
                          {obra.code}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 leading-snug mt-0.5">
                          {obra.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{obra.address}, {obra.city}</span>
                        </p>

                        <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                          <p>
                            <span className="font-bold">Jefe de Obra:</span> {obra.jefeObraName}
                          </p>
                          <p>
                            <span className="font-bold">Encargado:</span> {obra.encargadoName}
                          </p>
                          <p>
                            <span className="font-bold">Subcontratas en obra:</span>{' '}
                            {uniqueSubCount} empresas
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {totalHoursObra} Ud.
                          </span>{' '}
                          <span className="text-slate-400 font-medium">
                            ({thisObraAlbs.length} partes)
                          </span>
                        </div>

                        <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 group-hover:bg-amber-400 text-white group-hover:text-slate-950 font-extrabold flex items-center gap-1 transition-colors shadow-xs">
                          <span>Abrir Obra</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Compute subcontratas participating in this obra (assigned OR having albaranes)
        const subIdsInObra = Array.from(
          new Set([
            ...activeObra.subcontrataIds.filter(Boolean),
            ...obraAlbaranes.map((a) => a.subcontrataId),
          ])
        );
        const subsInObra = subIdsInObra
          .map((id) => subcontratas.find((s) => s.id === id))
          .filter((s): s is Subcontrata => Boolean(s));

        // NIVEL 2: SUBCONTRATAS EN LA OBRA SELECCIONADA
        if (!selectedSubId) {
          const totalHoursActiveObra = obraAlbaranes.reduce((s, a) => s + a.totalHours, 0);

          return (
            <div className="space-y-5">
              {/* Obra Breadcrumb Header */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {activeObra.code}
                      </span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                        Obra Seleccionada
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {activeObra.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Jefe de Obra: <span className="font-semibold text-slate-700">{activeObra.jefeObraName}</span> · Encargado: <span className="font-semibold text-slate-700">{activeObra.encargadoName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-left">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Acumulado Obra
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900">
                      {totalHoursActiveObra} Ud. ({obraAlbaranes.length} partes)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(activeObra.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Hoja Resumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedObraId(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Obras</span>
                  </button>
                </div>
              </div>

              {/* Paso 2 Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Paso 2 · Subcontratas en esta Obra ({subsInObra.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Elige una subcontrata para consultar sus partes diarios en {activeObra.title}, o visualiza todas juntas.
                  </p>
                </div>

                {obraAlbaranes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const mKeys = Array.from(new Set(obraAlbaranes.map((a) => getMonthKey(a.date))))
                        .sort()
                        .reverse();
                      setSelectedMonthKey(mKeys[0] || getCurrentMonthKey());
                      setSelectedDay('all');
                      setSelectedSubId('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Todos los Partes de la Obra ({obraAlbaranes.length})</span>
                  </button>
                )}
              </div>

              {/* Subcontrata Folders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subsInObra.map((sub) => {
                  const subObraAlbs = obraAlbaranes.filter((a) => a.subcontrataId === sub.id);
                  const subHours = subObraAlbs.reduce((s, a) => s + a.totalHours, 0);
                  const certCount = subObraAlbs.filter((a) => a.status === 'aprobado_final').length;
                  const pendingSubCount = subObraAlbs.filter((a) => a.status === 'pendiente_subcontrata').length;
                  const pendingJefeCount = subObraAlbs.filter((a) => a.status === 'validado_subcontrata').length;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        const mKeys = Array.from(new Set(subObraAlbs.map((a) => getMonthKey(a.date))))
                          .sort()
                          .reverse();
                        setSelectedMonthKey(mKeys[0] || getCurrentMonthKey());
                        setSelectedDay('all');
                        setSelectedSubId(sub.id);
                      }}
                      className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 p-6 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white flex items-center justify-center transition-colors">
                            <Users className="w-5 h-5 stroke-[2.2]" />
                          </div>

                          <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {sub.trade}
                          </span>
                        </div>

                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          CIF: {sub.cif}
                        </span>
                        <h4 className="text-base font-black text-slate-900 group-hover:text-blue-950 mt-0.5">
                          {sub.companyName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Responsable: {sub.contactPerson} · {sub.phone}
                        </p>

                        <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                          <p className="flex justify-between">
                            <span className="text-slate-500">Unidades en esta obra:</span>
                            <span className="font-mono font-black text-slate-900">{subHours} Ud.</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Partes diarios:</span>
                            <span className="font-mono font-bold text-slate-800">{subObraAlbs.length} partes</span>
                          </p>
                          <p className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-600 font-semibold">Certificados finales:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {certCount} / {subObraAlbs.length}
                            </span>
                          </p>
                          {(pendingSubCount > 0 || pendingJefeCount > 0) && (
                            <p className="flex justify-between text-[11px] text-amber-800 font-bold">
                              <span>En validación:</span>
                              <span>
                                {pendingSubCount > 0 ? `${pendingSubCount} subcontrata` : ''}
                                {pendingSubCount > 0 && pendingJefeCount > 0 ? ' · ' : ''}
                                {pendingJefeCount > 0 ? `${pendingJefeCount} jefe obra` : ''}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                        <span className="px-3.5 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
                          <span>Ver Partes ({subObraAlbs.length})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}

                {subsInObra.length === 0 && (
                  <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                    Esta obra aún no tiene subcontratas asignadas ni partes registrados.
                  </div>
                )}
              </div>
            </div>
          );
        }

        // NIVEL 3: PARTES DE LA SUBCONTRATA (O TODAS) EN LA OBRA SELECCIONADA, ORGANIZADOS POR MES
        const activeSub = selectedSubId === 'all' ? null : subcontratas.find((s) => s.id === selectedSubId);
        const scopedAlbaranes =
          selectedSubId === 'all'
            ? obraAlbaranes
            : obraAlbaranes.filter((a) => a.subcontrataId === selectedSubId);

        const availableMonths = Array.from(
          new Set(scopedAlbaranes.map((a) => getMonthKey(a.date)))
        )
          .sort()
          .reverse();
        if (availableMonths.length === 0) availableMonths.push(getCurrentMonthKey());

        const monthAlbaranes = scopedAlbaranes
          .filter((a) => getMonthKey(a.date) === selectedMonthKey)
          .sort((a, b) => b.date.localeCompare(a.date));

        const visibleAlbaranes =
          selectedDay === 'all'
            ? monthAlbaranes
            : monthAlbaranes.filter((a) => a.date === selectedDay);

        const dayGroups = groupAlbaranesByDay(visibleAlbaranes);

        return (
          <div className="space-y-5">
            {/* Breadcrumb & Subcontrata Header */}
            <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 flex-wrap mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedObraId(null);
                        setSelectedSubId(null);
                        setSelectedDay('all');
                      }}
                      className="hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      Obras
                    </button>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubId(null);
                        setSelectedDay('all');
                      }}
                      className="hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      {activeObra.title}
                    </button>
                    <span>/</span>
                    <span className="text-blue-700 font-extrabold">
                      {activeSub ? activeSub.companyName : 'Todas las Subcontratas'}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {activeSub ? activeSub.companyName : `Todos los Partes · ${activeObra.title}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeSub
                      ? `${activeSub.trade} · Obra: ${activeObra.title} (${activeObra.code})`
                      : `Todas las subcontratas en ${activeObra.title} (${activeObra.code})`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenResumenAcumulado && onOpenResumenAcumulado(activeObra.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Hoja Resumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubId(null);
                      setSelectedDay('all');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cambiar Subcontrata</span>
                  </button>
                </div>
              </div>

              {/* Month Tabs */}
              <div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                  Mes de Trabajo:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {availableMonths.map((mKey) => {
                    const isSelected = selectedMonthKey === mKey;
                    const monthName = getMonthYearString(`${mKey}-01`);
                    const inM = scopedAlbaranes.filter((a) => getMonthKey(a.date) === mKey);
                    const hrsM = inM.reduce((s, a) => s + a.totalHours, 0);

                    return (
                      <button
                        key={mKey}
                        type="button"
                        onClick={() => {
                          setSelectedMonthKey(mKey);
                          setSelectedDay('all');
                        }}
                        className={`px-4 py-2.5 rounded-xl border-2 text-xs transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                        }`}
                      >
                        <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>{monthName}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/15 text-amber-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {inM.length} partes · {hrsM} Ud.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Barra de Días + Calendario del Mes */}
            <DayCalendarBar
              monthKey={selectedMonthKey}
              albaranes={monthAlbaranes}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              accentColor="slate"
            />

            {/* Partes Segmentados por Día */}
            <div className="space-y-5">
              {dayGroups.map((group) => (
                <div key={group.date} className="space-y-3">
                  {/* Day Header */}
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
                      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-900 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-slate-950">
                              {alb.albaranNumber}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
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
                                ? '✓ Certificado Final'
                                : alb.status === 'validado_subcontrata'
                                ? 'VºBº Subcontrata OK (Pend. Jefe Obra)'
                                : alb.status === 'observado'
                                ? 'Con Discrepancia'
                                : 'Esperando VºBº Subcontrata'}
                            </span>
                          </div>

                          <p className="text-sm font-extrabold text-slate-900 mt-1">
                            {selectedSubId === 'all' ? `${alb.subcontrataName} · ` : ''}
                            <span className="text-slate-600 font-semibold">{alb.tajoZone || 'Tajo general'}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Emitido por: {alb.createdByEncargadoName} · {alb.workers.length} operario(s)
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block font-medium">Total Unidades</span>
                            <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                              {alb.totalHours} Ud.
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:underline">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Parte Completo →</span>
                          </span>
                        </div>
                      </div>

                      {/* Compact worker pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {alb.workers.map((w, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <span className="font-bold text-slate-800">{w.workerName}</span>
                            <span className="text-slate-400">({w.workerCategory})</span>
                            <span className="font-mono font-black text-amber-800">{w.hours} Ud.</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {dayGroups.length === 0 && (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No hay partes registrados para esta selección en el periodo elegido.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 2: SUBCONTRATAS */}
      {activeTab === 'subcontratas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcontratas.map((sub) => {
            const subAlbaranes = albaranes.filter((a) => a.subcontrataId === sub.id);
            const totalHours = subAlbaranes.reduce((s, a) => s + a.totalHours, 0);
            const approvedCount = subAlbaranes.filter((a) => a.status === 'aprobado_final').length;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      CIF: {sub.cif}
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {sub.trade}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {sub.companyName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Contacto: {sub.contactPerson} ({sub.phone})
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Unidades Totales (Ud.):</span>
                      <span className="font-mono font-bold text-amber-700">
                        {totalHours} Ud.
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Albaranes Registrados:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {subAlbaranes.length} partes
                      </span>
                    </p>
                    <p className="flex justify-between font-bold pt-1 border-t border-slate-200">
                      <span>Partes Certificados:</span>
                      <span className="font-mono text-emerald-800">
                        {approvedCount} / {subAlbaranes.length}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{sub.assignedProjectIds.length} obras adjudicadas</span>
                  <a
                    href={`tel:${sub.phone}`}
                    className="font-mono font-semibold text-blue-600 hover:underline"
                  >
                    Llamar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: PERSONAL TÉCNICO (JEFES Y ENCARGADOS) */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mb-2 ${
                    member.role === 'jefe_obra'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                  }`}
                >
                  {member.role === 'jefe_obra' ? 'Jefe de Obra (Verificador)' : 'Encargado a Pie de Obra'}
                </span>

                <h3 className="text-base font-extrabold text-slate-900">
                  {member.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {member.phone}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {member.email}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <span>{member.activeProjectsCount} obras asignadas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Obra */}
      {isNewObraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Alta de Nueva Obra en la Constructora
              </h3>
              <button
                onClick={() => setIsNewObraOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObraSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Código de Obra</label>
                <input
                  type="text"
                  value={obraCode}
                  onChange={(e) => setObraCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre de la Obra</label>
                <input
                  type="text"
                  placeholder="Ej. Residencial Las Lomas Fase I"
                  value={obraTitle}
                  onChange={(e) => setObraTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dirección y Ciudad</label>
                <input
                  type="text"
                  placeholder="Calle, número y ciudad..."
                  value={obraAddress}
                  onChange={(e) => setObraAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jefe de Obra</label>
                  <select
                    value={obraJefeId}
                    onChange={(e) => setObraJefeId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {staff
                      .filter((s) => s.role === 'jefe_obra')
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Encargado</label>
                  <select
                    value={obraEncargadoId}
                    onChange={(e) => setObraEncargadoId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {staff
                      .filter((s) => s.role === 'encargado')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Adjudicar Subcontratas a esta Obra
                </label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {subcontratas.map((sub) => {
                    const isChecked = selectedSubIds.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubSelectionForNewObra(sub.id)}
                          className="rounded text-amber-500"
                        />
                        <span className="font-semibold text-slate-800">
                          {sub.companyName}
                        </span>
                        <span className="text-[11px] text-slate-400">({sub.trade})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewObraOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow"
                >
                  Crear Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Añadir Subcontrata */}
      {isNewSubOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Añadir y Homologar Nueva Subcontrata
              </h3>
              <button
                onClick={() => setIsNewSubOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Razón Social</label>
                <input
                  type="text"
                  placeholder="Ej. Estructuras del Henares S.L."
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CIF</label>
                  <input
                    type="text"
                    placeholder="B-..."
                    value={subCif}
                    onChange={(e) => setSubCif(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Oficio / Gremio</label>
                  <input
                    type="text"
                    placeholder="Ej. Ferralla, Pintura..."
                    value={subTrade}
                    onChange={(e) => setSubTrade(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    placeholder="Nombre del gerente o jefe de equipo"
                    value={subContact}
                    onChange={(e) => setSubContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+34 600..."
                    value={subPhone}
                    onChange={(e) => setSubPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSubOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow"
                >
                  Registrar Subcontrata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Staff (Jefe de Obra o Encargado) */}
      {isNewStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Alta de Técnico (Jefe de Obra / Encargado)
              </h3>
              <button
                onClick={() => setIsNewStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rol en la Constructora</label>
                <select
                  value={staffRole}
                  onChange={(e) =>
                    setStaffRole(e.target.value as 'jefe_obra' | 'encargado')
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="encargado">Encargado de Obra (A pie de obra)</option>
                  <option value="jefe_obra">Jefe de Obra (Validador Final)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Mendoza Gil"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Teléfono Corporativo</label>
                <input
                  type="tel"
                  placeholder="+34 600..."
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="tecnico@cenitconstrucciones.es"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewStaffOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow"
                >
                  Guardar Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
