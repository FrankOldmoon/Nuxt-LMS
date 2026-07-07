import { describe, it, expect } from "vitest";
import { formatTime, formatDate } from "../../utils/format";

describe("formatTime", () => {
  it("returns empty string for null", () => {
    expect(formatTime(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatTime(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatTime("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatTime("not-a-date")).toBe("");
  });

  it("returns formatted string for valid ISO date with Z suffix", () => {
    const result = formatTime("2026-01-15T10:30:00Z");
    expect(result).not.toBe("");
    expect(result).toContain("2026");
  });

  it("returns formatted string for valid ISO date without Z suffix", () => {
    const result = formatTime("2026-01-15T10:30:00");
    expect(result).not.toBe("");
    expect(result).toContain("2026");
  });
});

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate("invalid")).toBe("");
  });

  it("returns formatted date for valid ISO date", () => {
    const result = formatDate("2026-01-15T10:30:00Z");
    expect(result).not.toBe("");
    expect(result).toContain("2026");
  });
});
