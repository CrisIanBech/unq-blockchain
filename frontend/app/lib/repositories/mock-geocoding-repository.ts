import { IGeocodingRepository } from "./geocoding-repository";

export class MockGeocodingRepository implements IGeocodingRepository {
  async reverseGeocodeMercator(latMercator: number, lonMercator: number): Promise<string | null> {
    await new Promise((res) => setTimeout(res, 500));
    if (latMercator === 0 && lonMercator === 0) return null;
    return "Calle Falsa 123, Buenos Aires (Mock)";
  }
}
