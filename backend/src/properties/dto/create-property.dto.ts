import { IsNumber, IsString, IsNotEmpty, IsOptional, IsPositive, IsLatitude, IsLongitude, IsEnum } from 'class-validator';

export enum PropertyType {
  DEPARTAMENTO = 'departamento',
  CASA = 'casa',
  PH = 'ph',
  LOCAL = 'local',
  OFICINA = 'oficina',
}

export class CreatePropertyDto {
  @IsNumber()
  @IsNotEmpty()
  tokenId: number;

  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsEnum(PropertyType)
  @IsNotEmpty()
  type: PropertyType;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  monthlyRent: number;

  @IsNumber()
  @IsLatitude()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsLongitude()
  @IsNotEmpty()
  lng: number;
}
