export interface IGeocodingRepository {
  reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null>;
}

export class GeocodingRepository implements IGeocodingRepository {
  private mercatorToLatLon(latMercator: number, lonMercator: number) {
    const lon = (lonMercator / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((latMercator / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
    return { lat, lon };
  }

  async reverseGeocodeMercator(_latMercator: number, _lonMercator: number): Promise<string | null> {
    return null;
  }
}
