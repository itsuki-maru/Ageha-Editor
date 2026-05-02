import { describe, expect, it } from "vitest";

import { AGEHA_SLIDE_THEME } from "@/utils/slideTheme";

describe("AGEHA_SLIDE_THEME", () => {
  it("Marp テーマとして必要な宣言と基本レイアウトを含む", () => {
    expect(AGEHA_SLIDE_THEME).toContain("@theme ageha-slide");
    expect(AGEHA_SLIDE_THEME).toContain("@auto-scaling true");
    expect(AGEHA_SLIDE_THEME).toContain("width: 1280px;");
    expect(AGEHA_SLIDE_THEME).toContain("height: 720px;");
    expect(AGEHA_SLIDE_THEME).toContain("section.lead");
  });
});
