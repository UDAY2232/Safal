export interface FruitProcurementRates {
  apples: {
    layer4L: number;
    layer5L: number;
    roll: number;
  };
  pomegranate: number;
  watermelon: number;
  muskmelon: number;
  banana: number;
  orange: number;
  plum: number;
}

export const DEFAULT_FRUIT_PROCUREMENT_RATES: FruitProcurementRates = {
  apples: {
    layer4L: 1300,
    layer5L: 1400,
    roll: 600,
  },
  pomegranate: 950,
  watermelon: 14000,
  muskmelon: 18000,
  banana: 550,
  orange: 780,
  plum: 850,
};

export function getStoredFruitRates(): FruitProcurementRates {
  try {
    const raw = localStorage.getItem('safal_fruit_rates');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          apples: {
            layer4L: Number(parsed.apples?.layer4L) || DEFAULT_FRUIT_PROCUREMENT_RATES.apples.layer4L,
            layer5L: Number(parsed.apples?.layer5L) || DEFAULT_FRUIT_PROCUREMENT_RATES.apples.layer5L,
            roll: Number(parsed.apples?.roll) || DEFAULT_FRUIT_PROCUREMENT_RATES.apples.roll,
          },
          pomegranate: Number(parsed.pomegranate) || DEFAULT_FRUIT_PROCUREMENT_RATES.pomegranate,
          watermelon: Number(parsed.watermelon) || DEFAULT_FRUIT_PROCUREMENT_RATES.watermelon,
          muskmelon: Number(parsed.muskmelon) || DEFAULT_FRUIT_PROCUREMENT_RATES.muskmelon,
          banana: Number(parsed.banana) || DEFAULT_FRUIT_PROCUREMENT_RATES.banana,
          orange: Number(parsed.orange) || DEFAULT_FRUIT_PROCUREMENT_RATES.orange,
          plum: Number(parsed.plum) || DEFAULT_FRUIT_PROCUREMENT_RATES.plum,
        };
      }
    }
  } catch {}
  return DEFAULT_FRUIT_PROCUREMENT_RATES;
}

export interface GradedItemInfo {
  id?: string;
  shortGrade: string;
  varietyGrade: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  lineTotal: number;
}

export interface CommodityGradeInfo {
  fruitName: string;
  isApple: boolean;
  totalQty: number;
  unit: string;
  hasMultipleGrades: boolean;
  gradedItems: GradedItemInfo[];
  singleRate: number;
  baseCost: number;
}

export function getCommodityGradeDetails(op: any, rates?: FruitProcurementRates): CommodityGradeInfo {
  const activeRates = rates || getStoredFruitRates();
  const rawItems: any[] = Array.isArray(op.items) ? op.items : [];

  const rawName =
    op.fruitName ||
    (op.commodity ? String(op.commodity).replace(/[🍎🍇🍉🍌🍊]/g, '').trim() : '') ||
    rawItems[0]?.fruitName ||
    'Kashmir Apples';
  const fruitName = rawName.trim();
  const isApple = fruitName.toLowerCase().includes('apple');

  const unit = rawItems[0]?.unit || (op.volume?.includes('MT') ? 'MT' : op.volume?.includes('TON') ? 'TON' : 'BOX');
  const baseCost = Number(op.grandTotal || op.totalAmount || rawItems[0]?.lineTotal || 0);

  // Parse graded items
  const validItems = rawItems.filter((it: any) => Number(it.quantity) > 0);
  const gradedItems: GradedItemInfo[] = [];

  for (const it of validItems) {
    const vg = String(it.varietyGrade || it.fruitName || '').trim();
    let shortGrade = vg;
    if (vg.includes('4L') || vg.includes('4-Layer')) shortGrade = '4L';
    else if (vg.includes('5L') || vg.includes('5-Layer')) shortGrade = '5L';
    else if (vg.toLowerCase().includes('roll')) shortGrade = 'Roll';
    else shortGrade = vg.replace(/\(.*?\)/g, '').trim() || vg;

    let rate = Number(it.ratePerUnit) || 0;
    if (rate <= 0) {
      if (shortGrade === '4L') rate = activeRates.apples.layer4L;
      else if (shortGrade === '5L') rate = activeRates.apples.layer5L;
      else if (shortGrade === 'Roll') rate = activeRates.apples.roll;
      else if (fruitName.toLowerCase().includes('pomegranate')) rate = activeRates.pomegranate;
      else if (fruitName.toLowerCase().includes('watermelon')) rate = activeRates.watermelon;
      else if (fruitName.toLowerCase().includes('muskmelon')) rate = activeRates.muskmelon;
      else if (fruitName.toLowerCase().includes('banana')) rate = activeRates.banana;
      else if (fruitName.toLowerCase().includes('orange')) rate = activeRates.orange;
      else if (fruitName.toLowerCase().includes('plum')) rate = activeRates.plum;
    }

    const qty = Number(it.quantity) || 0;
    gradedItems.push({
      id: it.id,
      shortGrade,
      varietyGrade: vg,
      quantity: qty,
      unit: it.unit || unit,
      ratePerUnit: rate,
      lineTotal: Number(it.lineTotal) || qty * rate,
    });
  }

  // If no items were stored (legacy record) but it's an Apple consignment
  if (gradedItems.length === 0 && isApple) {
    // Try to construct standard 4L, 5L, Roll default grades
    gradedItems.push({
      shortGrade: '4L',
      varietyGrade: '4L (Large)',
      quantity: 0,
      unit: 'BOX',
      ratePerUnit: activeRates.apples.layer4L,
      lineTotal: 0,
    });
    gradedItems.push({
      shortGrade: '5L',
      varietyGrade: '5L (Medium)',
      quantity: 0,
      unit: 'BOX',
      ratePerUnit: activeRates.apples.layer5L,
      lineTotal: 0,
    });
    gradedItems.push({
      shortGrade: 'Roll',
      varietyGrade: 'Roll (Running)',
      quantity: 0,
      unit: 'BOX',
      ratePerUnit: activeRates.apples.roll,
      lineTotal: 0,
    });
  }

  const hasMultipleGrades =
    isApple ||
    gradedItems.length > 1 ||
    (gradedItems.length === 1 && ['4L', '5L', 'Roll'].includes(gradedItems[0].shortGrade));

  const totalQty =
    validItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0) ||
    Number(String(op.volume || '').match(/\d+/)?.[0] || 0) ||
    1;

  let singleRate = Number(validItems[0]?.ratePerUnit) || 0;
  if (singleRate <= 0) {
    if (fruitName.toLowerCase().includes('pomegranate')) singleRate = activeRates.pomegranate;
    else if (fruitName.toLowerCase().includes('watermelon')) singleRate = activeRates.watermelon;
    else if (fruitName.toLowerCase().includes('muskmelon')) singleRate = activeRates.muskmelon;
    else if (fruitName.toLowerCase().includes('banana')) singleRate = activeRates.banana;
    else if (fruitName.toLowerCase().includes('orange')) singleRate = activeRates.orange;
    else if (fruitName.toLowerCase().includes('plum')) singleRate = activeRates.plum;
    else if (baseCost > 0 && totalQty > 0) singleRate = Math.round(baseCost / totalQty);
  }

  return {
    fruitName,
    isApple,
    totalQty,
    unit,
    hasMultipleGrades,
    gradedItems,
    singleRate,
    baseCost,
  };
}
