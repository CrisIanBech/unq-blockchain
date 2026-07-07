import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from './properties.schema';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
  ) {}

  async getPropertyById(tokenId: number): Promise<Property | null> {
    return this.propertyModel.findOne({ tokenId }).exec();
  }

  async upsertProperty(tokenId: number, propertyData: {
    owner: string;
    description?: string;
    image?: string;
    type: string;
    address: string;
    monthlyRent: number;
    lat: number;
    lng: number;
    metadata?: any;
    surface?: number;
    rooms?: number;
    bathrooms?: number;
    pets?: boolean;
    garage?: boolean;
    images?: string[];
  }): Promise<Property> {
    const { lat, lng, ...rest } = propertyData;
    const finalData = {
      ...rest,
      tokenId,
      location: [lng, lat], // [x, y] Web Mercator meters
    };

    return this.propertyModel
      .findOneAndUpdate({ tokenId }, finalData, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .exec();
  }

  async updateRentalUser(tokenId: number, user: string, expires: number): Promise<Property | null> {
    return this.propertyModel
      .findOneAndUpdate(
        { tokenId },
        { user, expires },
        { new: true },
      )
      .exec();
  }

  async search(searchDto: SearchPropertiesDto): Promise<Property[]> {
    const { lat, lng, radius } = searchDto;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    return this.propertyModel
      .find({
        location: {
          $near: [lng, lat],
          $maxDistance: radius,
        },
        $or: [
          { user: { $exists: false } },
          { user: '0x0000000000000000000000000000000000000000' },
          { expires: { $lte: currentTimestamp } },
        ],
      })
      .exec();
  }

  async uploadImagesToPinata(files: any[]): Promise<string[]> {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT environment variable is not defined.');
    }

    const ipfsUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload to Pinata: ${response.statusText}`);
      }

      const result: any = await response.json();
      ipfsUrls.push(`ipfs://${result.IpfsHash}`);
    }

    return ipfsUrls;
  }

  async uploadJsonToPinata(metadata: any): Promise<string> {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT environment variable is not defined.');
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `property-metadata-${Date.now()}.json`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload JSON to Pinata: ${response.statusText}`);
    }

    const result: any = await response.json();
    return `ipfs://${result.IpfsHash}`;
  }

  async prepareMetadata(files: any[], body: any): Promise<{ tokenURI: string }> {
    const ipfsUrls = await this.uploadImagesToPinata(files);

    const metadata = {
      type: body.type,
      surface: Number(body.surface || 0),
      rooms: Number(body.rooms || 0),
      bathrooms: Number(body.bathrooms || 0),
      pets: body.pets === 'true' || body.pets === true,
      garage: body.garage === 'true' || body.garage === true,
      images: ipfsUrls,
    };

    const tokenURI = await this.uploadJsonToPinata(metadata);

    return { tokenURI };
  }
}
