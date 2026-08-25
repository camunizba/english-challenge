import { describe, expect, it } from "vitest";
import { fuzzyMatches } from "../shared/fuzzySearch";

describe("fuzzy student search", () => {
  it("finds a student with an accent-free or one-character misspelling query", () => {
    expect(fuzzyMatches("Maya Rodrigues", "maya")).toBe(true);
    expect(fuzzyMatches("Maya Rodrigues", "rodriguz")).toBe(true);
    expect(fuzzyMatches("Maya Rodrigues", "lucas")).toBe(false);
  });
});
