import { stockService } from '@/services/components/stock.service';
import { articleService } from '@/services/components/article.service';
import { Stock } from '@/types/stock';

export interface LengthStockDetail {
  id: number;
  lengthId: number;
  lengthName: string;
  customLengthCm?: number;
  totalWidthCm?: number;
  remainingPieces: number;
  volumeM3?: number;
}

export interface WoodStockDetailsResult {
  fullArticle: any;
  details: LengthStockDetail[];
  totals: {
    pieces: number;
    volume: number;
  };
}

// Helper to extract dimensions from package or article reference if missing in DB
// e.g. "RS1-50225-SODRA" -> "50225" -> thickness: 50, width: 225
export function extractDimensionsFromRef(ref: string) {
  if (!ref) return null;
  const match = ref.match(/-(\d{4,6})-/);
  if (match) {
    const dims = match[1];
    let t = 0, w = 0;
    if (dims.length === 5) {
      t = parseInt(dims.substring(0, 2), 10);
      w = parseInt(dims.substring(2, 5), 10);
    } else if (dims.length === 4) {
      t = parseInt(dims.substring(0, 2), 10);
      w = parseInt(dims.substring(2, 4), 10);
    } else if (dims.length === 6) {
      t = parseInt(dims.substring(0, 3), 10);
      w = parseInt(dims.substring(3, 6), 10);
    }
    if (t > 0 && w > 0) return { thickness: t, width: w };
  }
  return null;
}

export async function fetchWoodStockDetails(stock: Stock | null): Promise<WoodStockDetailsResult | null> {
  if (!stock?.merchandise?.article?.reference || !stock.site?.id || !stock.merchandise?.id) {
    return null;
  }

  try {
    const woodParams = {
      merchandiseRef: stock.merchandise.article.reference,
      salesSiteId: stock.site.id,
      merchandiseId: stock.merchandise.id
    };

    const [result, articleDetails] = await Promise.all([
      stockService.getWoodStockWithLengthDetails(woodParams),
      articleService.getById(stock.merchandise.article.id)
    ]);

    const fallbackDims = extractDimensionsFromRef(stock.merchandise.article.reference || '');

    let thicknessStr = articleDetails?.thickness?.value?.toString() || '';
    let widthStr = articleDetails?.width?.value?.toString() || '';

    let thicknessVal = 0;
    let widthVal = 0;

    if (thicknessStr) {
      thicknessVal = parseFloat(thicknessStr.replace(',', '.')) || 0;
    } else if (fallbackDims) {
      thicknessVal = fallbackDims.thickness / 1000;
      thicknessStr = thicknessVal.toString();
    }

    if (widthStr) {
      widthVal = parseFloat(widthStr.replace(',', '.')) || 0;
    } else if (fallbackDims) {
      widthVal = fallbackDims.width / 1000;
      widthStr = widthVal.toString();
    }

    const displayThickness = articleDetails?.thickness?.name || (fallbackDims ? fallbackDims.thickness.toString() : '—');
    const displayWidth = articleDetails?.width?.name || (fallbackDims ? fallbackDims.width.toString() : '—');

    const extendedArticle = {
      ...articleDetails,
      _displayThickness: displayThickness,
      _displayWidth: displayWidth
    };

    const mappedDetails: LengthStockDetail[] = (result || []).map((d: any) => {
      const customLen = d.customLengthCm ?? d.CustomLengthCm;
      const totWidth = d.totalWidthCm ?? d.TotalWidthCm;
      const lengthName = d.lengthName ?? d.LengthName ?? (customLen ? `${customLen}` : '0');
      const lengthVal = customLen ? (customLen / 100) : (parseFloat(lengthName.toString().replace(',', '.') || '0') / 100);
      const pieces = d.remainingPieces ?? d.RemainingPieces ?? 0;

      let volumeM3 = 0;
      if (customLen || totWidth) {
        const lenM = (customLen || 0) / 100;
        const widthM = (totWidth || 0) / 100;
        volumeM3 = parseFloat((thicknessVal * lenM * widthM).toFixed(4));
      } else {
        volumeM3 = parseFloat((pieces * lengthVal * thicknessVal * widthVal).toFixed(4));
      }

      return {
        id: d.id ?? d.Id,
        lengthId: d.lengthId ?? d.LengthId,
        lengthName: lengthName,
        customLengthCm: customLen,
        totalWidthCm: totWidth,
        remainingPieces: pieces,
        volumeM3: volumeM3
      };
    });

    const filteredAndSorted = mappedDetails
      .filter(d => d.remainingPieces > 0)
      .sort((a, b) => parseFloat(b.lengthName) - parseFloat(a.lengthName));

    const totals = filteredAndSorted.reduce(
      (acc, row) => {
        acc.pieces += row.remainingPieces;
        acc.volume += row.volumeM3 || 0;
        return acc;
      },
      { pieces: 0, volume: 0 }
    );

    return {
      fullArticle: extendedArticle,
      details: filteredAndSorted,
      totals
    };
  } catch (err) {
    console.error('Failed to fetch wood stock details:', err);
    return null;
  }
}
