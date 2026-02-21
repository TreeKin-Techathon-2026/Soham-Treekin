// ============================================
// Tredits Calculation Logic
// ============================================
// 50 Tredits per tree planted
// 10 Tredits per 10kg CO2 absorbed
//   - CO2 absorbed = 1kg per 7 days of tree age (per tree), increases gradually
// 10 Tredits per 10kg Water filtered
//   - Water filtered = 1kg per 7 days of tree age (per tree), increases gradually
// O2 Released = 1kg per 7 days of tree age (per tree)

export const TREDITS_PER_TREE = 50;
export const TREDITS_PER_10KG_CO2 = 10;
export const CO2_KG_PER_UNIT = 10;
export const TREDITS_PER_10KG_WATER = 10;
export const WATER_KG_PER_UNIT = 10;

// Rate: 1kg per 7 days per tree (for CO2, Water, and O2)
export const KG_PER_WEEK_PER_TREE = 1;
export const DAYS_PER_CYCLE = 7;

export interface TreditsBreakdown {
  fromTrees: number;
  fromCO2: number;
  fromWater: number;
  fromO2: number;
  total: number;
  treesPlanted: number;
  co2AbsorbedKg: number;
  waterFilteredKg: number;
  o2ReleasedKg: number;
}

/**
 * Calculate how many kg a single tree has produced based on its age.
 * Formula: 1kg per every 7 days since planted.
 * Gradually increases - the longer the tree lives, the more it produces.
 */
export function calculateKgFromTreeAge(plantedDateStr: string): number {
  const plantedDate = new Date(plantedDateStr);
  const now = new Date();
  const diffMs = now.getTime() - plantedDate.getTime();
  if (diffMs <= 0) return 0;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // 1kg per 7 days - gradual accumulation
  const completedWeeks = Math.floor(diffDays / DAYS_PER_CYCLE);
  return completedWeeks * KG_PER_WEEK_PER_TREE;
}

/**
 * Calculate total kg produced by all trees based on their planted dates.
 * Each tree independently accumulates 1kg per 7 days.
 */
export function calculateTotalKgFromTrees(treeDates: string[]): number {
  return treeDates.reduce((total, dateStr) => {
    return total + calculateKgFromTreeAge(dateStr);
  }, 0);
}

/**
 * Main tredits calculation using tree planted dates for CO2/Water/O2.
 * - 50 tredits per tree planted
 * - 10 tredits per 10kg CO2 absorbed (1kg per 7 days per tree)
 * - 10 tredits per 10kg water filtered (1kg per 7 days per tree)
 * - O2 released: 1kg per 7 days per tree (tracked but no tredits)
 */
export function calculateTredits(
  treesPlanted: number,
  treeDates: string[]
): TreditsBreakdown {
  const fromTrees = treesPlanted * TREDITS_PER_TREE;

  // CO2 absorbed - 1kg per 7 days per tree
  const co2AbsorbedKg = calculateTotalKgFromTrees(treeDates);
  const co2Units = Math.floor(co2AbsorbedKg / CO2_KG_PER_UNIT);
  const fromCO2 = co2Units * TREDITS_PER_10KG_CO2;

  // Water filtered - same rate as CO2 (1kg per 7 days per tree)
  const waterFilteredKg = calculateTotalKgFromTrees(treeDates);
  const waterUnits = Math.floor(waterFilteredKg / WATER_KG_PER_UNIT);
  const fromWater = waterUnits * TREDITS_PER_10KG_WATER;

  // O2 released - same rate (tracked, no tredits bonus)
  const o2ReleasedKg = calculateTotalKgFromTrees(treeDates);
  const fromO2 = 0; // O2 is tracked but doesn't earn tredits

  const total = fromTrees + fromCO2 + fromWater;

  return {
    fromTrees,
    fromCO2,
    fromWater,
    fromO2,
    total,
    treesPlanted,
    co2AbsorbedKg,
    waterFilteredKg,
    o2ReleasedKg,
  };
}

export function formatTredits(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toLocaleString();
}
