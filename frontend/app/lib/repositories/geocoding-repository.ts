export interface IGeocodingRepository {
  reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null>;
}

export class GeocodingRepository implements IGeocodingRepository {
  private mercatorToLatLon(latMercator: number, lonMercator: number) {
    const lon = (lonMercator / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((latMercator / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
    return { lat, lon };
  }

  async reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null> {
    if (latMercator === 0 && lonMercator === 0) return null;

    try {
      const coords = this.mercatorToLatLon(latMercator, lonMercator);
      const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}`, {
        headers: { 'User-Agent': 'unq-blockchain-app/1.0' }
      });
      const geocodeData = await geocodeRes.json();
      
      if (geocodeData && geocodeData.display_name) {
        return geocodeData.display_name;
      }
    } catch (e) {
      console.warn("Failed to reverse geocode:", e);
    }
    
    return null;
  }
}
