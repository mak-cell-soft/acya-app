import { AppVariable } from "../configuration/appvariable";
import { Category, SubCategory } from "../configuration/category";

export class Article {
    id: number = 0;
    reference: string = '';
    description: string = '';
    categoryid: number = 0;
    subcategoryid: number = 0;
    iswood: boolean = false;
    thicknessid?: number | null;
    widthid?: number | null;
    unit: string = '';
    sellprice_ht: number = 0;
    tvaid: number = 0;
    sellprice_ttc: number = 0;
    lastpurchaseprice_ttc: number = 0;
    creationdate: Date = new Date();
    updatedate: Date = new Date();
    updatedby: number = 0;
    isdeleted: boolean = false;
    minquantity: number = 0;
    lengths?: string | null;//example : [3.3, 3.6, 5.4]
    profitmarginpercentage: number = 0; // Pourcentage de marge de gain
    editing?: Boolean = false;

    category?: Category | null;
    subcategory?: SubCategory | null;
    tva?: AppVariable | null;
    thickness?: AppVariable | null;
    width?: AppVariable | null;
}