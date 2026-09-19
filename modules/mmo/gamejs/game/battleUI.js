// battleUI.js —— 回合制战斗 DOM 覆盖层(独立于背包/商店, 自行注入样式)
// 由 MapScene 在玩家接触怪物时调用; 战斗期间暂停角色移动(由 MapScene 读 inBattle 控制)。
import { ITEMS } from "../shared/items.js";
import { t } from "../i18n.js";
import { sfx } from "./sfx.js";
import { usableBattleItems } from "./battle.js";

const STYLE_ID = "mmo-battle-style";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.battle-ov { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; background: rgba(6,10,18,.62); }
.battle-box { width: 540px; max-width: 94vw; background: #141b28; border: 1px solid #4f8cff; border-radius: 14px; padding: 16px 18px; box-shadow: 0 12px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(79,140,255,.25); }
.battle-title { font-size: 17px; font-weight: 800; color: #ffd66b; letter-spacing: 2px; text-align: center; margin-bottom: 10px; }
.battle-foes { display: flex; justify-content: center; margin-bottom: 10px; }
.foe { width: 100%; text-align: center; }
.foe-name { font-size: 15px; color: #ff8a8a; font-weight: 700; margin-bottom: 6px; }
.hpbar { height: 14px; background: #202a3c; border-radius: 7px; overflow: hidden; position: relative; }
.hpbar i { display: block; height: 100%; background: #ff5a5a; transition: width .25s ease; }
.hpbar.hero i { background: #5bd66b; }
.hpnum { font-size: 12px; color: #cfd8e6; margin-top: 3px; }
.battle-log { height: 132px; overflow-y: auto; background: #0e1420; border: 1px solid #2c3a52; border-radius: 10px; padding: 8px 10px; margin: 10px 0; font-size: 13px; line-height: 1.7; }
.bl { margin-bottom: 2px; }
.bl-player { color: #9fe8a0; }
.bl-monster { color: #ff9b9b; }
.bl-system { color: #ffd66b; font-weight: 700; }
.battle-hero { margin-bottom: 10px; }
.hero-line { font-size: 13px; color: #c9a7ff; margin-bottom: 4px; }
.battle-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; min-height: 40px; }
.batk { background: #b03a3a; color: #fff; border: none; border-radius: 9px; padding: 9px 18px; cursor: pointer; font-size: 14px; font-weight: 700; }
.batk:hover { filter: brightness(1.1); }
.batk.item { background: #2f6faf; }
.batk.flee { background: #555f73; }
.batk.back { background: #202a3c; color: #9fb3d0; }
.batk.close { background: #2f8f4e; }
.batk:disabled { opacity: .5; cursor: not-allowed; }
`;
  document.head.appendChild(s);
}

const $ = (id) => document.getElementById(id);
function setText(id, v) { const e = $(id); if (e) e.textContent = v; }
function setBar(id, v, max, color) {
  const e = $(id); if (!e) return;
  const r = Math.max(0, Math.min(1, v / max));
  e.style.width = Math.max(2, 100 * r) + "%";
  if (color) e.style.background = color;
}
function mkBtn(label, cls, onClick, disabled) {
  const b = document.createElement("button");
  b.className = "batk " + (cls || "");
  b.textContent = label;
  if (disabled) b.disabled = true;
  else b.addEventListener("click", onClick);
  return b;
}

export const BattleUI = {
  root: null,
  engine: null,
  onEnd: null,

  open(scene, engine, onEnd) {
    this.engine = engine;
    this.onEnd = onEnd;
    ensureStyle();
    this._build();
    this._render();
  },

  _build() {
    this.close();
    const root = document.createElement("div");
    root.id = "battleOverlay";
    root.className = "battle-ov";
    root.innerHTML = `
      <div class="battle-box">
        <div class="battle-title">⚔️ ${t("battle.title")}</div>
        <div class="battle-foes">
          <div class="foe">
            <div class="foe-name" id="bFoeName"></div>
            <div class="hpbar"><i id="bFoeHp"></i></div>
            <div class="hpnum" id="bFoeHpNum"></div>
          </div>
        </div>
        <div class="battle-log" id="bLog"></div>
        <div class="battle-hero">
          <div class="hero-line"><span id="bHeroLv"></span> · <span id="bHeroHpNum"></span></div>
          <div class="hpbar hero"><i id="bHeroHp"></i></div>
        </div>
        <div class="battle-actions" id="bActions"></div>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
  },

  _render() {
    const e = this.engine;
    const s = e.snapshot();
    setText("bFoeName", s.monster.name);
    setBar("bFoeHp", s.monster.hp, s.monster.maxHp, "#ff5a5a");
    setText("bFoeHpNum", `HP ${s.monster.hp}/${s.monster.maxHp}`);

    setText("bHeroLv", "Lv." + s.player.level);
    setBar("bHeroHp", s.player.hp, s.player.maxHp, "#5bd66b");
    setText("bHeroHpNum", `HP ${s.player.hp}/${s.player.maxHp}`);

    const log = $("bLog");
    if (log) {
      log.innerHTML = s.log.map((l) => `<div class="bl bl-${l.who}">${l.text}</div>`).join("");
      log.scrollTop = log.scrollHeight;
    }

    const act = $("bActions");
    act.innerHTML = "";
    if (s.over) {
      const label = s.result === "win" ? t("battle.win") : s.result === "flee" ? t("battle.flee") : t("battle.lose");
      act.appendChild(mkBtn(label, "close", () => this._finish()));
      return;
    }
    act.appendChild(mkBtn(t("battle.attackBtn"), "atk", () => this._do(() => e.attack())));
    const items = usableBattleItems(s.player.items);
    act.appendChild(mkBtn(items.length ? `${t("battle.itemsBtn")}(${items.length})` : t("battle.itemsBtn"), "item", () => this._openItems(items), items.length === 0));
    act.appendChild(mkBtn(t("battle.fleeBtn"), "flee", () => this._do(() => e.flee())));
  },

  _openItems(items) {
    const act = $("bActions");
    act.innerHTML = "";
    for (const id of items) {
      const it = ITEMS[id];
      act.appendChild(mkBtn(`${it.name}`, "item", () => this._do(() => this.engine.useItem(id))));
    }
    act.appendChild(mkBtn(t("battle.backBtn"), "back", () => this._render()));
  },

  _do(fn) {
    fn();
    sfx.hurtMonster();
    this._render();
  },

  _finish() {
    const cb = this.onEnd;
    this.close();
    if (cb) cb(this.engine.snapshot());
  },

  close() {
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
  },
};
