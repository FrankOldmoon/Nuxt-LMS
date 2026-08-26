// Tiptap 标准节点类型定义
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
 * 解析 ```question {json}``` 围栏内容为 vue 节点。
 * JSON 无效时返回 null（调用方降级为 codeBlock 保留原始内容）。
 */
function parseQuestionFence(raw: string): TiptapNode | null {
  const text = raw.trim();
  if (!text) return null;
  // 容错：去除可能的多余 markdown 包裹
  let cleaned = text;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }
  // 提取第一个 { 到最后一个 } 之间的内容，忽略前后多余文字
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
 * 构建代码围栏对应的 TipTap 节点：
 * - question 语言 → 解析为 vue 节点（JSON 无效时跳过，不降级为 codeBlock，
 *   避免流式中途将残缺 JSON 以 codeBlock 形式渲染出来；流式完成后 JSON 完整即正常渲染 question render）
 * - 其他语言 → codeBlock
 * 返回 null 表示跳过该围栏（调用方不 push 到 blocks）
 */
function buildFenceBlock(lang: string, raw: string): TiptapNode | null {
  if (lang === 'question') {
    const vueNode = parseQuestionFence(raw);
    if (vueNode) return vueNode;
    // question 围栏 JSON 无效（如流式中途不完整）：跳过，不降级为 codeBlock
    return null;
  }
  return {
    type: 'codeBlock',
    attrs: { language: lang },
    content: [{ type: 'text', text: raw }],
  };
}

/**
 * Markdown 转 Tiptap JSON 格式（TypeScript 版）
 * 新增支持 {{xxx}} 占位符语法 → 转为 inputs 节点（丢弃括号内内容）
 * 新增支持 ```question {json}``` 围栏 → 转为 vue 节点（content 为解析后的 JSON 对象）
 */
export function markdownToTiptap(markdown: string): TiptapNode {
  // 预处理：统一换行符
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) return { type: 'doc', content: [] };

  // 判断一行是否为块级元素起始
  function isBlockStart(line: string): boolean {
    return /^```/.test(line)
      || /^#{1,6}\s+/.test(line)
      || /^>\s?/.test(line)
      || /^[-*+]\s+/.test(line)
      || /^\d+\.\s+/.test(line)
      || /^---+$/.test(line.trim())
      || /^\$\$/.test(line);
  }

  // 解析行内元素
  function parseInline(str: string): TiptapNode[] {
    const nodes: TiptapNode[] = [];
    let remaining = str;

    // 行内语法正则（优先级从高到低）
    const inlinePatterns: InlinePattern[] = [
      // {{xxx}} 占位符 → inputs 节点（优先级最高，避免和其他语法冲突）
      {
        regex: /^\{\{(.*?)\}\}/,
        handler: () => ({
          type: 'inputs',
          attrs: { content: '' }
        })
      },
      // ||content|| → select 节点（inline 下拉选择）
      {
        regex: /^\|\|(.+?)\|\|/,
        handler: (match) => ({
          type: 'select',
          attrs: { content: match[1].trim() }
        })
      },
      // 行内数学公式 $...$（内容不含 $ 和换行；不匹配 $$ 开头的块级公式）
      // 要求紧贴 $ 的两侧为非空白字符，避免 "价格 $5 到 $10" 中的 $ 被误判为公式
      {
        regex: /^\$(\S(?:[^$\n]*\S)?)\$/,
        handler: (match) => ({
          type: 'inlineMath',
          attrs: { latex: match[1] }
        })
      },
      // 图片 ![alt](url "title")
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
      // 链接 [text](url "title")
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
      // 行内代码 `code`
      {
        regex: /^`([^`]+)`/,
        handler: (match) => ({
          type: 'text',
          text: match[1],
          marks: [{ type: 'code' }]
        })
      },
      // 粗斜体 ***text***
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
      // 粗体 **text**
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
      // 粗体 __text__
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
      // 斜体 *text*
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
      // 斜体 _text_
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
      // 删除线 ~~text~~
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
      // 硬换行（行尾两个空格）
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

      // 普通文本
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

  // 解析块级元素
  function parseBlocks(mdText: string): TiptapNode[] {
    const lines = mdText.split('\n');
    const blocks: TiptapNode[] = [];
    let i = 0;
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = '';
    // 开围栏的反引号数量（CommonMark：闭围栏须至少同等数量）
    let codeFenceLen = 0;

    // 段落：连续非空行各自解析行内语法，行与行之间用 hardBreak 连接（一个换行即换行）
    function parseParaLines(lines: string[]): TiptapNode[] {
      const content: TiptapNode[] = [];
      lines.forEach((ln, idx) => {
        if (idx > 0) content.push({ type: 'hardBreak' });
        content.push(...parseInline(ln));
      });
      return content;
    }

    while (i < lines.length) {
      const line = lines[i];

      // 代码块处理：支持 3+ 反引号围栏（如 ````doc ... ````）
      // 4 反引号围栏允许内部包含 3 反引号 question 块而不冲突
      const fenceMatch = line.match(/^(`{3,})(\w*)$/);
      if (fenceMatch) {
        if (!inCodeBlock) {
          // 开启围栏
          inCodeBlock = true;
          codeLang = fenceMatch[2] || '';
          codeFenceLen = fenceMatch[1].length;
          codeContent = [];
          i++;
          continue;
        } else if (fenceMatch[1].length >= codeFenceLen) {
          // 关闭围栏：反引号数量足够
          const fenceBlock = buildFenceBlock(codeLang, codeContent.join('\n'));
          if (fenceBlock) blocks.push(fenceBlock);
          inCodeBlock = false;
          codeFenceLen = 0;
          i++;
          continue;
        }
        // 反引号数量不足（如 4 围栏内的 3 反引号行），视为代码内容，落入下方 inCodeBlock 分支
      }

      if (inCodeBlock) {
        codeContent.push(line);
        i++;
        continue;
      }

      // 块级数学公式 $$...$$（单行或多行）
      if (/^\$\$/.test(line)) {
        // 单行形式：$$ latex $$
        const single = line.match(/^\$\$(.+)\$\$\s*$/);
        if (single) {
          blocks.push({
            type: 'blockMath',
            attrs: { latex: single[1].trim() }
          });
          i++;
          continue;
        }
        // 多行形式：$$ 开头，收集到包含 $$ 的行
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

      // 空行跳过
      if (line.trim() === '') {
        i++;
        continue;
      }

      // 分隔线
      if (/^---+$/.test(line.trim())) {
        blocks.push({ type: 'horizontalRule' });
        i++;
        continue;
      }

      // 标题
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

      // 引用块
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

      // 无序列表
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

      // 有序列表
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

      // 普通段落（收集连续非块级非空行）
      const paraLines: string[] = [];
      while (
        i < lines.length
        && lines[i].trim() !== ''
        && !isBlockStart(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      // 安全网：如果当前行被 isBlockStart 识别但未被前面的处理器消费
      // （如不支持的围栏语法），强制将该行作为段落内容消费，避免无限循环
      if (paraLines.length === 0 && i < lines.length) {
        paraLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        content: parseParaLines(paraLines)
      });
    }

    // 流式期间可能出现未闭合的代码块：把已累积的内容也输出，避免内容丢失
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