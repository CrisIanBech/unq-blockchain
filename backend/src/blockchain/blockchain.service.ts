import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PropertiesService } from '../properties/properties.service';
import { GeocodingService } from '../properties/geocoding.service';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private propertyContract: ethers.Contract;
  private rentalContract: ethers.Contract;

  constructor(
    private readonly configService: ConfigService,
    private readonly propertiesService: PropertiesService,
    private readonly geocodingService: GeocodingService,
  ) {}

  onModuleInit() {
    this.setupListeners().catch((err) => {
      this.logger.error('Failed to setup blockchain event listeners', err);
    });
  }

  private async setupListeners() {
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://localhost:8545';
    const propertyAddress = this.configService.get<string>('PROPERTY_NFT_ADDRESS') || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
    const rentalAddress = this.configService.get<string>('RENTAL_NFT_ADDRESS') || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

    this.logger.log(`Connecting to RPC Provider: ${rpcUrl}`);
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const propertyAbi = [
      'event PropertyMinted(uint256 indexed propertyId, address indexed owner, string tokenURI, int256 latitude, int256 longitude)',
    ];

    const rentalAbi = [
      'event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires)',
    ];

    this.propertyContract = new ethers.Contract(propertyAddress, propertyAbi, this.provider);
    this.rentalContract = new ethers.Contract(rentalAddress, rentalAbi, this.provider);

    // 1. Replay Past PropertyMinted Events
    try {
      this.logger.log('Replaying past PropertyMinted events...');
      const filter = this.propertyContract.filters.PropertyMinted();
      const events = await this.propertyContract.queryFilter(filter, 0, 'latest');
      this.logger.log(`Found ${events.length} past PropertyMinted events.`);
      for (const event of events) {
        if ('args' in event && event.args) {
          const { propertyId, owner, tokenURI, latitude, longitude } = event.args as any;
          await this.processPropertyMinted(propertyId, owner, tokenURI, latitude, longitude);
        }
      }
    } catch (err) {
      this.logger.error('Error replaying past PropertyMinted events', err);
    }

    // 2. Replay Past UpdateUser Events
    try {
      this.logger.log('Replaying past UpdateUser events...');
      const filter = this.rentalContract.filters.UpdateUser();
      const events = await this.rentalContract.queryFilter(filter, 0, 'latest');
      this.logger.log(`Found ${events.length} past UpdateUser events.`);
      for (const event of events) {
        if ('args' in event && event.args) {
          const { tokenId, user, expires } = event.args as any;
          await this.processUpdateUser(tokenId, user, expires);
        }
      }
    } catch (err) {
      this.logger.error('Error replaying past UpdateUser events', err);
    }

    // 3. Register Live Event Listeners
    this.propertyContract.on(
      'PropertyMinted',
      async (propertyId: bigint, owner: string, tokenURI: string, latitude: bigint, longitude: bigint) => {
        this.logger.log(`Live PropertyMinted event received: propertyId=${propertyId.toString()}`);
        await this.processPropertyMinted(propertyId, owner, tokenURI, latitude, longitude);
      },
    );

    this.rentalContract.on('UpdateUser', async (tokenId: bigint, user: string, expires: bigint) => {
      this.logger.log(`Live UpdateUser event received: tokenId=${tokenId.toString()}, user=${user}`);
      await this.processUpdateUser(tokenId, user, expires);
    });

    this.logger.log('Blockchain event listeners registered successfully.');
  }

  private async processPropertyMinted(
    propertyId: bigint,
    owner: string,
    tokenURI: string,
    latitude: bigint,
    longitude: bigint,
  ) {
    try {
      // Check cache first
      const existing = await this.propertiesService.getPropertyById(Number(propertyId));
      let metadata: any = existing?.metadata;

      if (!metadata || Object.keys(metadata).length === 0) {
        if (tokenURI.startsWith('ipfs://mock-property-')) {
          const id = Number(tokenURI.replace('ipfs://mock-property-', ''));
          const types = ['departamento', 'casa', 'ph', 'local', 'departamento', 'casa', 'casa', 'departamento'];
          const monthlyRents = [900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];
          const surfaces = [50, 69, 81, 93, 105, 117, 129, 141];
          const roomsList = [2, 3, 4, 1, 3, 2, 4, 3];
          const bathroomsList = [1, 1, 2, 1, 1, 1, 2, 2];
          const petsList = [true, true, false, true, false, true, false, true];
          const garageList = [false, false, true, false, true, false, false, true];
          
          metadata = {
            name: `Inmueble #${id} (${types[id - 1]})`,
            description: `Hermoso/a ${types[id - 1]} en excelente ubicación en Quilmes.`,
            type: types[id - 1],
            monthlyRent: monthlyRents[id - 1],
            surface: surfaces[id - 1],
            rooms: roomsList[id - 1],
            bathrooms: bathroomsList[id - 1],
            pets: petsList[id - 1],
            garage: garageList[id - 1],
            image: id === 2 || id === 4 ? `ipfs://QmXoypizjW3WknFixtdKLw55y71vXq1bSpLnh5B2e6m${id}v1` : '',
            images: id === 2 || id === 4 ? [
              `ipfs://QmXoypizjW3WknFixtdKLw55y71vXq1bSpLnh5B2e6m${id}v1`,
              `ipfs://QmXoypizjW3WknFixtdKLw55y71vXq1bSpLnh5B2e6m${id}v2`
            ] : [],
          };
        } else if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Str = tokenURI.substring('data:application/json;base64,'.length);
          const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
          metadata = JSON.parse(decoded);
        } else {
          try {
            let fetchUrl = tokenURI;
            if (tokenURI.startsWith('ipfs://')) {
              // backend only resolves gateway temporarily to fetch the metadata JSON for caching
              fetchUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            const response = await fetch(fetchUrl);
            if (response.ok) {
              metadata = await response.json();
            }
          } catch (e) {
            this.logger.warn(`Could not fetch external tokenURI: ${tokenURI}`, e);
          }
        }
      }

      // Default fallback metadata in case fetch fails
      metadata = metadata || {};

      const type = metadata.type || metadata.attributes?.find((a: any) => a.trait_type === 'type')?.value || 'departamento';
      const monthlyRent = Number(metadata.monthlyRent || metadata.attributes?.find((a: any) => a.trait_type === 'monthlyRent')?.value || 0);

      const surface = Number(metadata.surface || metadata.attributes?.find((a: any) => a.trait_type === 'surface')?.value || 0);
      const rooms = Number(metadata.rooms || metadata.attributes?.find((a: any) => a.trait_type === 'rooms')?.value || 0);
      const bathrooms = Number(metadata.bathrooms || metadata.attributes?.find((a: any) => a.trait_type === 'bathrooms')?.value || 0);
      
      const petsAttr = metadata.pets !== undefined ? metadata.pets : metadata.attributes?.find((a: any) => a.trait_type === 'pets')?.value;
      const pets = petsAttr === true || petsAttr === 'true';

      const garageAttr = metadata.garage !== undefined ? metadata.garage : metadata.attributes?.find((a: any) => a.trait_type === 'garage')?.value;
      const garage = garageAttr === true || garageAttr === 'true';

      const images = metadata.images || [];

      // Keep coordinates raw in Web Mercator
      const lat = Number(latitude);
      const lng = Number(longitude);

      // Reverse geocode address from event coordinates
      const address = await this.geocodingService.reverseGeocode(lat, lng);

      await this.propertiesService.upsertProperty(Number(propertyId), {
        owner: owner.toLowerCase(),
        description: metadata.description || '',
        image: images.length > 0 ? images[0] : '',
        type,
        address,
        monthlyRent,
        lat,
        lng,
        metadata,
        surface,
        rooms,
        bathrooms,
        pets,
        garage,
        images,
      });

      this.logger.log(`Property #${propertyId.toString()} processed and saved.`);
    } catch (err) {
      this.logger.error(`Error processing PropertyMinted for id=${propertyId.toString()}`, err);
    }
  }

  private async processUpdateUser(tokenId: bigint, user: string, expires: bigint) {
    try {
      await this.propertiesService.updateRentalUser(
        Number(tokenId),
        user.toLowerCase(),
        Number(expires),
      );
      this.logger.log(`Rental user updated for token #${tokenId.toString()}`);
    } catch (err) {
      this.logger.error(`Error processing UpdateUser for tokenId=${tokenId.toString()}`, err);
    }
  }
}
