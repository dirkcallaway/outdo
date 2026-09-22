import { formatDisplayDate } from './date'

// One exercise's compact result, used to render the shareable text.
export interface ExerciseSummary {
  name: string
  count: number // number of sets that count (logged / completed)
  top: number // heaviest weight across those sets (0 = bodyweight)
  unit: string
}

// The compact plain-text summary we hand to the share sheet:
//   Push Day — Sat, Sep 21
//
//   Bench Press: 3 sets, top 65kg
//   Pull-ups: 8 sets
//
//   Tracked with OutDo
export function buildShareText(name: string, dateISO: string, summary: ExerciseSummary[]): string {
  const lines: string[] = [`${name} — ${formatDisplayDate(dateISO)}`, '']
  for (const e of summary) {
    const n = `${e.count} set${e.count === 1 ? '' : 's'}`
    lines.push(e.top > 0 ? `${e.name}: ${n}, top ${e.top}${e.unit}` : `${e.name}: ${n}`)
  }
  lines.push('', 'Tracked with OutDo')
  return lines.join('\n')
}

// Hand text to the native share sheet, falling back to the clipboard on
// platforms without the Web Share API (e.g. desktop browsers).
export async function shareOrCopyText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch {
      return 'cancelled' // user dismissed the sheet
    }
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
