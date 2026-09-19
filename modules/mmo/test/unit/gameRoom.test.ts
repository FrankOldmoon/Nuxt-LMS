/**
 * GameRoom 权威服务器逻辑单元测试
 *
 * 覆盖评审整改（#10）中需要回归保护的核心权威逻辑：
 *  - applyXp 升级曲线（单级内累积 / 跨级溢出 / 连跨多级）
 *  - checkAllTasks 迭代式结算（任务链奖励递进，迭代 guard 防递归爆栈）
 *  - kill / battleWin 反作弊：仅信任服务端 MONSTER_DEFS.key，忽略客户端伪造 key 与 xp
 *  - battleWin 承受伤害上限钳制（≤ atk*20）
 *  - 掉落服务端权威决定（不信任客户端上报 loot）
 *
 * 通过 vi.mock 用桩替换 colyseus 的 Room，避免真实房间需要 server 上下文。
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('colyseus', () => {
  class Room {}
  return { default: { Room }, Room }
})

import { GameRoom } from '../../server/colyseus/GameRoom'

/** 最小玩家对象：模拟 Colyseus Player 的字段（被测试方法只读写这些字段） */
function makePlayer(over: Partial<any> = {}) {
  return {
    sessionId: 's1',
    x: 100, y: 100, facing: 2, mode: 'idle',
    name: 'tester',
    cfgJSON: '{}',
    gold: 0,
    inventoryJSON: '{}',
    equippedJSON: '{}',
    tasksJSON: '{}',
    mapId: 'world',
    hp: 100, maxHp: 100,
    xp: 0, level: 1,
    ...over,
  }
}

function makeRoom() {
  const room: any = new GameRoom()
  // battleWin 的掉落地表会写入 state.groundItems
  room.state = { groundItems: [] as any[] }
  return room
}

describe('GameRoom - applyXp 升级曲线', () => {
  it('单级内累积 xp 不升级', () => {
    const room = makeRoom()
    const p = makePlayer()
    room.applyXp(p, 50)
    expect(p.xp).toBe(50)
    expect(p.level).toBe(1)
    expect(p.maxHp).toBe(100)
  })

  it('刚好跨过阈值升级并扣减溢出 xp', () => {
    const room = makeRoom()
    const p = makePlayer()
    room.applyXp(p, 120) // level1 需要 100
    expect(p.level).toBe(2)
    expect(p.xp).toBe(20) // 120 - 100
    expect(p.maxHp).toBe(120) // +20 每级
    expect(p.hp).toBe(120) // 升级回满
  })

  it('一次大额经验连跨多级', () => {
    const room = makeRoom()
    const p = makePlayer()
    // level1 需 100, level2 需 200, level3 需 300, 溢出 10
    room.applyXp(p, 100 + 200 + 300 + 10)
    expect(p.level).toBe(4)
    expect(p.xp).toBe(10)
    expect(p.maxHp).toBe(100 + 20 * 3) // 160
  })
})

describe('GameRoom - checkAllTasks 迭代结算（防递归爆栈）', () => {
  it('击杀任务奖励金币 → 解锁金币任务：链式迭代，单次结算全部完成', () => {
    const room: any = makeRoom()
    // 注入受控的"教师编排"任务链（运行时 instTasks，不污染全局 TASKS）
    room.instTasks = [
      { id: 'tKill', type: 'kill', target: 'bat', count: 1, reward: { gold: 100 }, giver: 'x' },
      { id: 'tGold', type: 'gold', target: 100, count: 1, reward: { xp: 50 }, giver: 'x' },
    ]
    const p = makePlayer({
      tasksJSON: JSON.stringify({
        tKill: { accepted: true, progress: 0, done: false },
        tGold: { accepted: true, progress: 0, done: false },
      }),
    })
    room.playerOf = () => p
    room.handleKill({ sessionId: 's1' }, { key: 'bat' })

    const tasks = JSON.parse(p.tasksJSON)
    expect(tasks.tKill.done).toBe(true)
    expect(tasks.tGold.done).toBe(true)
    expect(p.gold).toBe(100) // 击杀奖励
    expect(p.xp).toBe(10 + 50) // 怪物 xp(10) + 金币任务 xp(50)
  })

  it('默认玩家（真实 TASKS）反复结算不抛错、不无限递归', () => {
    const room: any = makeRoom()
    const p = makePlayer()
    expect(() => {
      for (let i = 0; i < 20; i++) room.checkAllTasks(p)
    }).not.toThrow()
    const tasks = JSON.parse(p.tasksJSON)
    // 未接取任何任务，不应产生 done 记录（验证不会因迭代而误发奖励）
    expect(Object.keys(tasks).length).toBe(0)
  })
})

describe('GameRoom - kill 反作弊校验', () => {
  it('合法怪物 key 才给经验', () => {
    const room: any = makeRoom()
    const p = makePlayer()
    room.playerOf = () => p
    room.handleKill({ sessionId: 's1' }, { key: 'bat' })
    expect(p.xp).toBe(10) // MONSTER_DEFS bat.xp
  })

  it('伪造/未知 key 不给经验（服务端忽略）', () => {
    const room: any = makeRoom()
    const p = makePlayer({ xp: 5 })
    room.playerOf = () => p
    room.handleKill({ sessionId: 's1' }, { key: 'cheat_monster_999' })
    expect(p.xp).toBe(5)
  })
})

describe('GameRoom - battleWin 服务端权威结算', () => {
  it('合法 key 给经验并扣血（伤害经防御减免）', () => {
    const room: any = makeRoom()
    const p = makePlayer({ equippedJSON: '{}' }) // 无防御
    room.playerOf = () => p
    room.handleBattleWin({ sessionId: 's1' }, { key: 'bat', taken: 20 })
    expect(p.xp).toBe(10)
    expect(p.hp).toBe(80) // taken=20,def=0 → dmg=20
  })

  it('承受伤害被钳制到 atk*20 上限', () => {
    const room: any = makeRoom()
    const p = makePlayer({ equippedJSON: '{}' })
    room.playerOf = () => p
    // bat atk=6 → 上限 120；客户端上报 taken=9999 应被钳制
    room.handleBattleWin({ sessionId: 's1' }, { key: 'bat', taken: 9999 })
    expect(p.hp).toBe(0) // dmg=120 超过 hp → 钳制到 0
  })

  it('未知 key 不结算（不扣血不 + 经验）', () => {
    const room: any = makeRoom()
    const p = makePlayer({ xp: 7, hp: 90 })
    room.playerOf = () => p
    room.handleBattleWin({ sessionId: 's1' }, { key: 'nope', taken: 50 })
    expect(p.xp).toBe(7)
    expect(p.hp).toBe(90)
  })

  it('掉落由服务端权威决定（强制掉落）', () => {
    const room: any = makeRoom()
    const p = makePlayer()
    room.playerOf = () => p
    const r = vi.spyOn(Math, 'random').mockReturnValue(0.0)
    room.handleBattleWin({ sessionId: 's1' }, { key: 'bat', taken: 0 })
    expect(room.state.groundItems.length).toBe(1)
    const gi = room.state.groundItems[0]
    expect(['herb', 'bread', 'gem']).toContain(gi.itemId) // bat.drops
    expect(gi.mapId).toBe('world')
    r.mockRestore()
  })

  it('dropChance 不满足时不掉落', () => {
    const room: any = makeRoom()
    const p = makePlayer()
    room.playerOf = () => p
    const r = vi.spyOn(Math, 'random').mockReturnValue(0.99) // > bat.dropChance(0.6)
    room.handleBattleWin({ sessionId: 's1' }, { key: 'bat', taken: 0 })
    expect(room.state.groundItems.length).toBe(0)
    r.mockRestore()
  })
})
