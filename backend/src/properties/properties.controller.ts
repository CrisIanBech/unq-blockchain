import { Controller, Get, Query } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async search(@Query() searchDto: SearchPropertiesDto) {
    return this.propertiesService.search(searchDto);
  }
}
