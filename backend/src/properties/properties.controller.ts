import { Controller, Get, Post, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  async create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.createOrUpdate(createPropertyDto);
  }

  @Get()
  async search(@Query() searchDto: SearchPropertiesDto) {
    return this.propertiesService.search(searchDto);
  }

  @Get('metadata/:tokenId')
  async getMetadata(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.propertiesService.getMetadata(tokenId);
  }
}
