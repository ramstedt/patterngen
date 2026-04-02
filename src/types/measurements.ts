export type ProfileType = 'women' | 'men';

export type Measurements = {
  backWaistLength: number;
  totalLength: number;
  backWidth: number;
  neckCircumference: number;
  bustCircumference: number;
  waistCircumference: number;
  seatCircumference: number;
  hipDepth: number;
  hipHeight: number;
  hipCircumference: number;
  shoulderWidth: number;
  armLength: number;
  upperArmCircumference: number;
  elbowCircumference: number;

  wristCircumference: number;
  chestWidth: number;
  bustPoint: number;
  frontWaistLength: number;
  bustHeight: number;
  sideHeight: number;
  shoulderHeightRightBack: number;
  shoulderHeightRightFull: number;
  shoulderHeightLeftBack: number;
  shoulderHeightLeftFull: number;
  sideMeasurement: number;
  kneeHeight: number;
  trouserLength: number;
  inseamLength: number;
  rise: number;
  crotchDepth: number;
};

export type Profile = {
  id: string;
  name: string;
  profileType: ProfileType;
  measurements: Measurements;
  createdAt: number;
  updatedAt: number;
};
