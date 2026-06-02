import * as XLSX from 'xlsx';
import { Article, AppVariable } from '@/types/article';
import { StockQuantity, StockWithLengthDetails } from '@/hooks/use-stock';
import { stockService } from '@/services/components/stock.service';
import { Site } from '@/types/settings';

export interface ParsedLengthCount {
  lengthName: string;
  nbpieces: number;
}

export interface ExcelInventoryRow {
  articleId: number;
  isWood: boolean;
  reference: string;
  designation: string;
  category: string;
  subCategory: string;
  packageReference: string;
  oldStock: number;
  newStock?: number | null;
  woodLengthsDetails?: ParsedLengthCount[];
}

export interface ParseResult {
  rows: ExcelInventoryRow[];
  errors: { rowIndex: number; message: string }[];
}

/**
 * Generates an Excel file for physical inventory.
 */
export async function exportInventoryTemplate(
  articles: Article[],
  stocks: StockQuantity[],
  site: Site,
  includeZeroStock: boolean
) {
  const data: any[] = [];
  const articleMap = new Map<number, Article>();
  articles.forEach(a => articleMap.set(a.id, a));

  for (const stock of stocks) {
    if (!includeZeroStock && stock.stockQuantity <= 0) {
      continue;
    }

    const article = articleMap.get(stock.articleId);
    if (!article) continue;

    if (article.iswood) {
      try {
        const lengths: StockWithLengthDetails[] = await stockService.getWoodStockWithLengthDetails({
          merchandiseRef: stock.packageReference,
          salesSiteId: site.id,
          merchandiseId: stock.merchandiseId
        });

        const allowedLengths = (article.lengths || '').replace(/^\[|\]$/g, '').split(',').map(l => l.trim()).filter(Boolean);
        
        // Map current pieces to allowed lengths
        const lengthPiecesMap = new Map<string, number>();
        if (lengths && lengths.length > 0) {
          lengths.forEach(l => lengthPiecesMap.set(l.lengthName, l.remainingPieces));
        }

        const formattedLengths = allowedLengths.map(l => {
          const pieces = lengthPiecesMap.get(l) || 0;
          const formattedPieces = pieces.toString().padStart(2, '0');
          return `${formattedPieces}/${l}`;
        }).join('-');

        data.push({
          '[ID]': article.id,
          'Est Bois': 'Oui',
          'Catégorie': article.category?.description || '',
          'Sous-Catégorie': article.subcategory?.description || '',
          'Référence': article.reference,
          'Désignation': article.description,
          'Colis': stock.packageReference,
          'Stock Théorique': stock.stockQuantity,
          'Nouveau Stock': '',
          'Détails Longueurs (Pièces/Long)': formattedLengths
        });
      } catch (err) {
        console.error("Failed to fetch lengths for merchandise:", stock.merchandiseId, err);
        data.push({
          '[ID]': article.id,
          'Est Bois': 'Oui',
          'Catégorie': article.category?.description || '',
          'Sous-Catégorie': article.subcategory?.description || '',
          'Référence': article.reference,
          'Désignation': article.description,
          'Colis': stock.packageReference,
          'Stock Théorique': stock.stockQuantity,
          'Nouveau Stock': '',
          'Détails Longueurs (Pièces/Long)': ''
        });
      }
    } else {
      data.push({
        '[ID]': article.id,
        'Est Bois': 'Non',
        'Catégorie': article.category?.description || '',
        'Sous-Catégorie': article.subcategory?.description || '',
        'Référence': article.reference,
        'Désignation': article.description,
        'Colis': stock.packageReference,
        'Stock Théorique': stock.stockQuantity,
        'Nouveau Stock': '',
        'Détails Longueurs (Pièces/Long)': ''
      });
    }
  }

  data.sort((a, b) => {
    if (a['Catégorie'] !== b['Catégorie']) return a['Catégorie'].localeCompare(b['Catégorie']);
    if (a['Sous-Catégorie'] !== b['Sous-Catégorie']) return a['Sous-Catégorie'].localeCompare(b['Sous-Catégorie']);
    if (a['Référence'] !== b['Référence']) return a['Référence'].localeCompare(b['Référence']);
    return (a['Colis'] || '').localeCompare(b['Colis'] || '');
  });

  const siteHeader = site.address || site.gov || `Site ${site.id}`;
  const dateHeader = new Date().toLocaleDateString('fr-FR');
  
  const headers = [
    '[ID]', 'Est Bois', 'Catégorie', 'Sous-Catégorie', 'Référence', 
    'Désignation', 'Colis', 'Stock Théorique', 'Nouveau Stock', 'Détails Longueurs (Pièces/Long)'
  ];

  const dataForSheet = [
    [`Site : ${siteHeader}`],
    [`Date d'export : ${dateHeader}`],
    [],
    headers,
    ...data.map(obj => headers.map(h => obj[h]))
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);

  const wscols = [
    { hidden: true }, // [ID]
    { wch: 10 },      // Est Bois
    { wch: 20 },      // Catégorie
    { wch: 20 },      // Sous-Catégorie
    { wch: 20 },      // Référence
    { wch: 40 },      // Désignation
    { wch: 15 },      // Colis
    { wch: 15 },      // Stock Théorique
    { wch: 15 },      // Nouveau Stock
    { wch: 35 },      // Détails Longueurs
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaire');
  XLSX.writeFile(workbook, `Inventaire_Site_${site.id}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Parses an imported Excel file for inventory creation.
 */
export async function parseInventoryImport(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Skip first 3 rows
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 3 });
        
        const result: ParseResult = { rows: [], errors: [] };

        rows.forEach((row, index) => {
          const rowIndex = index + 5;
          const isWood = row['Est Bois'] === 'Oui';
          const newStockRaw = row['Nouveau Stock'];
          const detailsRaw = row['Détails Longueurs (Pièces/Long)'];

          // For standard items, we require Nouveau Stock
          // For wood items, we require Détails Longueurs or Nouveau Stock
          const hasNewStock = newStockRaw !== undefined && newStockRaw !== null && String(newStockRaw).trim() !== '';
          const hasDetails = detailsRaw !== undefined && detailsRaw !== null && String(detailsRaw).trim() !== '';

          if (!hasNewStock && (!isWood || !hasDetails)) {
            return;
          }

          const articleId = Number(row['[ID]']);
          if (!articleId) {
            result.errors.push({ rowIndex, message: "L'identifiant de l'article est manquant ou invalide." });
            return;
          }

          let newStock: number | null = null;
          if (hasNewStock) {
            newStock = Number(newStockRaw);
            if (isNaN(newStock) || newStock < 0) {
              result.errors.push({ rowIndex, message: `La valeur du nouveau stock "${newStockRaw}" est invalide.` });
              return;
            }
          }

          const woodLengthsDetails: ParsedLengthCount[] = [];
          if (isWood && hasDetails) {
            const parts = String(detailsRaw).split('-');
            for (const part of parts) {
              const [piecesStr, lengthName] = part.split('/');
              if (piecesStr && lengthName) {
                const pieces = parseInt(piecesStr.trim(), 10);
                if (!isNaN(pieces) && pieces >= 0) {
                  woodLengthsDetails.push({ lengthName: lengthName.trim(), nbpieces: pieces });
                }
              }
            }
            if (woodLengthsDetails.length === 0) {
              result.errors.push({ rowIndex, message: `Le format des longueurs "${detailsRaw}" est invalide.` });
              return;
            }
          }

          result.rows.push({
            articleId,
            isWood,
            reference: row['Référence'] || '',
            designation: row['Désignation'] || '',
            category: row['Catégorie'] || '',
            subCategory: row['Sous-Catégorie'] || '',
            packageReference: row['Colis'] || 'Standard',
            oldStock: Number(row['Stock Théorique'] || 0),
            newStock,
            woodLengthsDetails
          });
        });

        resolve(result);
      } catch (error) {
        resolve({
          rows: [],
          errors: [{ rowIndex: 0, message: "Erreur lors de la lecture du fichier Excel. Vérifiez le format." }]
        });
      }
    };

    reader.onerror = () => {
      resolve({
        rows: [],
        errors: [{ rowIndex: 0, message: "Erreur de lecture du fichier." }]
      });
    };

    reader.readAsBinaryString(file);
  });
}
