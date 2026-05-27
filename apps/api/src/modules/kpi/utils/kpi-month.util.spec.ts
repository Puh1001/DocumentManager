import { isValidKpiMonth, kpiMonthToMetricKey } from "./kpi-month.util";

describe("kpi-month.util", () => {
  it("validates month 1-12", () => {
    expect(isValidKpiMonth(1)).toBe(true);
    expect(isValidKpiMonth(12)).toBe(true);
    expect(isValidKpiMonth(0)).toBe(false);
    expect(isValidKpiMonth(13)).toBe(false);
  });

  it("maps month to metric key", () => {
    expect(kpiMonthToMetricKey(5)).toBe("m5");
  });
});
