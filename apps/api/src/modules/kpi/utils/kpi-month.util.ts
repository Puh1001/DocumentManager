/** KPI metric JSON keys: m1 … m12 */
export type KpiMetricMonthKey =
  | "m1"
  | "m2"
  | "m3"
  | "m4"
  | "m5"
  | "m6"
  | "m7"
  | "m8"
  | "m9"
  | "m10"
  | "m11"
  | "m12";

export function isValidKpiMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

export function kpiMonthToMetricKey(month: number): KpiMetricMonthKey {
  if (!isValidKpiMonth(month)) {
    throw new Error(`Invalid KPI month: ${month}`);
  }
  return `m${month}` as KpiMetricMonthKey;
}
