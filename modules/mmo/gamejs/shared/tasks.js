// tasks.js —— 任务定义与"当前任务"解析
// 静态 TASKS 来自 config/tasks.json; 教师编排副本的任务在运行时通过 addRuntimeTasks 注入。
import tasksData from "../config/tasks.json";

export const TASKS = tasksData.tasks;

// 运行时任务(副本)—— 去重合并, 不污染静态 TASKS
let EXTRA = [];
export function addRuntimeTasks(list) {
  for (const t of (list || [])) {
    if (!t || !t.id) continue;
    if (EXTRA.find((e) => e.id === t.id)) continue;
    if (TASKS.find((e) => e.id === t.id)) continue;
    EXTRA.push(t);
  }
}
export function allTasks() { return [...TASKS, ...EXTRA]; }

// tasksJSON = { [taskId]: { progress, done, accepted } }
// 当前任务 = 顺序中第一个已接取且未完成的任务; 返回 { task, progress } 或 null
export function currentTask(tasksJSON) {
  let recs = {};
  try { recs = JSON.parse(tasksJSON || "{}"); } catch { recs = {}; }
  for (const t of allTasks()) {
    const r = recs[t.id];
    if (r && r.accepted && !r.done) return { task: t, progress: r.progress || 0 };
  }
  return null;
}
