export type Measurements = {
  backWaistLength: number; // Livlängd bak
  totalLength: number; // Hel längd
  backWidth: number; // Ryggbredd
  neckCircumference: number; // Halsvidd
  bustCircumference: number; // Bystvidd
  waistCircumference: number; // Midjevidd
  hipCircumference: number; // Stussvidd
  hipDepth: number; // Stusshöjd
  hipHeight: number; // Höfthöjd
  highHipCircumference: number; // Höftvidd
  shoulderWidth: number; // Axelbredd
  armLength: number; // Armlängd
  upperArmCircumference: number; // Överarmsvidd
  elbowCircumference: number; // Armbågsvidd

  wristCircumference: number; // Handledsvidd
  chestWidth: number; // Bröstbredd
  bustPoint: number; // Bystpunkt
  frontWaistLength: number; // Livlängd fram
  bustHeight: number; // Bysthöjd
  sideHeight: number; // Sidhöjd
  shoulderHeightRightBack: number; // Axelhöjd höger bak
  shoulderHeightRightFull: number; // Axelhöjd höger hela
  shoulderHeightLeftBack: number; // Axelhöjd vänster bak
  shoulderHeightLeftFull: number; // Axelhöjd vänster hela
  sideMeasurement: number; // Sidmått
  kneeHeight: number; // Knähöjd
  trouserLength: number; // Byxlängd
  inseamLength: number; // Innerbenslängd
  rise: number; // Byxhöjd
  crotchDepth: number; // Grenmått
};

export type Profile = {
  id: string;
  name: string;
  measurements: Measurements;
  createdAt: number;
  updatedAt: number;
};
