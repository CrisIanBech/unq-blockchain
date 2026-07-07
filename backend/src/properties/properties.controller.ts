import { Controller, Get, Post, Query, UseInterceptors, UploadedFiles, Body } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async search(@Query() searchDto: SearchPropertiesDto) {
    return this.propertiesService.search(searchDto);
  }

  @Post('metadata')
  @UseInterceptors(FilesInterceptor('files'))
  async prepareMetadata(@UploadedFiles() files: any[], @Body() body: any) {
    return this.propertiesService.prepareMetadata(files, body);
  }
}
