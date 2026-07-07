import { describe, it, expect } from "vitest";
import { markdownToTiptap } from "../../utils/markdown";

/** 取 doc.content 中第一个块级节点的 type */
function firstBlockType(doc: any): string {
  return doc.content?.[0]?.type ?? "";
}

/** 取 doc.content 中第一个块级节点 */
function firstBlock(doc: any): any {
  return doc.content?.[0];
}

describe("markdownToTiptap - 基础结构", () => {
  it("returns empty doc for empty string", () => {
    expect(markdownToTiptap("")).toEqual({ type: "doc", content: [] });
  });

  it("returns empty doc for whitespace-only string", () => {
    expect(markdownToTiptap("   \n  \t ")).toEqual({ type: "doc", content: [] });
  });

  it("normalizes CRLF to LF", () => {
    const doc = markdownToTiptap("line1\r\nline2");
    expect(doc.type).toBe("doc");
    expect(doc.content).toHaveLength(1);
    expect(firstBlockType(doc)).toBe("paragraph");
  });

  it("returns a doc node at root", () => {
    const doc = markdownToTiptap("# Hello");
    expect(doc.type).toBe("doc");
    expect(Array.isArray(doc.content)).toBe(true);
  });
});

describe("markdownToTiptap - 标题", () => {
  it("parses h1-h6", () => {
    for (let level = 1; level <= 6; level++) {
      const hashes = "#".repeat(level);
      const doc = markdownToTiptap(`${hashes} Title ${level}`);
      expect(firstBlockType(doc)).toBe("heading");
      expect(firstBlock(doc).attrs.level).toBe(level);
    }
  });

  it("extracts heading text as inline text node", () => {
    const doc = markdownToTiptap("# My Heading");
    const block = firstBlock(doc);
    expect(block.content[0]).toEqual({ type: "text", text: "My Heading" });
  });

  it("requires space after hashes (not a heading without space)", () => {
    const doc = markdownToTiptap("#NoSpace");
    expect(firstBlockType(doc)).not.toBe("heading");
  });
});

describe("markdownToTiptap - 段落与文本", () => {
  it("wraps plain text in a paragraph", () => {
    const doc = markdownToTiptap("Just some text");
    expect(firstBlockType(doc)).toBe("paragraph");
    expect(firstBlock(doc).content[0]).toEqual({ type: "text", text: "Just some text" });
  });

  it("joins consecutive non-block lines into one paragraph", () => {
    const doc = markdownToTiptap("line one\nline two\nline three");
    expect(firstBlockType(doc)).toBe("paragraph");
    // 段落内文本由 parseInline 处理，应包含所有文本
    const text = firstBlock(doc).content.map((n: any) => n.text || "").join("");
    expect(text).toContain("line one");
    expect(text).toContain("line two");
    expect(text).toContain("line three");
  });
});

describe("markdownToTiptap - 行内代码", () => {
  it("parses inline code with code mark", () => {
    const doc = markdownToTiptap("Use `npm install` to install");
    const inline = firstBlock(doc).content;
    const codeNode = inline.find((n: any) => n.marks?.some((m: any) => m.type === "code"));
    expect(codeNode).toBeDefined();
    expect(codeNode.text).toBe("npm install");
  });
});

describe("markdownToTiptap - 粗体与斜体", () => {
  it("parses **bold** with bold mark", () => {
    const doc = markdownToTiptap("This is **bold** text");
    const inline = firstBlock(doc).content;
    const boldNode = inline.find((n: any) => n.marks?.some((m: any) => m.type === "bold"));
    expect(boldNode).toBeDefined();
    expect(boldNode.text).toBe("bold");
  });

  it("parses __bold__ with bold mark", () => {
    const doc = markdownToTiptap("This is __bold__ text");
    const inline = firstBlock(doc).content;
    const boldNode = inline.find((n: any) => n.marks?.some((m: any) => m.type === "bold"));
    expect(boldNode).toBeDefined();
    expect(boldNode.text).toBe("bold");
  });

  it("parses *italic* with italic mark", () => {
    const doc = markdownToTiptap("This is *italic* text");
    const inline = firstBlock(doc).content;
    const italicNode = inline.find((n: any) => n.marks?.some((m: any) => m.type === "italic"));
    expect(italicNode).toBeDefined();
    expect(italicNode.text).toBe("italic");
  });

  it("parses _italic_ with italic mark", () => {
    const doc = markdownToTiptap("This is _italic_ text");
    const inline = firstBlock(doc).content;
    const italicNode = inline.find((n: any) => n.marks?.some((m: any) => m.type === "italic"));
    expect(italicNode).toBeDefined();
    expect(italicNode.text).toBe("italic");
  });

  it("parses ***bold italic*** with both marks", () => {
    const doc = markdownToTiptap("This is ***both*** text");
    const inline = firstBlock(doc).content;
    const node = inline.find((n: any) => n.marks?.length === 2);
    expect(node).toBeDefined();
    const markTypes = node.marks.map((m: any) => m.type).sort();
    expect(markTypes).toEqual(["bold", "italic"]);
  });
});

describe("markdownToTiptap - 删除线", () => {
  it("parses ~~strikethrough~~ with strike mark", () => {
    const doc = markdownToTiptap("This is ~~deleted~~ text");
    const inline = firstBlock(doc).content;
    const node = inline.find((n: any) => n.marks?.some((m: any) => m.type === "strike"));
    expect(node).toBeDefined();
    expect(node.text).toBe("deleted");
  });
});

describe("markdownToTiptap - 链接与图片", () => {
  it("parses image ![alt](url)", () => {
    const doc = markdownToTiptap('![logo](https://example.com/logo.png "Title")');
    const block = firstBlock(doc);
    const img = block.content.find((n: any) => n.type === "image");
    expect(img).toBeDefined();
    expect(img.attrs.src).toBe("https://example.com/logo.png");
    expect(img.attrs.alt).toBe("logo");
    expect(img.attrs.title).toBe("Title");
  });

  it("parses image without title", () => {
    const doc = markdownToTiptap("![pic](https://example.com/pic.png)");
    const img = firstBlock(doc).content.find((n: any) => n.type === "image");
    expect(img.attrs.src).toBe("https://example.com/pic.png");
    expect(img.attrs.alt).toBe("pic");
    expect(img.attrs.title).toBeNull();
  });

  it("parses link [text](url) with link mark", () => {
    const doc = markdownToTiptap("[Click here](https://example.com)");
    const inline = firstBlock(doc).content;
    const textNode = inline.find((n: any) => n.type === "text");
    expect(textNode).toBeDefined();
    expect(textNode.text).toBe("Click here");
    expect(textNode.marks[0].type).toBe("link");
    expect(textNode.marks[0].attrs.href).toBe("https://example.com");
  });
});

describe("markdownToTiptap - 占位符与下拉", () => {
  it("parses {{xxx}} as inputs node (content discarded)", () => {
    const doc = markdownToTiptap("Fill in {{answer}} please");
    const inline = firstBlock(doc).content;
    const inputsNode = inline.find((n: any) => n.type === "inputs");
    expect(inputsNode).toBeDefined();
    expect(inputsNode.attrs.content).toBe("");
  });

  it("parses ||options|| as select node", () => {
    const doc = markdownToTiptap("Choose ||A|B|C||");
    const inline = firstBlock(doc).content;
    const selectNode = inline.find((n: any) => n.type === "select");
    expect(selectNode).toBeDefined();
    expect(selectNode.attrs.content).toBe("A|B|C");
  });
});

describe("markdownToTiptap - 列表", () => {
  it("parses unordered list with - marker", () => {
    const doc = markdownToTiptap("- item one\n- item two");
    const block = firstBlock(doc);
    expect(block.type).toBe("bulletList");
    expect(block.content).toHaveLength(2);
    expect(block.content[0].type).toBe("listItem");
  });

  it("parses unordered list with * marker", () => {
    const doc = markdownToTiptap("* a\n* b");
    expect(firstBlockType(doc)).toBe("bulletList");
  });

  it("parses unordered list with + marker", () => {
    const doc = markdownToTiptap("+ x\n+ y");
    expect(firstBlockType(doc)).toBe("bulletList");
  });

  it("parses ordered list", () => {
    const doc = markdownToTiptap("1. first\n2. second");
    const block = firstBlock(doc);
    expect(block.type).toBe("orderedList");
    expect(block.content).toHaveLength(2);
    expect(block.content[0].type).toBe("listItem");
  });

  it("preserves inline formatting inside list items", () => {
    const doc = markdownToTiptap("- **bold** item");
    const item = firstBlock(doc).content[0];
    const para = item.content[0];
    const boldNode = para.content.find((n: any) => n.marks?.some((m: any) => m.type === "bold"));
    expect(boldNode).toBeDefined();
    expect(boldNode.text).toBe("bold");
  });
});

describe("markdownToTiptap - 引用块", () => {
  it("parses blockquote", () => {
    const doc = markdownToTiptap("> This is a quote");
    const block = firstBlock(doc);
    expect(block.type).toBe("blockquote");
    expect(block.content[0].type).toBe("paragraph");
  });

  it("parses multi-line blockquote", () => {
    const doc = markdownToTiptap("> line one\n> line two");
    const block = firstBlock(doc);
    expect(block.type).toBe("blockquote");
  });
});

describe("markdownToTiptap - 代码块", () => {
  it("parses fenced code block with language", () => {
    const doc = markdownToTiptap("```js\nconst x = 1\n```");
    const block = firstBlock(doc);
    expect(block.type).toBe("codeBlock");
    expect(block.attrs.language).toBe("js");
    expect(block.content[0].text).toBe("const x = 1");
  });

  it("parses fenced code block without language", () => {
    const doc = markdownToTiptap("```\nplain code\n```");
    const block = firstBlock(doc);
    expect(block.type).toBe("codeBlock");
    expect(block.attrs.language).toBe("");
  });

  it("parses multi-line code block preserving newlines", () => {
    const doc = markdownToTiptap("```\nline1\nline2\nline3\n```");
    const block = firstBlock(doc);
    expect(block.content[0].text).toBe("line1\nline2\nline3");
  });
});

describe("markdownToTiptap - 分隔线", () => {
  it("parses --- as horizontal rule", () => {
    const doc = markdownToTiptap("---");
    expect(firstBlockType(doc)).toBe("horizontalRule");
  });

  it("parses ---- as horizontal rule", () => {
    const doc = markdownToTiptap("----");
    expect(firstBlockType(doc)).toBe("horizontalRule");
  });
});

describe("markdownToTiptap - 复合文档", () => {
  it("parses a mixed document with multiple block types", () => {
    const md = `# Title

Some paragraph text.

- list item

> quote

\`\`\`js
code
\`\`\`
`;
    const doc = markdownToTiptap(md);
    const types = (doc.content || []).map((b: any) => b.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
    expect(types).toContain("blockquote");
    expect(types).toContain("codeBlock");
  });

  it("skips empty lines between blocks", () => {
    const doc = markdownToTiptap("# A\n\n\n\n# B");
    const headings = (doc.content || []).filter((b: any) => b.type === "heading");
    expect(headings).toHaveLength(2);
  });
});
