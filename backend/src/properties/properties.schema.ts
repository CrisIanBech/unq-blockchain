import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true, unique: true, index: true })
  tokenId: number;

  @Prop({ required: true, index: true })
  owner: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  image: string;

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  monthlyRent: number;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Create standard index for MongoDB spatial queries
PropertySchema.index({ location: '2dsphere' });
