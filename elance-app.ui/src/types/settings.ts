export interface DocumentNumberingConfig {
  prefixes: { [key: number]: string };
  yearFormat: number; // 2 for YY, 4 for YYYY
  incrementLength: number;
}

export interface Site {
  id: number;
  isForsale: boolean;
  gov: string;
  address: string;
  codepost: string;
  isdeleted: boolean;
  enterpriseid: number;
}

export interface Enterprise {
  id: number;
  name: string;
  description: string;
  guid: string;
  email: string;
  phone: string;
  mobileOne: string;
  mobileTwo: string;
  matriculeFiscal: string;
  devise: string;
  nameResponsable: string;
  surnameResponsable: string;
  positionResponsable: string;
  siegeAddress: string;
  commercialregister: string;
  capital: string;
  issalingwood: boolean;
  auditRetentionMonths: number;
  documentNumberingConfig?: string; // Stored as JSON string in DB
  sites?: Site[];
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
  language?: string | null;
  currency?: string | null;
}

export interface Bank {
  id: number;
  updatedby: number;
  reference: string;
  designation: string;
  logo: string;
  agency: string;
  rib: string;
  iban: string;
  creationdate: string;
  updatedate: string;
  isdeleted: boolean;
  editing?: boolean;

  chequeDepositFeeHT: number;
  traiteDepositFeeHT: number;
  wireTransferFeeHT: number;
  miscFeeHT: number;
  initialBalance: number;
}

export interface AppVariable {
  id: number;
  nature: string;
  name: string;
  value: string;
  isactive: boolean;
  isdefault: boolean;
  iseditable: boolean;
  editing?: boolean;
  isdeleted?: boolean;
}

export interface Category {
  id: number;
  reference: string;
  description: string;
  isdeleted: boolean;
  firstchildren?: SubCategory[];
}

export interface SubCategory {
  id: number;
  reference: string;
  description: string;
  idparent: number;
  isdeleted: boolean;
}

export interface Transporter {
  id: number;
  fullname: string;
  car: string;
}
