import { describe, it, expect, beforeEach } from "vitest";

/**
 * ws/state.ts 维护 WebSocket 房间/投票/竞赛的内存状态。
 * 这些函数操作模块级 Map，属纯内存逻辑，可直接测试。
 * 注意：模块级 Map 会在测试间保持状态，需 beforeEach 重置。
 */
import {
  userPeers,
  classRooms,
  raceRooms,
  groupRooms,
  votes,
  quickAnswers,
  raceStates,
  sendToUser,
  broadcastToClass,
  broadcastToRace,
  broadcastToGroup,
  computeRaceScores,
  getRaceOnlineUsers,
  type RaceState,
  type RaceAnswer,
} from "../../server/utils/ws/state";

/** 造一个假 peer（WebSocket 连接对象） */
function makePeer(userId?: number, userName?: string) {
  const sent: string[] = [];
  const p = {
    _userId: userId,
    _userName: userName,
    send: (msg: string) => sent.push(msg),
    _sent: sent,
  } as any;
  return p;
}

beforeEach(() => {
  userPeers.clear();
  classRooms.clear();
  raceRooms.clear();
  groupRooms.clear();
  votes.clear();
  quickAnswers.clear();
  raceStates.clear();
});

describe("sendToUser", () => {
  it("delivers message to all connections of a user", () => {
    const p1 = makePeer(1, "alice");
    const p2 = makePeer(1, "alice");
    userPeers.set(1, new Set([p1, p2]));
    sendToUser(1, { type: "pm", text: "hi" });
    expect(p1._sent).toHaveLength(1);
    expect(p2._sent).toHaveLength(1);
    expect(JSON.parse(p1._sent[0])).toEqual({ type: "pm", text: "hi" });
  });

  it("does nothing when user has no connections", () => {
    expect(() => sendToUser(999, { type: "x" })).not.toThrow();
  });

  it("skips broken connections without throwing", () => {
    const broken = { send: () => { throw new Error("closed"); } } as any;
    const good = makePeer(2, "bob");
    userPeers.set(2, new Set([broken, good]));
    sendToUser(2, { type: "ping" });
    expect(good._sent).toHaveLength(1);
  });
});

describe("broadcastToClass", () => {
  it("sends message to all peers in a class room", () => {
    const p1 = makePeer();
    const p2 = makePeer();
    classRooms.set(10, new Set([p1, p2]));
    broadcastToClass(10, "hello");
    expect(p1._sent).toEqual(["hello"]);
    expect(p2._sent).toEqual(["hello"]);
  });

  it("does nothing for non-existent room", () => {
    expect(() => broadcastToClass(404, "x")).not.toThrow();
  });
});

describe("broadcastToRace", () => {
  it("sends message to all peers in a race room", () => {
    const p1 = makePeer();
    const p2 = makePeer();
    raceRooms.set("1_2", new Set([p1, p2]));
    broadcastToRace("1_2", "go");
    expect(p1._sent).toEqual(["go"]);
    expect(p2._sent).toEqual(["go"]);
  });
});

describe("broadcastToGroup", () => {
  it("sends message to all peers in a group room", () => {
    const p = makePeer();
    groupRooms.set("3_red", new Set([p]));
    broadcastToGroup("3_red", "msg");
    expect(p._sent).toEqual(["msg"]);
  });
});

describe("getRaceOnlineUsers", () => {
  it("returns empty array for non-existent race room", () => {
    expect(getRaceOnlineUsers("nope")).toEqual([]);
  });

  it("returns userId and from for each peer with _userId", () => {
    const p1 = makePeer(1, "alice");
    const p2 = makePeer(2, "bob");
    const p3 = makePeer(); // no userId → excluded
    raceRooms.set("r", new Set([p1, p2, p3]));
    const users = getRaceOnlineUsers("r");
    expect(users).toHaveLength(2);
    expect(users.map((u) => u.userId).sort()).toEqual([1, 2]);
  });

  it("uses 'anonymous' when _userName missing", () => {
    const p = makePeer(5); // userId but no name
    raceRooms.set("r2", new Set([p]));
    const users = getRaceOnlineUsers("r2");
    expect(users[0].from).toBe("anonymous");
  });
});

describe("computeRaceScores", () => {
  function makeRace(answers: Map<number, Map<number, RaceAnswer>>): RaceState {
    return {
      raceCid: 1,
      courseId: 1,
      currentQuestion: 1,
      totalQuestions: 3,
      activeQuestionCid: null,
      timeLimit: 30,
      questionStartedAt: 0,
      startedAt: 0,
      answers,
    };
  }

  it("returns empty summary for race with no answers", () => {
    const race = makeRace(new Map());
    expect(computeRaceScores(race)).toEqual([]);
  });

  it("aggregates score and correctCount per user across questions", () => {
    const q1 = new Map<number, RaceAnswer>([
      [1, { answer: "A", from: "alice", userId: 1, rate: 10, correct: true, submittedAt: 0 }],
      [2, { answer: "B", from: "bob", userId: 2, rate: 5, correct: false, submittedAt: 0 }],
    ]);
    const q2 = new Map<number, RaceAnswer>([
      [1, { answer: "C", from: "alice", userId: 1, rate: 8, correct: true, submittedAt: 0 }],
      [2, { answer: "D", from: "bob", userId: 2, rate: 7, correct: true, submittedAt: 0 }],
    ]);
    const race = makeRace(new Map([[1, q1], [2, q2]]));
    const summary = computeRaceScores(race);
    expect(summary).toHaveLength(2);
    // alice: 10+8=18, 2 correct
    // bob: 5+7=12, 1 correct
    const alice = summary.find((s) => s.userId === 1)!;
    const bob = summary.find((s) => s.userId === 2)!;
    expect(alice.score).toBe(18);
    expect(alice.correctCount).toBe(2);
    expect(bob.score).toBe(12);
    expect(bob.correctCount).toBe(1);
  });

  it("sorts summary by score descending", () => {
    const q = new Map<number, RaceAnswer>([
      [1, { answer: "A", from: "alice", userId: 1, rate: 3, correct: true, submittedAt: 0 }],
      [2, { answer: "B", from: "bob", userId: 2, rate: 20, correct: true, submittedAt: 0 }],
      [3, { answer: "C", from: "carol", userId: 3, rate: 10, correct: true, submittedAt: 0 }],
    ]);
    const race = makeRace(new Map([[1, q]]));
    const summary = computeRaceScores(race);
    expect(summary.map((s) => s.userId)).toEqual([2, 3, 1]);
  });

  it("rounds score to 2 decimal places", () => {
    // 同一用户（Map key=1）在两道题中分别得分 10.555 + 20.555 = 31.11
    // computeRaceScores 用 Map key 作为 userId 累加 score
    const q1 = new Map<number, RaceAnswer>([
      [1, { answer: "A", from: "a", userId: 1, rate: 10.555, correct: true, submittedAt: 0 }],
    ]);
    const q2 = new Map<number, RaceAnswer>([
      [1, { answer: "B", from: "a", userId: 1, rate: 20.555, correct: true, submittedAt: 0 }],
    ]);
    const race = makeRace(new Map([[1, q1], [2, q2]]));
    const summary = computeRaceScores(race);
    // Math.round(31.11 * 100) / 100 = 31.11
    expect(summary[0].score).toBeCloseTo(31.11, 2);
  });

  it("does not count incorrect answers towards correctCount", () => {
    const q = new Map<number, RaceAnswer>([
      [1, { answer: "A", from: "a", userId: 1, rate: 5, correct: false, submittedAt: 0 }],
    ]);
    const race = makeRace(new Map([[1, q]]));
    const summary = computeRaceScores(race);
    expect(summary[0].score).toBe(5); // score still accumulates
    expect(summary[0].correctCount).toBe(0);
  });
});
