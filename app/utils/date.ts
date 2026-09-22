// Local-time date helpers. We store workout dates as "YYYY-MM-DD" in the user's
// local day so the calendar lines up with what they actually did.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface CalendarCell {
  date: string // YYYY-MM-DD
  day: number
  inMonth: boolean
  isToday: boolean
}

// Build a 6-week (42 cell) grid for the given month, Monday-first.
export function buildMonthGrid(year: number, month: number, today = todayISO()): CalendarCell[] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // 0 = Monday
  const start = new Date(year, month, 1 - startOffset)

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toISODate(d)
    cells.push({
      date: iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today
    })
  }
  return cells
}

export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
