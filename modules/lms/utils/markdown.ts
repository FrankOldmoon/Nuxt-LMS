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
 * 纯文本 → 简单 tiptap doc JSON（按换行拆段落，不做任何 markdown 解析）。
 * richEditor 关闭 markdown 开关时把字符串固化为 doc JSON，
 * 使「纯文本」与「markdown 字符串」在数据层面天然可区分（字符串=markdown，对象=tiptap JSON）。
 */
export function plainTextToDoc(text: string): TiptapNode {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  const paragraphs = normalized.split('\n').map((line) => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : undefined,
  }));
  return { type: 'doc', content: paragraphs };
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
      || /^>\s+\S/.test(line)
      || /^[-*+]\s+/.test(line)
      || /^\d+\.\s+/.test(line)
      || /^---+$/.test(line.trim())
      || /^\$\$/.test(line)
      || /^\s*\|.+/.test(line) // 表格行（含表头/分隔/数据行）
      || /^:::/.test(line); // 扩展组件围栏（callout/columns/html 等）
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

      // 扩展围栏节点构建器（可访问 parseBlocks / parseInline / parseParams 等）
      // extType 小写；extParams 为开围栏行 "类型 参数" 中的参数串
      function buildExtFenceBlock(extType: string, extParams: string, raw: string): TiptapNode | null {
        const attrs = parseParams(extParams);
        const body = raw.trim();
        // 子内容转 doc（供 tabs/stepper/vfiles 的富文本 content 使用）
        const sub = (md: string): TiptapNode => ({ type: 'doc', content: parseBlocks(md) });
        // 生成短唯一 id
        const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
        // vue 包装节点
        const vueWrap = (type: string, content: any, extra?: Record<string, any>): TiptapNode => ({
          type: 'vue',
          attrs: { type, content: typeof content === 'string' ? content : JSON.stringify(content), ...(extra || {}) },
        });

        switch (extType) {
          case 'callout': {
            const node: TiptapNode = { type: 'callout', content: parseBlocks(body) };
            const icon = attrs['icon']; const bg = attrs['bg'] || attrs['backgroundColor'];
            const fc = attrs['color'] || attrs['fontColor'];
            if (icon || fc || bg) {
              node.attrs = {};
              if (icon) node.attrs.icon = icon;
              if (bg) node.attrs.backgroundColor = bg;
              if (fc) node.attrs.fontColor = fc;
            }
            return node;
          }
          case 'details': {
            const titleBlocks = parseBlocks(attrs['title'] || '更多详情') || [];
            return {
              type: 'details',
              attrs: attrs['open'] === '1' || attrs['open'] === 'true' ? { open: true } : undefined,
              content: [
                { type: 'detailsSummary', content: titleBlocks },
                { type: 'detailsContent', content: parseBlocks(body) },
              ],
            };
          }
          case 'iframe': {
            return { type: 'iframe', attrs: { src: attrs['src'] || body.trim(), height: attrs['height'] ? Number(attrs['height']) : 200 } };
          }
          case 'image': {
            const node: TiptapNode = { type: 'image', attrs: { src: attrs['src'] || body.trim() } };
            if (attrs['alt']) node.attrs.alt = attrs['alt'];
            if (attrs['title']) node.attrs.title = attrs['title'];
            return node;
          }
          case 'tasklist': {
            const items = body.split('\n').map((ln) => ln.trim()).filter(Boolean)
              .filter((ln) => /^[-*+]\s*\[[ xX]\]/.test(ln))
              .map((ln) => {
                const checked = /\[[xX]\]/.test(ln);
                const text = ln.replace(/^[-*+]\s*\[[ xX]\]\s*/, '');
                return { type: 'taskItem', attrs: { checked }, content: parseBlocks(text) };
              });
            if (!items.length) return null;
            return { type: 'taskList', content: items };
          }
          case 'blockquote':
            return { type: 'blockquote', content: parseBlocks(body) };
          // ===== 新增：column / echarts / 自定义 vue 组件 =====
          case 'columns': {
            // :::columns 内用 :::col width=200 ... ::: 划分左右分栏
            const colNodes: TiptapNode[] = [];
            const lines = body.split('\n');
            let ci = 0;
            let guard = 0;
            while (ci < lines.length && guard++ < 1000) {
              const m = lines[ci].match(/^:::\s*col(?:\s+(.*))?$/i);
              if (m) {
                const colAttrs = parseParams(m[1] || '');
                const fb = readFenceBody(lines, ci);
                ci = fb.nextIndex;
                colNodes.push({
                  type: 'column',
                  attrs: { colWidth: colAttrs['width'] ? Number(colAttrs['width']) : 200 },
                  content: parseBlocks(fb.inner.join('\n')),
                });
              } else {
                ci++;
              }
            }
            if (!colNodes.length) return null;
            return { type: 'columnContainer', content: colNodes };
          }
          case 'echarts': {
            // :::echarts height=300  正文为该 ECharts option JSON :::
            let option: any = null;
            try { option = JSON.parse(body); } catch { option = null; }
            if (!option || typeof option !== 'object') return null;
            const node: TiptapNode = { type: 'echarts', attrs: { chartOptions: option } };
            if (attrs['height']) node.attrs = { chartOptions: option, height: Number(attrs['height']) || 200 };
            return node;
          }
          case 'html': {
            // :::html height=300  正文为一段 HTML 代码 :::（渲染为 iframe 沙箱页面）
            const extra: Record<string, any> = {};
            if (attrs['height']) extra.height = Number(attrs['height']) || 300;
            return vueWrap('html', body, extra);
          }
          case 'tabs': {
            // :::tabs  每个 ## 小标题是一个标签页，正文为该页 markdown :::
            const sections = splitByH2(body);
            if (!sections.length) return null;
            const tabs = sections.map((s) => ({ label: s.title || 'Tab', content: sub(s.lines.join('\n')) }));
            return vueWrap('tabs', { tabs });
          }
          case 'stepper': {
            // :::stepper orientation=horizontal  每个 ## 小标题是一步（title+description） :::
            const sections = splitByH2(body);
            if (!sections.length) return null;
            const steps = sections.map((s) => ({ title: s.title || '', description: sub(s.lines.join('\n')) }));
            return vueWrap('stepper', { orientation: attrs['orientation'] || 'horizontal', steps });
          }
          case 'vfiles': {
            // :::vfiles  每个 ## 小标题是一个文件（label + 富文本 content） :::
            const sections = splitByH2(body);
            if (!sections.length) return null;
            const items = sections.map((s) => ({
              id: uid(),
              label: s.title || 'untitled',
              type: 'file',
              content: sub(s.lines.join('\n')),
            }));
            return vueWrap('vfiles', { items });
          }
          case 'sheet': {
            // :::sheet height=300  正文为 markdown 表格，转为 Univer 单元格数据 :::
            const cellData = tableToCellData(body);
            return vueWrap('sheet', { height: attrs['height'] ? Number(attrs['height']) : 300, cellData });
          }
          case 'mindmap': {
            // :::mindmap  正文为 markdown（一级标题 # / 缩进列表 - 表达节点层级），
            // content 存原始 markdown 字符串，由 simple-mind-map 解析渲染 :::
            return vueWrap('mindmap', body);
          }
          case 'pintora': {
            // :::pintora height=300  正文为 Pintora DSL（sequenceDiagram / activityDiagram / mindmap 等），
            // content 存原始 DSL 字符串，由 Pintora（CDN 加载）渲染为 SVG :::
            const extra: Record<string, any> = {};
            if (attrs['height']) extra.height = Number(attrs['height']) || 300;
            return vueWrap('pintora', body, extra);
          }
          default:
            return null;
        }
      }

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

      // ===== 扩展节点围栏：:::类型 参数 ... ::: =====
      // 用于编辑器支持的富组件（callout/details/image/iframe/taskList/columns/
      // html/tabs/stepper/vfiles/sheet/echarts 等），普通 markdown 语法表达不了，
      // 用统一围栏语法承载：
      //   :::callout icon=💡 bg=#eff6ff
      //   内容段落
      //   :::
      // 嵌套感知：:::word 开头 depth+1，单独 ::: 结束 depth-1（支持 :::columns/:::col）
      const extFenceOpen = line.match(/^:::\s*([A-Za-z][\w-]*)(?:\s+(.*))?$/);
      if (extFenceOpen) {
        const extType = extFenceOpen[1].toLowerCase();
        const extParams = extFenceOpen[2] || '';
        const { inner, nextIndex } = readFenceBody(lines, i);
        i = nextIndex;
        const block = buildExtFenceBlock(extType, extParams, inner.join('\n'));
        if (block) blocks.push(block);
        continue;
      }

      // 各处可复用的 `:::` 围栏读取（嵌套计数，返回围栏内行与结束后的索引）
      function readFenceBody(lines: string[], startIdx: number): { inner: string[]; nextIndex: number } {
        let depth = 1;
        let j = startIdx + 1;
        const inner: string[] = [];
        while (j < lines.length) {
          const l = lines[j];
          if (/^:::\s*([A-Za-z][\w-]*)/.test(l)) {
            depth++; // 嵌套开围栏，保留用于后续解析
            inner.push(l);
          } else if (/^:::\s*$/.test(l)) {
            depth--;
            if (depth === 0) { j++; break; }
            inner.push(l);
          } else {
            inner.push(l);
          }
          j++;
        }
        return { inner, nextIndex: j };
      }

      // 解析 "k=v k=v" 参数
      function parseParams(extParams: string): Record<string, string> {
        const attrs: Record<string, string> = {};
        const pm = extParams.match(/(\w+)=("([^"]*)"|'([^']*)'|[^\s]+)/g);
        (pm || []).forEach((kv: string) => {
          const eq = kv.indexOf('=');
          if (eq > 0) { const k = kv.slice(0, eq).trim(); const v = kv.slice(eq + 1).replace(/^["']|["']$/g, '').trim(); attrs[k] = v; }
        });
        return attrs;
      }

      // 按 ## 二级标题切分围栏正文为若干小节
      function splitByH2(body: string): { title: string; lines: string[] }[] {
        const lines = body.split('\n');
        const sections: { title: string; lines: string[] }[] = [];
        let cur: { title: string; lines: string[] } | null = null;
        for (const ln of lines) {
          const m = ln.match(/^#{2}\s+(.*)$/);
          if (m) {
            if (cur) sections.push(cur);
            cur = { title: m[1].trim(), lines: [] };
          } else if (cur) {
            cur.lines.push(ln);
          }
        }
        if (cur) sections.push(cur);
        return sections;
      }

      // markdown 表格 → sheet 的 cellData（Record<行, Record<列, {v}>>）
      function tableToCellData(body: string): Record<number, Record<number, { v: string }>> {
        const cellData: Record<number, Record<number, { v: string }>> = {};
        const rows = body.split('\n').map((s) => s.trim()).filter(Boolean);
        let r = 0;
        for (const ln of rows) {
          if (!ln.startsWith('|') || !ln.includes('|')) continue;
          const cells = ln.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
          if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 表头分隔行
          const row: Record<number, { v: string }> = {};
          cells.forEach((v, c) => { row[c] = { v }; });
          cellData[r] = row;
          r++;
        }
        return cellData;
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

      // 引用块（要求 > 后有空格和内容，如 "> content"；单个 ">" 不识别为引用）
      if (/^>\s+\S/.test(line)) {
        const quoteLines: string[] = [];
        while (i < lines.length && /^>\s+\S/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s+/, ''));
          i++;
        }
        blocks.push({
          type: 'blockquote',
          content: parseBlocks(quoteLines.join('\n'))
        });
        continue;
      }

      // 表格：| 列1 | 列2 |（首行为表头，第二行为 --- 分隔符行）
      if (/^\s*\|/.test(line) && line.includes('|')) {
        const rawRows: string[] = [line];
        i++;
        while (i < lines.length && /^\s*\|/.test(lines[i]) && lines[i].includes('|')) {
          rawRows.push(lines[i]);
          i++;
        }
        // 拆分一行单元格：去掉首尾竖线后按 | 切开并 trim
        const splitRow = (s: string): string[] => {
          const t = s.trim();
          return t
            .replace(/^\|/, '')
            .replace(/\|\s*$/, '')
            .split('|')
            .map((c) => c.trim());
        };
        // 分隔符行：每个单元格都是 :?---+:?（含冒号对齐符号）
        const isSep = (cells: string[]): boolean =>
          cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
        const makeCell = (type: string, text: string): TiptapNode => ({
          type,
          content: [{ type: 'paragraph', content: parseInline(text) }],
        });
        const tableRows: TiptapNode[] = [];
        let bodyStart = 0;
        // 第二行是分隔符 → 第一行为表头
        if (rawRows.length >= 2 && isSep(splitRow(rawRows[1]))) {
          tableRows.push({
            type: 'tableRow',
            content: splitRow(rawRows[0]).map((c) => makeCell('tableHeader', c)),
          });
          bodyStart = 2;
        }
        for (let ri = bodyStart; ri < rawRows.length; ri++) {
          if (isSep(splitRow(rawRows[ri]))) continue; // 跳过可能的额外分隔行
          tableRows.push({
            type: 'tableRow',
            content: splitRow(rawRows[ri]).map((c) => makeCell('tableCell', c)),
          });
        }
        if (tableRows.length > 0) blocks.push({ type: 'table', content: tableRows });
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