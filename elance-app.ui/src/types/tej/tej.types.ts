export interface TejOperationInput {
  idTypeOperation: string;
  anneeFacturation: number;
  montantHT: number;
  tauxRS: number;
  tauxTVA: number;
  montantTVA?: number;
  montantTTC?: number;
  montantRS?: number;
  cnpc: boolean;
  pCharge: boolean;
}

export interface TejCertificateInput {
  action: string;
  beneficiaryIdentifiant: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryActivity: string;
  beneficiaryEmail?: string;
  beneficiaryPhone?: string;
  refCertifChezDeclarant: string;
  paymentDate: string; // ISO format or YYYY-MM-DD
  operations: TejOperationInput[];
}

export interface TejPasswordDto {
  username: string;
  password: string;
}

export interface TejSubmitCertificateDto {
  username: string;
  password: string;
  certificate: TejCertificateInput;
}

export interface TejVerifyBeneficiaryResponse {
  success: boolean;
  taxpayer?: any;
}

export interface TejUploadResult {
  success: boolean;
  result: {
    success: boolean;
    statusCode: number;
    rawResponse: string;
  };
}
