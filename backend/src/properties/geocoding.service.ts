import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  private mercatorToLatLon(latMercator: number, lonMercator: number) {
    const lon = (lonMercator / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((latMercator / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
    return { lat, lon };
  }

  async reverseGeocode(latMercator: number, lonMercator: number): Promise<string> {
    if (latMercator === 0 && lonMercator === 0) {
      return 'Dirección Desconocida';
    }

    const { lat, lon } = this.mercatorToLatLon(latMercator, lonMercator);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'User-Agent': 'blockrent-app/1.0',
          },
        },
      );
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          if (parts.length > 2) {
            return `${parts[0].trim()}, ${parts[1].trim()}`;
          }
          return data.display_name;
        }
      }
    } catch (e) {
      this.logger.warn(`Nominatim geocoding failed, falling back to mock address`, e);
    }

    // Proximity fallback for Quilmes mock seeds
    const distance = Math.sqrt(
      Math.pow(latMercator - (-4126290), 2) + Math.pow(lonMercator - (-6485112), 2),
    );
    if (distance < 200000) {
      return `Calle Falsa 123, Quilmes`;
    }

    return 'Dirección Mock, Buenos Aires';
  }
}
