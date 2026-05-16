export enum QuantityUnits {
  m3 = 'M3 - Mètre 3',
  m2 = 'M2 - Mètre 2',
  ml = 'ML - Mètre Linéaire',
  pcs = 'PCS - Pièces'
}

export interface AppVariable {
  id: number;
  nature: string;
  name: string;
  value: string;
  isactive: boolean;
  isdefault: boolean;
  iseditable: boolean;
  isdeleted?: boolean;
}

export interface SubCategory {
  id: number;
  reference: string;
  description: string;
  creationdate: string | Date;
  updatedate: string | Date;
  isdeleted: boolean;
  updatedby: number;
  idparent: number;
}

export interface Category {
  id: number;
  createdby: number;
  reference: string;
  description: string;
  creationdate: string | Date;
  updatedate: string | Date;
  isdeleted: boolean;
  firstchildren: SubCategory[];
}

export interface Article {
  id: number;
  reference: string;
  description: string;
  categoryid: number;
  subcategoryid: number;
  iswood: boolean;
  thicknessid?: number | null;
  widthid?: number | null;
  unit: string;
  sellprice_ht: number;
  tvaid: number;
  sellprice_ttc: number;
  lastpurchaseprice_ttc: number;
  creationdate: string | Date;
  updatedate: string | Date;
  updatedby: number;
  isdeleted: boolean;
  minquantity: number;
  lengths?: string | null; // example : [3.3, 3.6, 5.4]
  profitmarginpercentage: number;
  imageurl?: string | null;

  category?: Category | null;
  subcategory?: SubCategory | null;
  tva?: AppVariable | null;
  thickness?: AppVariable | null;
  width?: AppVariable | null;
}

export interface PurchasePriceHistory {
  id: number;
  idarticle: number;
  idcounterpart: number;
  pricevalue: number;
  transactiondate: string | Date;
  iddocument: number;
  docnumber: string;
  creationdate: string | Date;
  counterpartname?: string;
  updatedby_name?: string;
}

export interface SalesPriceHistory {
  id: number;
  idarticle: number;
  idcounterpart: number;
  pricevalue: number;
  transactiondate: string | Date;
  iddocument: number;
  docnumber: string;
  creationdate: string | Date;
  counterpartname?: string;
  updatedby_name?: string;
}

export interface CatalogPriceHistory {
  id: number;
  pricevalue: number;
  creationdate: string | Date;
  updatedby_name?: string;
}
