/**
 * @file geocoding-service.ts
 * @description Converts Web Mercator (Mercator projection) coordinates to a
 * human-readable address using the Google Geocoding REST API.
 *
 * Coordinates stored on-chain are in Web Mercator (EPSG:3857, meters).
 * The Geocoding API expects WGS-84 (degrees), so we first convert.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

/** Simple in-memory cache: key = "lat,lng" → address string */
const cache = new Map<string, string>()

/** Convert Web Mercator meters → WGS-84 degrees */
function fromMercator(xMeters: number, yMeters: number): { lat: number; lng: number } {
  const lng = (xMeters / 20037508.34) * 180
  const latRad = Math.atan(Math.exp((yMeters / 20037508.34) * Math.PI)) * 2 - Math.PI / 2
  const lat = (latRad * 180) / Math.PI
  return { lat, lng }
}

/**
 * Resolves a human-readable address for the given Web Mercator coordinates.
 *
 * @param latMercator - Y coordinate in Web Mercator meters (latitude axis)
 * @param lngMercator - X coordinate in Web Mercator meters (longitude axis)
 * @returns The formatted address string, or null if the lookup fails
 */
export async function reverseGeocode(
  latMercator: number,
  lngMercator: number
): Promise<string | null> {
  const cacheKey = `${latMercator},${lngMercator}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  if (!API_KEY) return null

  try {
    const { lat, lng } = fromMercator(lngMercator, latMercator)
    const url = `${GEOCODE_URL}?latlng=${lat},${lng}&language=es&result_type=route|street_address|locality&key=${API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== "OK" || !data.results?.length) {
      console.warn("Geocoding API failed:", data.status, data.error_message);
      return null;
    }

    // Prefer a route/street_address result; fall back to the first result
    const best =
      data.results.find((r: any) =>
        r.types?.some((t: string) => ["route", "street_address"].includes(t))
      ) ?? data.results[0]

    const address: string = best.formatted_address
    cache.set(cacheKey, address)
    return address
  } catch (e) {
    console.error("reverseGeocode error", e)
    return null
  }
}
