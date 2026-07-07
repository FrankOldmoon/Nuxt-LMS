import { describe, it, expect } from "vitest";
import { extractTocFromContent } from "../../utils/toc";

/** Helper: build a tiptap heading node */
function heading(id: string, level: number, text: string) {
  return {
    type: "heading",
    attrs: { id, level },
    content: [{ type: "text", text }],
  };
}

/** Helper: wrap nodes in a doc */
function doc(...content: any[]) {
  return { type: "doc", content };
}

describe("extractTocFromContent", () => {
  it("returns empty array for null", () => {
    expect(extractTocFromContent(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(extractTocFromContent(undefined)).toEqual([]);
  });

  it("returns empty array for content with no headings", () => {
    const content = doc({
      type: "paragraph",
      content: [{ type: "text", text: "Just text" }],
    });
    expect(extractTocFromContent(content)).toEqual([]);
  });

  it("extracts a single heading without children", () => {
    const content = doc(heading("h1", 1, "Introduction"));
    const result = extractTocFromContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
    expect(result[0].text).toBe("Introduction");
    expect(result[0].children).toBeUndefined();
  });

  it("builds nested tree for h1 > h2", () => {
    const content = doc(
      heading("h1", 1, "Chapter 1"),
      heading("h2", 2, "Section 1.1"),
    );
    const result = extractTocFromContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("h1");
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].id).toBe("h2");
    expect(result[0].children![0].text).toBe("Section 1.1");
  });

  it("builds 3-level nested tree for h1 > h2 > h3", () => {
    const content = doc(
      heading("h1", 1, "H1"),
      heading("h2", 2, "H2"),
      heading("h3", 3, "H3"),
    );
    const result = extractTocFromContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].children![0].children![0].id).toBe("h3");
  });

  it("handles sibling headings at same level", () => {
    const content = doc(
      heading("h1a", 1, "H1A"),
      heading("h1b", 1, "H1B"),
    );
    const result = extractTocFromContent(content);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("h1a");
    expect(result[1].id).toBe("h1b");
  });

  it("skips heading nodes without id", () => {
    const content = doc({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "No ID" }],
    });
    expect(extractTocFromContent(content)).toEqual([]);
  });

  it("skips heading nodes without text", () => {
    const content = doc({
      type: "heading",
      attrs: { id: "empty", level: 1 },
      content: [],
    });
    expect(extractTocFromContent(content)).toEqual([]);
  });

  it("supports data-toc-id as alternative id", () => {
    const content = doc({
      type: "heading",
      attrs: { "data-toc-id": "alt-id", level: 1 },
      content: [{ type: "text", text: "Alt" }],
    });
    const result = extractTocFromContent(content);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("alt-id");
  });
});
