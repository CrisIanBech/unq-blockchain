import { IsNumber, IsOptional, IsPositive, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchPropertiesDto {
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  lng: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  radius?: number = 5000; // default 5000 meters
}
