import { Article } from "./article";
import { Document } from "./document";
import { ListOfLength } from "./listoflength";
import { Stock, StockQuantity } from "./stock";

export class Merchand {
    selectedArticle: Article | null = null; // Store the selected article
    unit_price_ht: number = 0;
    merchandise_cost_ht: number = 0; // Prix Achat HT
    quantity: number = 0; // Quantité
    listLengths: ListOfLength[] = []; // La liste des Longueurs
    selldiscountpercentage: number = 0; // % remise
    sellcostprice_discountValue: number = 0; // valeur de la remise
    sellcostprice_net_ht: number = 0; // Prix Achat avec Remise
    sellcostprice_taxValue: number = 0;
    totalWithTax: number = 0; // Prix Achat TTC
    /**
     * Properties needed for Wood lengths Test and controls
     */
    articleSearchInput?: string;
    filteredArticles?: Article[];
    isWoodArticle?: boolean;
    selectedStock: StockQuantity | null = null; // Store the selected stock

}

export class Merchandise {
    id: number = 0;
    packagereference: string = '';
    description: string = '';
    creationdate!: Date;
    updatedate !: Date;
    updatedbyid: number = 0;

    /**
     * Inititial quantity will be stored separately
     */
    quantity: number = 0; // Quantité

    /**
     * Cost Informations
     */
    unit_price_ht: number = 0; // Unit Price
    cost_ht: number = 0; // Cost Price HT without Discount

    discount_percentage: number = 0; // % Discount
    cost_discount_value: number = 0; // Discount Value
    cost_net_ht: number = 0; // Prix Achat avec Remise
    tva_value: number = 0; // TVA Value
    cost_ttc: number = 0; // Prix Achat TTC

    /**
     * Identifier l'appartenance de chanque marchandise.
     * Le document avec lequel la marchandise est crée.
     */
    documentid: number = 0

    // Added recently
    isinvoicible: boolean = true;
    allownegativstock: boolean = false;

    article!: Article;

    /**
     * Id Merchandise is type Wood 
     * ListOfLength will store details of the quantity
     */
    lisoflengths!: ListOfLength[];

    /**
     * A Merchandise is merged with another 
     */
    ismergedwith: boolean = false;
    idmergedmerchandise!: number;
    isdeleted: boolean = false;
}


