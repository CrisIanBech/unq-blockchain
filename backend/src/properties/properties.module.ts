import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { Property, PropertySchema } from './properties.schema';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService, GeocodingService],
  exports: [PropertiesService, GeocodingService],
})
export class PropertiesModule {}
