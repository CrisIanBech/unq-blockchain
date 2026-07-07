import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [PropertiesModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
