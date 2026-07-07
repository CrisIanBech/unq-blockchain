import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, unique: true, index: true })
  tokenId: number;

  @Prop({ required: true, index: true })
  owner: string;

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ required: true })
  address: string;

  @Prop({ type: [Number], required: true })
  location: number[]; // [lng, lat] Web Mercator meters

  @Prop({ default: '0x0000000000000000000000000000000000000000', index: true })
  user: string;

  @Prop({ default: 0, index: true })
  expires: number;

  @Prop({ type: Object, default: {} })
  metadata: any;

  @Prop({ default: 0 })
  surface: number;

  @Prop({ default: 0 })
  rooms: number;

  @Prop({ default: 0 })
  bathrooms: number;

  @Prop({ default: false })
  pets: boolean;

  @Prop({ default: false })
  garage: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Create flat index for MongoDB flat geometry queries with custom bounds for Web Mercator
PropertySchema.index({ location: '2d' }, { min: -30000000, max: 30000000 });
