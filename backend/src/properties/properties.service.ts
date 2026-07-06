import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from './properties.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
  ) {}

  async createOrUpdate(createDto: CreatePropertyDto): Promise<Property> {
    const { lat, lng, ...rest } = createDto;
    const propertyData = {
      ...rest,
      location: {
        type: 'Point',
        coordinates: [lng, lat], // [longitude, latitude]
      },
    };

    // Upsert based on tokenId to handle retries/re-mint scenarios gracefully
    return this.propertyModel
      .findOneAndUpdate({ tokenId: createDto.tokenId }, propertyData, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .exec();
  }

  async search(searchDto: SearchPropertiesDto): Promise<Property[]> {
    const { lat, lng, radius } = searchDto;

    return this.propertyModel
      .find({
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: radius,
          },
        },
      })
      .exec();
  }

  async getMetadata(tokenId: number) {
    const property = await this.propertyModel.findOne({ tokenId }).exec();
    if (!property) {
      throw new NotFoundException(`Property with token ID ${tokenId} not found`);
    }

    return {
      name: property.name,
      description: property.description || `Tokenized property: ${property.name}`,
      image: property.image || `/images/prop-${(property.tokenId % 5) + 1}.png`,
      attributes: [
        { trait_type: 'type', value: property.type },
        { trait_type: 'address', value: property.address },
        { trait_type: 'monthlyRent', value: property.monthlyRent },
      ],
    };
  }
}
