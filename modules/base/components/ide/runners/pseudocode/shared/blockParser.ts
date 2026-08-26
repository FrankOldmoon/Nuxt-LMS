/**
 * 通用块解析器：把缩进/关键字界定的伪代码组织成嵌套块树。
 * IGCSE 与 ALEVEL 的块结构均由"开块关键字 + 收块关键字"界定
 * （IF/ENDIF、WHILE/ENDWHILE、FOR/NEXT、REPEAT/UNTIL、
 *  PROCEDURE/ENDPROCEDURE、FUNCTION/ENDFUNCTION、CASE/ENDCASE、
 *  TYPE/ENDTYPE、CLASS/ENDCLASS），方言差异通过 BlockConfig 注入。
 * 块树只负责"结构"，每行的语义由各方言的行内 parser 负责。
 */

export type BlockKind =
  | "IF"
  | "WHILE"
  | "FOR"
  | "REPEAT"
  | "PROCEDURE"
  | "FUNCTION"
  | "CASE"
  | "TYPE"
  | "CLASS";

export interface BlockLine {
  text: string; // 去除首尾空白（含缩进）
  lineNo: number;
  role: "open" | "close" | "branch" | "normal" | "comment";
  branchKind?: "ELSE" | "OTHERWISE";
}

export interface BlockNode {
  kind: BlockKind | "ROOT";
  headerText: string; // 开块行文本
  closeText: string | null; // 收块行文本（如 UNTIL cond / NEXT i / ENDIF）
  body: Array<BlockLine | BlockNode>;
}

export interface BlockConfig {
  kindOfOpen(line: string): BlockKind | null;
  kindOfClose(line: string): BlockKind | null;
  branchOf(line: string): "ELSE" | "OTHERWISE" | null;
  isComment(line: string): boolean;
}

export function buildBlockTree(source: string, cfg: BlockConfig): BlockNode {
  const root: BlockNode = {
    kind: "ROOT",
    headerText: "",
    closeText: null,
    body: [],
  };
  const stack: BlockNode[] = [root];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    if (text === "") continue;
    const top = stack[stack.length - 1];

    // 独立 THEN 行（IGCSE：IF 换行 THEN）—— 不产生任何节点
    if (/^THEN\s*$/i.test(text) && top.kind === "IF") {
      continue;
    }

    if (cfg.isComment(text)) {
      top.body.push({ text, lineNo: i + 1, role: "comment" });
      continue;
    }

    const openKind = cfg.kindOfOpen(text);
    const closeKind = cfg.kindOfClose(text);
    const branch = cfg.branchOf(text);

    if (openKind) {
      const node: BlockNode = {
        kind: openKind,
        headerText: text,
        closeText: null,
        body: [],
      };
      top.body.push(node);
      stack.push(node);
    } else if (closeKind) {
      if (stack.length > 1) {
        const node = stack.pop()!;
        node.closeText = text;
      }
      // 收块行不匹配当前栈顶时忽略（容错）
    } else if (branch) {
      top.body.push({ text, lineNo: i + 1, role: "branch", branchKind: branch });
    } else {
      top.body.push({ text, lineNo: i + 1, role: "normal" });
    }
  }
  return root;
}

/** 收集块树中所有普通行的文本（调试/诊断用） */
export function flattenBlockLines(node: BlockNode): string[] {
  const out: string[] = [];
  for (const item of node.body) {
    if ("body" in item && item.kind !== "normal") {
      out.push(...flattenBlockLines(item));
    } else {
      out.push(item.text);
    }
  }
  return out;
}
