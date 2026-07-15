// Tiptap standard node type definitions
interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

interface InlinePattern {
  regex: RegExp;
  handler: (match: RegExpMatchArray) => TiptapNode | TiptapNode[];
}

/**
 * Parse ```question {json}``` fence content into a vue node.
 * Returns null if JSON is invalid (caller degrades to codeBlock to preserve raw content).
 */
function parseQuestionFence(raw: string): TiptapNode | null {
  const text = raw.trim();
  if (!text) return null;
  // Fault tolerance: remove possible extra markdown wrapping
  let cleaned = text;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }
  // Extract content between the first { and the last }, ignoring extra text before/after
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return {
      type: 'vue',
      attrs: { type: 'question', content: parsed },
    };
  } catch {
    return null;
  }
}

/**
 * Build the TipTap node corresponding to a code fence:
 * - question language → parse as vue node (skip if JSON is invalid, do not degrade to codeBlock,
 *   to avoid rendering incomplete JSON as codeBlock during streaming; once streaming completes and JSON is intact, question render displays normally)
 * - other languages → codeBlock
 * Returns null to skip this fence (caller does not push to blocks)
 */
function buildFenceBlock(lang: string, raw: string): TiptapNode | null {
  if (lang === 'question') {
    const vueNode = parseQuestionFence(raw);
    if (vueNode) return vueNode;
    // question fence JSON is invalid (e.g., incomplete during streaming): skip, do not degrade to codeBlock
    return null;
  }
  return {
    type: 'codeBlock',
    attrs: { language: lang },
    content: [{ type: 'text', text: raw }],
  };
}

/**
 * Convert Markdown to Tiptap JSON format (TypeScript version)
 * Added support for {{xxx}} placeholder syntax → converts to inputs node (discards content inside braces)
 * Added support for ```question {json}``` fence → converts to vue node (content is the parsed JSON object)
 */
export function markdownToTiptap(markdown: string): TiptapNode {
  // Preprocess: normalize line breaks
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) return { type: 'doc', content: [] };

  // Determine whether a line is the start of a block-level element
  function isBlockStart(line: string): boolean {
    return /^```/.test(line)
      || /^#{1,6}\s+/.test(line)
      || /^>\s?/.test(line)
      || /^[-*+]\s+/.test(line)
      || /^\d+\.\s+/.test(line)
      || /^---+$/.test(line.trim())
      || /^\$\$/.test(line);
  }

  // Parse inline elements
  function parseInline(str: string): TiptapNode[] {
    const nodes: TiptapNode[] = [];
    let remaining = str;

    // Inline syntax regexes (in priority order from high to low)
    const inlinePatterns: InlinePattern[] = [
      // {{xxx}} placeholder → inputs node (highest priority, to avoid conflicts with other syntax)
      {
        regex: /^\{\{(.*?)\}\}/,
        handler: () => ({
          type: 'inputs',
          attrs: { content: '' }
        })
      },
      // ||content|| → select node (inline dropdown selection)
      {
        regex: /^\|\|(.+?)\|\|/,
        handler: (match) => ({
          type: 'select',
          attrs: { content: match[1].trim() }
        })
      },
      // Inline math formula $...$ (content must not contain $ or newlines; does not match $$ which starts a block formula)
      // Requires non-whitespace characters immediately adjacent to $ on both sides, to avoid mistaking $ in "price $5 to $10" as a formula
      {
        regex: /^\$(\S(?:[^$\n]*\S)?)\$/,
        handler: (match) => ({
          type: 'inlineMath',
          attrs: { latex: match[1] }
        })
      },
      // Image ![alt](url "title")
      {
        regex: /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/,
        handler: (match) => ({
          type: 'image',
          attrs: {
            src: match[2],
            alt: match[1] || '',
            title: match[3] || null
          }
        })
      },
      // Link [text](url "title")
      {
        regex: /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/,
        handler: (match) => {
          const innerNodes = parseInline(match[1]);
          const linkMark: TiptapMark = {
            type: 'link',
            attrs: { href: match[2], title: match[3] || null }
          };
          return innerNodes.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks ? [...node.marks, linkMark] : [linkMark];
            }
            return node;
          });
        }
      },
      // Inline code `code`
      {
        regex: /^`([^`]+)`/,
        handler: (match) => ({
          type: 'text',
          text: match[1],
          marks: [{ type: 'code' }]
        })
      },
      // Bold italic ***text***
      {
        regex: /^\*\*\*([^*]+)\*\*\*/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'bold' }, { type: 'italic' });
            }
            return node;
          });
        }
      },
      // Bold **text**
      {
        regex: /^\*\*([^*]+)\*\*/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'bold' });
            }
            return node;
          });
        }
      },
      // Bold __text__
      {
        regex: /^__([^_]+)__/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'bold' });
            }
            return node;
          });
        }
      },
      // Italic *text*
      {
        regex: /^\*([^*]+)\*/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'italic' });
            }
            return node;
          });
        }
      },
      // Italic _text_
      {
        regex: /^_([^_]+)_/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'italic' });
            }
            return node;
          });
        }
      },
      // Strikethrough ~~text~~
      {
        regex: /^~~([^~]+)~~/,
        handler: (match) => {
          const inner = parseInline(match[1]);
          return inner.map(node => {
            if (node.type === 'text') {
              node.marks = node.marks || [];
              node.marks.push({ type: 'strike' });
            }
            return node;
          });
        }
      },
      // Hard break (two spaces at end of line)
      {
        regex: /^  $/,
        handler: () => ({ type: 'hardBreak' })
      }
    ];

    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of inlinePatterns) {
        const match = remaining.match(pattern.regex);
        if (match) {
          matched = true;
          const result = pattern.handler(match);
          if (Array.isArray(result)) {
            nodes.push(...result);
          } else {
            nodes.push(result);
          }
          remaining = remaining.slice(match[0].length);
          break;
        }
      }

      // Plain text
      if (!matched) {
        const specialIndex = remaining.search(/[!`*_~\[{|$]/);
        if (specialIndex === -1) {
          nodes.push({ type: 'text', text: remaining });
          remaining = '';
        } else if (specialIndex === 0) {
          nodes.push({ type: 'text', text: remaining[0] });
          remaining = remaining.slice(1);
        } else {
          nodes.push({ type: 'text', text: remaining.slice(0, specialIndex) });
          remaining = remaining.slice(specialIndex);
        }
      }
    }

    return nodes;
  }

  // Parse block-level elements
  function parseBlocks(mdText: string): TiptapNode[] {
    const lines = mdText.split('\n');
    const blocks: TiptapNode[] = [];
    let i = 0;
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = '';
    // Number of backticks in the opening fence (CommonMark: closing fence must have at least as many)
    let codeFenceLen = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block handling: supports 3+ backtick fences (e.g., ````doc ... ````)
      // A 4-backtick fence allows containing 3-backtick question blocks without conflict
      const fenceMatch = line.match(/^(`{3,})(\w*)$/);
      if (fenceMatch) {
        if (!inCodeBlock) {
          // Opening fence
          inCodeBlock = true;
          codeLang = fenceMatch[2] || '';
          codeFenceLen = fenceMatch[1].length;
          codeContent = [];
          i++;
          continue;
        } else if (fenceMatch[1].length >= codeFenceLen) {
          // Closing fence: enough backticks
          const fenceBlock = buildFenceBlock(codeLang, codeContent.join('\n'));
          if (fenceBlock) blocks.push(fenceBlock);
          inCodeBlock = false;
          codeFenceLen = 0;
          i++;
          continue;
        }
        // Not enough backticks (e.g., a 3-backtick line inside a 4-backtick fence), treat as code content, falls through to the inCodeBlock branch below
      }

      if (inCodeBlock) {
        codeContent.push(line);
        i++;
        continue;
      }

      // Block-level math formula $$...$$ (single-line or multi-line)
      if (/^\$\$/.test(line)) {
        // Single-line form: $$ latex $$
        const single = line.match(/^\$\$(.+)\$\$\s*$/);
        if (single) {
          blocks.push({
            type: 'blockMath',
            attrs: { latex: single[1].trim() }
          });
          i++;
          continue;
        }
        // Multi-line form: starts with $$, collect until a line containing $$
        const mathLines: string[] = [];
        const afterOpen = line.replace(/^\$\$/, '');
        if (afterOpen.trim()) mathLines.push(afterOpen);
        i++;
        while (i < lines.length) {
          const l = lines[i];
          const closeIdx = l.indexOf('$$');
          if (closeIdx !== -1) {
            const before = l.slice(0, closeIdx);
            if (before.trim()) mathLines.push(before);
            i++;
            break;
          }
          mathLines.push(l);
          i++;
        }
        blocks.push({
          type: 'blockMath',
          attrs: { latex: mathLines.join('\n').trim() }
        });
        continue;
      }

      // Skip empty lines
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        blocks.push({ type: 'horizontalRule' });
        i++;
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          attrs: { level: headingMatch[1].length },
          content: parseInline(headingMatch[2])
        });
        i++;
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        const quoteLines: string[] = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({
          type: 'blockquote',
          content: parseBlocks(quoteLines.join('\n'))
        });
        continue;
      }

      // Unordered list
      if (/^[-*+]\s+/.test(line)) {
        const items: TiptapNode[] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^[-*+]\s+/, '');
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: parseInline(itemText) }]
          });
          i++;
        }
        blocks.push({ type: 'bulletList', content: items });
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+/.test(line)) {
        const items: TiptapNode[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\d+\.\s+/, '');
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: parseInline(itemText) }]
          });
          i++;
        }
        blocks.push({ type: 'orderedList', content: items });
        continue;
      }

      // Plain paragraph (collect consecutive non-block-level non-empty lines)
      const paraLines: string[] = [];
      while (
        i < lines.length
        && lines[i].trim() !== ''
        && !isBlockStart(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      // Safety net: if the current line is recognized by isBlockStart but not consumed by a preceding handler
      // (e.g., unsupported fence syntax), force-consume that line as paragraph content to avoid an infinite loop
      if (paraLines.length === 0 && i < lines.length) {
        paraLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        content: parseInline(paraLines.join(' '))
      });
    }

    // During streaming, an unclosed code block may appear: output accumulated content too, to avoid content loss
    if (inCodeBlock) {
      const fenceBlock = buildFenceBlock(codeLang, codeContent.join('\n'));
      if (fenceBlock) blocks.push(fenceBlock);
    }

    return blocks;
  }

  return {
    type: 'doc',
    content: parseBlocks(text)
  };
}
