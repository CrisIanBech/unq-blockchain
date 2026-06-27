import type { PropertyType } from "../models/types"

export function usdc(n: number) {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC`
}

export function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

export function dateLabel(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

export const TYPE_LABEL: Record<PropertyType, string> = {
  departamento: "Departamento",
  casa: "Casa",
  ph: "PH",
  local: "Local",
  oficina: "Oficina",
}

export const CURRENT_MONTH = "2026-06"

/** Returns the next N months (including given start) as ISO strings. */
export function nextMonths(count: number, startIso = "2025-09") {
  const [y, m] = startIso.split("-").map(Number)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m - 1 + i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return out
}
