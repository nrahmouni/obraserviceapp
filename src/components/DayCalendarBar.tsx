import React, { useState, useMemo } from 'react';
import { AlbaranDiario } from '../types';
import {
  formatDayHeader,
  getShortDayLabel,
  getDaysInMonthGrid,
  getMonthYearString,
} from '../utils/dateUtils';
import { CalendarDays, ListFilter } from 'lucide-react';

interface DayCalendarBarProps {
  monthKey: string;
  albaranes: AlbaranDiario[];
  selectedDay: string; // 'all' or 'YYYY-MM-DD'
  onSelectDay: (day: string) => void;
  accentColor?: 'slate' | 'blue' | 'emerald' | 'amber';
  defaultExpanded?: boolean;
}

export const DayCalendarBar: React.FC<DayCalendarBarProps> = ({
  monthKey,
  albaranes,
  selectedDay,
  onSelectDay,
  accentColor = 'slate',
  defaultExpanded = false,
}) => {
  const [showCalendarGrid, setShowCalendarGrid] = useState(defaultExpanded);

  // Group albaranes by exact date ('YYYY-MM-DD')
  const dayStats = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        count: number;
        totalUd: number;
        hasPending: boolean;
      }
    >();

    albaranes.forEach((alb) => {
      const existing = map.get(alb.date) || {
        date: alb.date,
        count: 0,
        totalUd: 0,
        hasPending: false,
      };
      existing.count += 1;
      existing.totalUd += alb.totalHours;
      if (alb.status !== 'aprobado_final') {
        existing.hasPending = true;
      }
      map.set(alb.date, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [albaranes]);

  const dayMap = useMemo(() => {
    const m = new Map<string, { count: number; totalUd: number; hasPending: boolean }>();
    dayStats.forEach((d) => m.set(d.date, d));
    return m;
  }, [dayStats]);

  const calendarCells = useMemo(() => getDaysInMonthGrid(monthKey), [monthKey]);

  const totalMonthUd = albaranes.reduce((s, a) => s + a.totalHours, 0);

  const activeStyles: Record<string, string> = {
    slate: 'bg-slate-900 text-white border-slate-900',
    blue: 'bg-blue-600 text-white border-blue-600',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    amber: 'bg-amber-400 text-slate-950 border-amber-500',
  };

  const activeChipClass = activeStyles[accentColor] || activeStyles.slate;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Filtrar por Día · {getMonthYearString(`${monthKey}-01`)}
          </span>
          {selectedDay !== 'all' && (
            <span className="text-[11px] font-bold bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
              {formatDayHeader(selectedDay)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCalendarGrid(!showCalendarGrid)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            showCalendarGrid
              ? 'bg-slate-900 text-amber-400 border-slate-900'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{showCalendarGrid ? 'Ocultar Calendario' : 'Ver Calendario del Mes'}</span>
        </button>
      </div>

      {/* Scrollable Barra de Días */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onSelectDay('all')}
          className={`px-3.5 py-2 rounded-xl border-2 text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
            selectedDay === 'all'
              ? `${activeChipClass} font-black shadow-xs`
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700 font-bold'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Todos los días</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              selectedDay === 'all'
                ? accentColor === 'amber'
                  ? 'bg-slate-950 text-amber-300'
                  : 'bg-white/20 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {albaranes.length} · {totalMonthUd} Ud.
          </span>
        </button>

        {dayStats.map((d) => {
          const isSelected = selectedDay === d.date;
          const { weekdayShort, dayNum, monthShort } = getShortDayLabel(d.date);

          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelectDay(isSelected ? 'all' : d.date)}
              className={`px-3 py-2 rounded-xl border-2 text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? `${activeChipClass} font-black shadow-xs`
                  : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800 font-bold'
              }`}
            >
              <div className="text-left leading-tight">
                <span className="text-[10px] uppercase opacity-75 block">
                  {weekdayShort} {monthShort}
                </span>
                <span className="text-sm font-black font-mono">Día {dayNum}</span>
              </div>

              <div className="flex flex-col items-end leading-tight pl-1 border-l border-current/15">
                <span className="text-[10px] font-mono font-bold">
                  {d.count} {d.count === 1 ? 'parte' : 'partes'}
                </span>
                <span className="text-[10px] font-mono opacity-80">{d.totalUd} Ud.</span>
              </div>

              {d.hasPending && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30 shrink-0"
                  title="Tiene partes pendientes de completar circuito"
                />
              )}
            </button>
          );
        })}

        {dayStats.length === 0 && (
          <span className="text-xs text-slate-400 italic px-2">
            No hay días con partes en este mes.
          </span>
        )}
      </div>

      {/* Expandable Monthly Calendar Grid */}
      {showCalendarGrid && (
        <div className="pt-3 border-t border-slate-100">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-400 mb-1.5">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-xl bg-slate-50/40" />;
              }
              const info = dayMap.get(dateStr);
              const dayNum = parseInt(dateStr.split('-')[2], 10);
              const isSelected = selectedDay === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!info}
                  onClick={() => info && onSelectDay(isSelected ? 'all' : dateStr)}
                  className={`h-12 sm:h-14 rounded-xl border text-xs flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? `${activeChipClass} font-black shadow-sm cursor-pointer`
                      : info
                      ? 'border-slate-300 bg-amber-50/60 hover:border-slate-900 hover:bg-amber-100/70 text-slate-900 font-bold cursor-pointer'
                      : 'border-slate-100 bg-slate-50/60 text-slate-300 cursor-default'
                  }`}
                >
                  <span className="font-mono text-xs sm:text-sm leading-none">{dayNum}</span>
                  {info && (
                    <span
                      className={`text-[9px] font-mono mt-1 px-1 rounded leading-tight ${
                        isSelected
                          ? accentColor === 'amber'
                            ? 'bg-slate-950 text-amber-300'
                            : 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {info.count}p · {info.totalUd}u
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility helper to group a list of albaranes by day (descending) for segmented display
export function groupAlbaranesByDay(
  list: AlbaranDiario[]
): Array<{ date: string; albaranes: AlbaranDiario[]; totalUd: number }> {
  const map = new Map<string, AlbaranDiario[]>();
  list.forEach((alb) => {
    const arr = map.get(alb.date) || [];
    arr.push(alb);
    map.set(alb.date, arr);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, albs]) => ({
      date,
      albaranes: albs,
      totalUd: albs.reduce((s, a) => s + a.totalHours, 0),
    }));
}
