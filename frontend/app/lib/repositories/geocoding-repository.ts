import { reverseGeocode } from "@/lib/services/geocoding-service";

export interface IGeocodingRepository {
  reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null>;
}

export class GeocodingRepository implements IGeocodingRepository {
  async reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null> {
    return reverseGeocode(latMercator, lonMercator);
  }
}
