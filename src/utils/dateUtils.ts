export const getTodayDateKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const shiftDateKey = (dateStr: string, deltaDays: number): string => {
  const parts = dateStr.split('-').map(Number);
  const base =
    parts.length === 3 && !parts.some(isNaN)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();
  base.setDate(base.getDate() + deltaDays);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getCurrentMonthKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const getMonthYearString = (dateStr: string): string => {
  if (!dateStr) return getMonthYearString(`${getCurrentMonthKey()}-01`);
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const monthName = monthNames[monthIdx] || 'Mes';
  return `${monthName} ${year}`;
};

export const getMonthKey = (dateStr: string): string => {
  if (!dateStr) return getCurrentMonthKey();
  return dateStr.substring(0, 7); // 'YYYY-MM'
};

const WEEKDAYS_FULL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTHS_LOWER = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export const formatDayHeader = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const weekday = WEEKDAYS_FULL[d.getDay()];
  const day = d.getDate();
  const month = MONTHS_LOWER[d.getMonth()];
  const year = d.getFullYear();
  return `${weekday}, ${day} de ${month} de ${year}`;
};

export const getShortDayLabel = (
  dateStr: string
): { weekdayShort: string; dayNum: number; monthShort: string } => {
  const d = parseLocalDate(dateStr);
  if (!d) {
    return { weekdayShort: '', dayNum: 0, monthShort: '' };
  }
  return {
    weekdayShort: WEEKDAYS_SHORT[d.getDay()],
    dayNum: d.getDate(),
    monthShort: MONTHS_SHORT[d.getMonth()],
  };
};

export const getDaysInMonthGrid = (monthKey: string): Array<string | null> => {
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  if (isNaN(year) || isNaN(month)) return [];

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first offset (0 = Monday, ..., 6 = Sunday)
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: Array<string | null> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
};
