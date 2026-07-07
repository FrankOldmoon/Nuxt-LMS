import { describe, it, expect } from "vitest";
import { extractChapterTasks, SUBMITTABLE_TYPES } from "../../utils/chapterTask";

/** Helper: build a tiptap heading node */
function heading(id: string, level: number, text: string) {
  return {
    type: "heading",
    attrs: { id, level },
    content: [{ type: "text", text }],
  };
}

/** Helper: build a tiptap vue node (extension component) */
function vue(type: string, content: number) {
  return { type: "vue", attrs: { type, content } };
}

/** Helper: wrap nodes in a doc */
function doc(...content: any[]) {
  return { type: "doc", content };
}

describe("SUBMITTABLE_TYPES", () => {
  it("contains the 5 submittable task types", () => {
    expect([...SUBMITTABLE_TYPES]).toEqual([
      "question",
      "homework",
      "comment",
      "quiz",
      "race",
    ]);
  });
});

describe("extractChapterTasks", () => {
  it("returns empty result for null", () => {
    expect(extractChapterTasks(null)).toEqual({
      headings: [],
      tasksByHeading: {},
    });
  });

  it("returns empty result for undefined", () => {
    expect(extractChapterTasks(undefined)).toEqual({
      headings: [],
      tasksByHeading: {},
    });
  });

  it("extracts heading without tasks", () => {
    const result = extractChapterTasks(doc(heading("h1", 1, "Intro")));
    expect(result.headings).toHaveLength(1);
    expect(result.headings[0]).toEqual({ id: "h1", level: 1, text: "Intro" });
    expect(result.tasksByHeading["h1"]).toEqual([]);
  });

  it("associates tasks with the correct heading", () => {
    const result = extractChapterTasks(
      doc(
        heading("h1", 1, "Chapter 1"),
        vue("question", 101),
        vue("homework", 201),
        heading("h2", 2, "Chapter 2"),
        vue("quiz", 301),
      ),
    );
    expect(result.headings).toHaveLength(2);
    expect(result.tasksByHeading["h1"]).toHaveLength(2);
    expect(result.tasksByHeading["h1"][0]).toEqual({
      type: "question",
      cid: 101,
      key: "question:101",
    });
    expect(result.tasksByHeading["h1"][1]).toEqual({
      type: "homework",
      cid: 201,
      key: "homework:201",
    });
    expect(result.tasksByHeading["h2"]).toHaveLength(1);
    expect(result.tasksByHeading["h2"][0]).toEqual({
      type: "quiz",
      cid: 301,
      key: "quiz:301",
    });
  });

  it("ignores vue nodes that appear before any heading", () => {
    const result = extractChapterTasks(
      doc(vue("question", 999), heading("h1", 1, "First")),
    );
    expect(result.headings).toHaveLength(1);
    expect(result.tasksByHeading["h1"]).toEqual([]);
  });

  it("ignores non-submittable vue node types", () => {
    const result = extractChapterTasks(
      doc(heading("h1", 1, "H1"), vue("aichat", 501)),
    );
    expect(result.tasksByHeading["h1"]).toEqual([]);
  });

  it("ignores vue nodes with content=0 (invalid cid)", () => {
    const result = extractChapterTasks(
      doc(heading("h1", 1, "H1"), vue("question", 0)),
    );
    expect(result.tasksByHeading["h1"]).toEqual([]);
  });

  it("handles multiple tasks of same type under one heading", () => {
    const result = extractChapterTasks(
      doc(
        heading("h1", 1, "H1"),
        vue("question", 1),
        vue("question", 2),
        vue("question", 3),
      ),
    );
    expect(result.tasksByHeading["h1"]).toHaveLength(3);
    expect(result.tasksByHeading["h1"].map((t) => t.key)).toEqual([
      "question:1",
      "question:2",
      "question:3",
    ]);
  });
});
