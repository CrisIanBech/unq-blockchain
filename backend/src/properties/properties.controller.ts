import { Controller, Get, Post, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
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

  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadImages(@UploadedFiles() files: any[]) {
    return this.propertiesService.uploadImagesToPinata(files);
  }
}
