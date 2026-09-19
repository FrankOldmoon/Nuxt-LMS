// tasks.js —— 任务系统客户端（渲染 + 完成提示）
// 任务进度由 Colyseus 服务端权威维护（读 selfP.tasksJSON），客户端只负责展示。
import tasksData from "../config/tasks.json";
import { t } from "../i18n.js";
import { ITEMS } from "../shared/items.js";
import { appStore } from "./appStore.js";
import { allTasks } from "../shared/tasks.js";

export const TASKS = tasksData.tasks;

// 当前激活的任务 tab: "active"(进行中) | "done"(已完成)
let _taskTab = "active";

// 当前玩家的任务状态 {taskId: {progress, done, accepted}}
export function playerTasks() {
  const p = appStore.selfP;
  if (!p) return {};
  try { return JSON.parse(p.tasksJSON || "{}"); } catch { return {}; }
}

// 渲染任务面板（#tasks DOM，T 键打开）
export function renderTaskPanel() {
  const root = document.getElementById("tasks");
  if (!root) return;
  const tabs = document.getElementById("taskTabs");
  const list = document.getElementById("taskList");
  if (!tabs || !list) return;
  // 渲染 tab 按钮
  tabs.innerHTML =
    `<button class="task-tab ${_taskTab === "active" ? "on" : ""}" data-tab="active">${t("task.active")}</button>` +
    `<button class="task-tab ${_taskTab === "done" ? "on" : ""}" data-tab="done">${t("task.done")}</button>`;
  tabs.querySelectorAll(".task-tab").forEach((btn) => {
    btn.onclick = () => { _taskTab = btn.dataset.tab; renderTaskPanel(); };
  });
  // 按 tab 筛选任务
  const progress = playerTasks();
  const filtered = allTasks().filter((task) => {
    const rec = progress[task.id];
    if (_taskTab === "done") return rec && rec.done;
    return rec && rec.accepted && !rec.done;
  });
  list.innerHTML = "";
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">${_taskTab === "done" ? t("task.noDone") : t("task.noActive")}</div>`;
    return;
  }
  for (const task of filtered) {
    const rec = progress[task.id] || { progress: 0, done: false };
    const row = document.createElement("div");
    row.className = "task-row" + (rec.done ? " done" : "");
    let reward = [];
    if (task.reward && task.reward.gold) reward.push(`💰${task.reward.gold}`);
    if (task.reward && task.reward.xp) reward.push(`✦${task.reward.xp}XP`);
    if (task.reward && task.reward.items) for (const id in task.reward.items) reward.push(`${ITEMS[id] ? ITEMS[id].name : id}×${task.reward.items[id]}`);
    const pct = task.count > 0 ? Math.min(100, Math.round((rec.progress / task.count) * 100)) : 0;
    row.innerHTML =
      `<div class="task-name">${rec.done ? "✅ " : ""}${task.name}</div>` +
      `<div class="task-desc">${task.desc}</div>` +
      `<div class="task-bar"><i style="width:${pct}%"></i></div>` +
      `<div class="task-prog">${rec.progress}/${task.count}</div>` +
      (reward.length ? `<div class="task-reward">${t("task.reward")}: ${reward.join(" · ")}</div>` : "");
    list.appendChild(row);
  }
}

// 对比前后 tasksJSON，返回本次新完成的任务列表
export function detectTaskCompletions(newStr, prevStr) {
  const out = [];
  if (!newStr) return out;
  let cur, prev = {};
  try { cur = JSON.parse(newStr); } catch { return out; }
  try { prev = JSON.parse(prevStr || "{}"); } catch { prev = {}; }
  for (const task of allTasks()) {
    const c = cur[task.id], p = prev[task.id];
    if (c && c.done && (!p || !p.done)) out.push(task);
  }
  return out;
}
