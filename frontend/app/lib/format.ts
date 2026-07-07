import type { PropertyType } from "../models/types"

export function usdc(n: number) {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC`
}

export function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

export function dateLabel(iso?: string | number) {
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

const now = new Date();
export const CURRENT_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

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

export function getGoogleMapsPhoto(address: string): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyFakeKeyPlaceholder"
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=17&size=600x400&markers=color:red%7C${encodeURIComponent(address)}&key=${apiKey}`
}

export function resolveIpfsUrl(ipfsRef: string): string {
  if (!ipfsRef) return ""
  if (ipfsRef.startsWith("ipfs://")) {
    const gateway = import.meta.env.VITE_IPFS_GATEWAY || "https://ipfs.io/ipfs/"
    return ipfsRef.replace("ipfs://", gateway)
  }
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})$/.test(ipfsRef)) {
    const gateway = import.meta.env.VITE_IPFS_GATEWAY || "https://ipfs.io/ipfs/"
    return `${gateway}${ipfsRef}`
  }
  return ipfsRef
}

export function formatPropertyImage(images?: string[] | string, address?: string): string {
  if (Array.isArray(images) && images.length > 0 && images[0]) {
    return resolveIpfsUrl(images[0])
  }
  if (typeof images === "string" && images.trim().length > 0) {
    return resolveIpfsUrl(images)
  }
  if (address) {
    return getGoogleMapsPhoto(address)
  }
  return "/images/prop-placeholder.png"
}
