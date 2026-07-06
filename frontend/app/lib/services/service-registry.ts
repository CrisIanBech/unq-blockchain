import { PropertiesService } from "./properties-service";
import { RentalsService } from "./rentals-service";
import { PropertiesRepository } from "../repositories/properties-repository";
import { MockPropertiesRepository } from "../repositories/mock-properties-repository";
import { RentalsRepository } from "../repositories/rentals-repository";
import { MockRentalsRepository } from "../repositories/mock-rentals-repository";
import { GeocodingRepository } from "../repositories/geocoding-repository";
import { MockGeocodingRepository } from "../repositories/mock-geocoding-repository";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export function getServices(_wallet?: string) {
  if (isMock) {
    return {
      propertiesService: new PropertiesService(new MockPropertiesRepository(), new MockGeocodingRepository()),
      rentalsService: new RentalsService(new MockRentalsRepository())
    };
  }

  return {
    propertiesService: new PropertiesService(new PropertiesRepository(), new GeocodingRepository()),
    rentalsService: new RentalsService(new RentalsRepository())
  };
}
