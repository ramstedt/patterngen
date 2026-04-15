import mongoose, { type Document, Schema, type Types } from 'mongoose';

export const MAX_MEASUREMENT_PROFILES = 10;

/**
 * All measurement fields are optional - a profile may store only
 * a subset of measurements depending on which patterns the user needs.
 * Field names mirror src/types/measurements.ts (Measurements type).
 */
export interface IMeasurements {
  backWaistLength?: number;
  totalLength?: number;
  backWidth?: number;
  neckCircumference?: number;
  bustCircumference?: number;
  waistCircumference?: number;
  seatCircumference?: number;
  hipDepth?: number;
  hipHeight?: number;
  hipCircumference?: number;
  shoulderWidth?: number;
  armLength?: number;
  upperArmCircumference?: number;
  elbowCircumference?: number;
  wristCircumference?: number;
  chestWidth?: number;
  bustPoint?: number;
  frontWaistLength?: number;
  bustHeight?: number;
  sideHeight?: number;
  shoulderHeightRightBack?: number;
  shoulderHeightRightFull?: number;
  shoulderHeightLeftBack?: number;
  shoulderHeightLeftFull?: number;
  sideMeasurement?: number;
  kneeHeight?: number;
  trouserLength?: number;
  inseamLength?: number;
  rise?: number;
  crotchDepth?: number;
}

export interface IMeasurementProfile extends Document {
  accountUserId: Types.ObjectId;
  name: string;
  profileType: 'women' | 'men';
  notes?: string;
  measurements: IMeasurements;
  createdAt: Date;
  updatedAt: Date;
}

const numField = { type: Number };

const measurementsSchema = new Schema<IMeasurements>(
  {
    backWaistLength: numField,
    totalLength: numField,
    backWidth: numField,
    neckCircumference: numField,
    bustCircumference: numField,
    waistCircumference: numField,
    seatCircumference: numField,
    hipDepth: numField,
    hipHeight: numField,
    hipCircumference: numField,
    shoulderWidth: numField,
    armLength: numField,
    upperArmCircumference: numField,
    elbowCircumference: numField,
    wristCircumference: numField,
    chestWidth: numField,
    bustPoint: numField,
    frontWaistLength: numField,
    bustHeight: numField,
    sideHeight: numField,
    shoulderHeightRightBack: numField,
    shoulderHeightRightFull: numField,
    shoulderHeightLeftBack: numField,
    shoulderHeightLeftFull: numField,
    sideMeasurement: numField,
    kneeHeight: numField,
    trouserLength: numField,
    inseamLength: numField,
    rise: numField,
    crotchDepth: numField,
  },
  { _id: false },
);

const measurementProfileSchema = new Schema<IMeasurementProfile>(
  {
    accountUserId: {
      type: Schema.Types.ObjectId,
      ref: 'AccountUser',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    profileType: {
      type: String,
      enum: ['women', 'men'],
      default: 'women',
    },
    notes: { type: String },
    measurements: {
      type: measurementsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export const MeasurementProfile = mongoose.model<IMeasurementProfile>(
  'MeasurementProfile',
  measurementProfileSchema,
);
