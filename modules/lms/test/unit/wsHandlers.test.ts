import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * lms/server/utils/ws/ 三个消息处理器测试
 *
 * 这些处理器直接使用 Nitro 自动导入的全局变量：
 * - classRooms, votes, quickAnswers, raceRooms, raceStates, groupRooms（Map）
 * - broadcastToClass, broadcastToRace, broadcastToGroup（函数）
 * - computeRaceScores, getRaceOnlineUsers（函数）
 *
 * 在测试中需要通过 vi.stubGlobal 在模块加载前注入这些全局变量。
 */

// mock @nuxthub/db
vi.mock("@nuxthub/db", () => ({
  db: {},
  schema: {},
}));

// 在模块加载前，先注入所有全局变量
const classRooms = new Map<number, Set<any>>();
const raceRooms = new Map<string, Set<any>>();
const groupRooms = new Map<string, Set<any>>();
const votes = new Map<string, any>();
const quickAnswers = new Map<number, any>();
const raceStates = new Map<string, any>();
const userPeers = new Map<number, Set<any>>();

vi.stubGlobal("classRooms", classRooms);
vi.stubGlobal("raceRooms", raceRooms);
vi.stubGlobal("groupRooms", groupRooms);
vi.stubGlobal("votes", votes);
vi.stubGlobal("quickAnswers", quickAnswers);
vi.stubGlobal("raceStates", raceStates);
vi.stubGlobal("userPeers", userPeers);

// broadcast 函数：直接发送到对应 Map 中的所有 peer
vi.stubGlobal("broadcastToClass", (classId: number, msg: string) => {
  const room = classRooms.get(classId);
  if (!room) return;
  for (const peer of room) {
    try { peer.send(msg); } catch { /* skip broken */ }
  }
});

vi.stubGlobal("broadcastToRace", (pin: string, msg: string) => {
  const room = raceRooms.get(pin);
  if (!room) return;
  for (const peer of room) {
    try { peer.send(msg); } catch { /* skip broken */ }
  }
});

vi.stubGlobal("broadcastToGroup", (groupId: string, msg: string) => {
  const room = groupRooms.get(groupId);
  if (!room) return;
  for (const peer of room) {
    try { peer.send(msg); } catch { /* skip broken */ }
  }
});

vi.stubGlobal("computeRaceScores", () => []);
vi.stubGlobal("getRaceOnlineUsers", () => []);

// 现在再 import 消息处理器
import { handleClassMessage, cleanupClassPeer } from "../../server/utils/ws/class";
import { handleRaceMessage, cleanupRacePeer } from "../../server/utils/ws/race";
import { handleGroupMessage, cleanupGroupPeer } from "../../server/utils/ws/group";

/** 造一个假 peer */
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
  classRooms.clear();
  raceRooms.clear();
  groupRooms.clear();
  votes.clear();
  quickAnswers.clear();
  raceStates.clear();
  userPeers.clear();
});

// ====================== class.ts ======================

describe("handleClassMessage", () => {
  describe("join", () => {
    it("adds peer to class room and sends joined confirmation", () => {
      const peer = makePeer();
      const result = handleClassMessage(peer, { type: "join", classId: 10, userId: 1, from: "alice" });
      expect(result).toBe(true);
      expect(peer._classId).toBe(10);
      expect(peer._userId).toBe(1);
      expect(peer._userName).toBe("alice");
      const joined = peer._sent.find((m: string) => JSON.parse(m).type === "joined");
      expect(joined).toBeTruthy();
      expect(JSON.parse(joined).classId).toBe(10);
    });

    it("returns true for join without classId (no-op join)", () => {
      const peer = makePeer();
      const result = handleClassMessage(peer, { type: "join" });
      expect(result).toBe(true);
    });

    it("broadcasts onlineUpdate when userId provided", () => {
      const peer = makePeer();
      const existing = makePeer(2, "bob");
      classRooms.set(10, new Set([existing]));
      handleClassMessage(peer, { type: "join", classId: 10, userId: 1, from: "alice" });
      const onlineMsg = existing._sent.find((m: string) => {
        const parsed = JSON.parse(m);
        return parsed.type === "onlineUpdate" && parsed.userId === 1;
      });
      expect(onlineMsg).toBeTruthy();
    });
  });

  describe("invite", () => {
    it("broadcasts invite message to class", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, {
        type: "invite", classId: 10, courseId: 1, chapterId: 2, from: "teacher",
      });
      const inviteMsg = listener._sent.find((m: string) => JSON.parse(m).type === "invite");
      expect(inviteMsg).toBeTruthy();
    });
  });

  describe("danmaku", () => {
    it("broadcasts danmaku with truncated text", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "danmaku", classId: 10, text: "Hello!", from: "alice" });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "danmaku");
      expect(msg).toBeTruthy();
      expect(JSON.parse(msg).text).toBe("Hello!");
    });

    it("truncates danmaku text to 200 chars", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      const longText = "A".repeat(300);
      handleClassMessage(peer, { type: "danmaku", classId: 10, text: longText });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "danmaku");
      expect(JSON.parse(msg).text.length).toBe(200);
    });
  });

  describe("voteStart / voteSubmit / voteEnd", () => {
    it("starts a vote and broadcasts to class", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, {
        type: "voteStart", classId: 10, voteId: "v1", question: "Yes or No?", options: ["Yes", "No"],
      });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "voteStart");
      expect(msg).toBeTruthy();
      expect(votes.has("v1")).toBe(true);
    });

    it("submits vote and broadcasts update", () => {
      votes.set("v1", { classId: 10, question: "", options: ["A", "B"], results: [0, 0], votedUsers: new Set() });
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "voteSubmit", classId: 10, voteId: "v1", optionIndex: 0, from: "alice" });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "voteUpdate");
      expect(msg).toBeTruthy();
      expect(votes.get("v1").results[0]).toBe(1);
    });

    it("prevents double voting", () => {
      votes.set("v1", { classId: 10, question: "", options: ["A"], results: [0], votedUsers: new Set(["alice"]) });
      const peer = makePeer();
      handleClassMessage(peer, { type: "voteSubmit", classId: 10, voteId: "v1", optionIndex: 0, from: "alice" });
      expect(votes.get("v1").results[0]).toBe(0);
    });

    it("ends vote and cleans up", () => {
      votes.set("v1", { classId: 10, question: "", options: ["A"], results: [5], votedUsers: new Set(["a"]) });
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "voteEnd", classId: 10, voteId: "v1" });
      expect(votes.has("v1")).toBe(false);
    });
  });

  describe("quickAnswerStart / quickAnswerSubmit / quickAnswerEnd", () => {
    it("starts quick answer", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "quickAnswerStart", classId: 10, question: "What is 2+2?" });
      expect(quickAnswers.has(10)).toBe(true);
    });

    it("first submit wins", () => {
      quickAnswers.set(10, { question: "", winner: null, submitted: new Set() });
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "quickAnswerSubmit", classId: 10, from: "alice" });
      expect(quickAnswers.get(10).winner).toBe("alice");
    });

    it("second submit is ignored (winner already set)", () => {
      quickAnswers.set(10, { question: "", winner: "alice", submitted: new Set(["alice"]) });
      const peer = makePeer();
      handleClassMessage(peer, { type: "quickAnswerSubmit", classId: 10, from: "bob" });
      expect(quickAnswers.get(10).winner).toBe("alice");
    });

    it("ends quick answer and cleans up", () => {
      quickAnswers.set(10, { question: "", winner: null, submitted: new Set() });
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "quickAnswerEnd", classId: 10 });
      expect(quickAnswers.has(10)).toBe(false);
    });
  });

  describe("chatroom", () => {
    it("broadcasts chatroom message", () => {
      const peer = makePeer(1, "alice");
      const listener = makePeer(2, "bob");
      classRooms.set(10, new Set([listener]));
      handleClassMessage(peer, { type: "chatroom", classId: 10, userId: 1, from: "alice", text: "Hi!" });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "chatroom");
      expect(msg).toBeTruthy();
      expect(JSON.parse(msg).text).toBe("Hi!");
    });

    it("ignores empty chat message", () => {
      const peer = makePeer();
      const result = handleClassMessage(peer, { type: "chatroom", classId: 10, text: "" });
      expect(result).toBe(true);
    });

    it("truncates chat text to 1000 chars", () => {
      const peer = makePeer();
      const listener = makePeer();
      classRooms.set(10, new Set([listener]));
      const longText = "A".repeat(1500);
      handleClassMessage(peer, { type: "chatroom", classId: 10, text: longText });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "chatroom");
      expect(JSON.parse(msg).text.length).toBe(1000);
    });
  });

  it("returns false for unknown message type", () => {
    const peer = makePeer();
    expect(handleClassMessage(peer, { type: "unknown", classId: 10 })).toBe(false);
  });

  it("returns false when no classId (and not join)", () => {
    const peer = makePeer();
    expect(handleClassMessage(peer, { type: "danmaku" })).toBe(false);
  });
});

describe("cleanupClassPeer", () => {
  it("removes peer from class room and broadcasts offline", () => {
    const peer = makePeer(1, "alice");
    const listener = makePeer(2, "bob");
    peer._classId = 10;
    classRooms.set(10, new Set([peer, listener]));
    cleanupClassPeer(peer);
    expect(classRooms.get(10)?.has(peer)).toBe(false);
    const offlineMsg = listener._sent.find((m: string) => {
      const parsed = JSON.parse(m);
      return parsed.type === "onlineUpdate" && parsed.online === false;
    });
    expect(offlineMsg).toBeTruthy();
  });

  it("deletes room when last peer leaves", () => {
    const peer = makePeer();
    peer._classId = 10;
    classRooms.set(10, new Set([peer]));
    cleanupClassPeer(peer);
    expect(classRooms.has(10)).toBe(false);
  });

  it("does nothing when peer has no _classId", () => {
    const peer = makePeer();
    cleanupClassPeer(peer);
  });
});

// ====================== group.ts ======================

describe("handleGroupMessage", () => {
  describe("joinGroup", () => {
    it("adds peer to group room and sends joinedGroup confirmation", () => {
      const peer = makePeer();
      const result = handleGroupMessage(peer, { type: "joinGroup", groupId: "3_red", userId: 1, from: "alice" });
      expect(result).toBe(true);
      expect(peer._groupIds.has("3_red")).toBe(true);
      const joined = peer._sent.find((m: string) => JSON.parse(m).type === "joinedGroup");
      expect(joined).toBeTruthy();
    });

    it("ignores joinGroup with empty groupId", () => {
      const peer = makePeer();
      const result = handleGroupMessage(peer, { type: "joinGroup", groupId: "" });
      expect(result).toBe(true);
      expect(peer._groupIds).toBeUndefined();
    });

    it("allows joining multiple groups", () => {
      const peer = makePeer();
      handleGroupMessage(peer, { type: "joinGroup", groupId: "g1" });
      handleGroupMessage(peer, { type: "joinGroup", groupId: "g2" });
      expect(peer._groupIds.has("g1")).toBe(true);
      expect(peer._groupIds.has("g2")).toBe(true);
    });
  });

  describe("groupChat", () => {
    it("broadcasts chat message to group", () => {
      const peer = makePeer(1, "alice");
      const listener = makePeer(2, "bob");
      groupRooms.set("g1", new Set([listener]));
      handleGroupMessage(peer, { type: "groupChat", groupId: "g1", userId: 1, from: "alice", text: "Hello group!" });
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "groupChat");
      expect(msg).toBeTruthy();
      expect(JSON.parse(msg).text).toBe("Hello group!");
    });

    it("ignores empty text", () => {
      const peer = makePeer();
      groupRooms.set("g1", new Set());
      const result = handleGroupMessage(peer, { type: "groupChat", groupId: "g1", text: "" });
      expect(result).toBe(true);
    });

    it("ignores non-existent group", () => {
      const peer = makePeer();
      const result = handleGroupMessage(peer, { type: "groupChat", groupId: "nonexistent", text: "Hi" });
      expect(result).toBe(true);
    });
  });

  describe("leaveGroup", () => {
    it("removes peer from group room", () => {
      const peer = makePeer();
      const other = makePeer();
      peer._groupIds = new Set(["g1"]);
      groupRooms.set("g1", new Set([peer, other]));
      handleGroupMessage(peer, { type: "leaveGroup", groupId: "g1" });
      expect(groupRooms.get("g1")?.has(peer)).toBe(false);
      expect(peer._groupIds.has("g1")).toBe(false);
    });

    it("deletes room when last peer leaves", () => {
      const peer = makePeer();
      peer._groupIds = new Set(["g1"]);
      groupRooms.set("g1", new Set([peer]));
      handleGroupMessage(peer, { type: "leaveGroup", groupId: "g1" });
      expect(groupRooms.has("g1")).toBe(false);
    });
  });

  it("returns false for unknown message type", () => {
    const peer = makePeer();
    expect(handleGroupMessage(peer, { type: "unknown" })).toBe(false);
  });
});

describe("cleanupGroupPeer", () => {
  it("removes peer from all group rooms", () => {
    const peer = makePeer();
    const other = makePeer();
    peer._groupIds = new Set(["g1", "g2"]);
    groupRooms.set("g1", new Set([peer, other]));
    groupRooms.set("g2", new Set([peer, other]));
    cleanupGroupPeer(peer);
    expect(groupRooms.get("g1")?.has(peer)).toBe(false);
    expect(groupRooms.get("g2")?.has(peer)).toBe(false);
  });

  it("does nothing when peer has no _groupIds", () => {
    const peer = makePeer();
    cleanupGroupPeer(peer);
  });
});

// ====================== race.ts ======================

describe("handleRaceMessage", () => {
  describe("raceJoin", () => {
    it("adds peer to race room and sends raceJoined confirmation", () => {
      const peer = makePeer(1, "alice");
      const result = handleRaceMessage(peer, { type: "raceJoin", pin: "1234", userId: 1, from: "alice" });
      expect(result).toBe(true);
      expect(peer._racePin).toBe("1234");
      const joined = peer._sent.find((m: string) => JSON.parse(m).type === "raceJoined");
      expect(joined).toBeTruthy();
    });

    it("ignores raceJoin with empty pin", () => {
      const peer = makePeer();
      const result = handleRaceMessage(peer, { type: "raceJoin", pin: "" });
      expect(result).toBe(true);
    });
  });

  describe("raceStart", () => {
    it("creates race state and broadcasts raceStart", () => {
      const peer = makePeer();
      const listener = makePeer();
      raceRooms.set("1234", new Set([listener]));
      handleRaceMessage(peer, {
        type: "raceStart", pin: "1234", raceCid: 100, courseId: 1,
        totalQuestions: 5, timeLimit: 30, from: "teacher",
      });
      expect(raceStates.has("1234")).toBe(true);
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "raceStart");
      expect(msg).toBeTruthy();
    });
  });

  describe("raceQuestion", () => {
    it("sets active question and broadcasts", () => {
      raceStates.set("1234", {
        raceCid: 100, courseId: 1, currentQuestion: -1, totalQuestions: 5,
        activeQuestionCid: null, timeLimit: 30, questionStartedAt: 0,
        startedAt: Date.now(), answers: new Map(),
      });
      const peer = makePeer();
      const listener = makePeer();
      raceRooms.set("1234", new Set([listener]));
      handleRaceMessage(peer, {
        type: "raceQuestion", pin: "1234", questionCid: 201, questionIndex: 0,
      });
      expect(raceStates.get("1234").activeQuestionCid).toBe(201);
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "raceQuestion");
      expect(msg).toBeTruthy();
    });

    it("ignores when no race state exists", () => {
      const peer = makePeer();
      const result = handleRaceMessage(peer, { type: "raceQuestion", pin: "nonexistent", questionCid: 1 });
      expect(result).toBe(true);
    });
  });

  describe("raceAnswer", () => {
    it("records answer and broadcasts update", () => {
      raceStates.set("1234", {
        raceCid: 100, courseId: 1, currentQuestion: 0, totalQuestions: 5,
        activeQuestionCid: 201, timeLimit: 30, questionStartedAt: Date.now(),
        startedAt: Date.now(), answers: new Map([[201, new Map()]]),
      });
      const peer = makePeer(1, "alice");
      const listener = makePeer();
      raceRooms.set("1234", new Set([listener]));
      handleRaceMessage(peer, {
        type: "raceAnswer", pin: "1234", userId: 1, from: "alice",
        answer: "A", rate: 10, correct: true,
      });
      const qAnswers = raceStates.get("1234").answers.get(201);
      expect(qAnswers.has(1)).toBe(true);
    });

    it("ignores duplicate answer from same user", () => {
      raceStates.set("1234", {
        raceCid: 100, courseId: 1, currentQuestion: 0, totalQuestions: 5,
        activeQuestionCid: 201, timeLimit: 30, questionStartedAt: Date.now(),
        startedAt: Date.now(), answers: new Map([[201, new Map([[1, { answer: "A" }]])]]),
      });
      const peer = makePeer(1, "alice");
      const result = handleRaceMessage(peer, {
        type: "raceAnswer", pin: "1234", userId: 1, answer: "B",
      });
      expect(result).toBe(true);
    });
  });

  describe("raceEnd", () => {
    it("broadcasts end and cleans up race state", () => {
      raceStates.set("1234", {
        raceCid: 100, courseId: 1, currentQuestion: 0, totalQuestions: 5,
        activeQuestionCid: null, timeLimit: 30, questionStartedAt: 0,
        startedAt: Date.now(), answers: new Map(),
      });
      const peer = makePeer();
      const listener = makePeer();
      raceRooms.set("1234", new Set([listener]));
      handleRaceMessage(peer, { type: "raceEnd", pin: "1234" });
      expect(raceStates.has("1234")).toBe(false);
      const msg = listener._sent.find((m: string) => JSON.parse(m).type === "raceEnd");
      expect(msg).toBeTruthy();
    });
  });

  it("returns false for unknown message type", () => {
    const peer = makePeer();
    expect(handleRaceMessage(peer, { type: "unknown" })).toBe(false);
  });
});

describe("cleanupRacePeer", () => {
  it("removes peer from race room", () => {
    const peer = makePeer(1, "alice");
    const listener = makePeer(2, "bob");
    peer._racePin = "1234";
    raceRooms.set("1234", new Set([peer, listener]));
    cleanupRacePeer(peer);
    expect(raceRooms.get("1234")?.has(peer)).toBe(false);
  });

  it("deletes room when last peer leaves", () => {
    const peer = makePeer();
    peer._racePin = "1234";
    raceRooms.set("1234", new Set([peer]));
    cleanupRacePeer(peer);
    expect(raceRooms.has("1234")).toBe(false);
  });

  it("does nothing when peer has no _racePin", () => {
    const peer = makePeer();
    cleanupRacePeer(peer);
  });
});
