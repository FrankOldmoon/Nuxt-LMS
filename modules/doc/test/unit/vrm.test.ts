import { describe, it, expect, beforeEach } from "vitest";

/**
 * vrm.ts 是纯内存状态机（模块级单例），无需 mock 任何依赖。
 * 注意：模块级状态在测试间保持，需 beforeEach 重置。
 */
import {
  feedVrmText,
  consumeVrmChars,
  clearVrmSpeech,
  feedVrmAudio,
  consumeVrmAudioChars,
  clearVrmAudio,
  subscribeVrmSpeech,
  getVrmSpeechState,
} from "../../utils/vrm";

beforeEach(() => {
  // 重置文本流通道
  clearVrmSpeech();
  // 重置音频通道
  clearVrmAudio();
});

describe("feedVrmText / consumeVrmChars / clearVrmSpeech", () => {
  it("feedVrmText sets isSpeaking=true and appends to pendingText", () => {
    feedVrmText("Hello");
    const state = getVrmSpeechState();
    expect(state.isSpeaking).toBe(true);
    expect(state.pendingText).toBe("Hello");
  });

  it("feedVrmText appends to existing pendingText when already speaking", () => {
    feedVrmText("Hello");
    feedVrmText(" World");
    const state = getVrmSpeechState();
    expect(state.pendingText).toBe("Hello World");
    expect(state.isSpeaking).toBe(true);
  });

  it("feedVrmText replaces pendingText when not speaking (re-starts)", () => {
    feedVrmText("First");
    clearVrmSpeech(); // stops speaking
    feedVrmText("Second");
    expect(getVrmSpeechState().pendingText).toBe("Second");
  });

  it("feedVrmText ignores empty string", () => {
    feedVrmText("");
    expect(getVrmSpeechState().isSpeaking).toBe(false);
    expect(getVrmSpeechState().pendingText).toBe("");
  });

  it("consumeVrmChars returns consumed characters and reduces pendingText", () => {
    feedVrmText("Hello World");
    const consumed = consumeVrmChars(5);
    expect(consumed).toBe("Hello");
    expect(getVrmSpeechState().pendingText).toBe(" World");
    expect(getVrmSpeechState().isSpeaking).toBe(true);
  });

  it("consumeVrmChars sets isSpeaking=false when pendingText is exhausted", () => {
    feedVrmText("Hi");
    const consumed = consumeVrmChars(10);
    expect(consumed).toBe("Hi");
    expect(getVrmSpeechState().pendingText).toBe("");
    expect(getVrmSpeechState().isSpeaking).toBe(false);
  });

  it("consumeVrmChars returns empty string when nothing pending", () => {
    expect(consumeVrmChars(5)).toBe("");
  });

  it("consumeVrmChars returns empty string for n <= 0", () => {
    feedVrmText("Test");
    expect(consumeVrmChars(0)).toBe("");
    expect(consumeVrmChars(-1)).toBe("");
  });

  it("clearVrmSpeech resets isSpeaking and pendingText", () => {
    feedVrmText("Some text");
    clearVrmSpeech();
    const state = getVrmSpeechState();
    expect(state.isSpeaking).toBe(false);
    expect(state.pendingText).toBe("");
  });

  it("clearVrmSpeech is no-op when already clear", () => {
    clearVrmSpeech(); // should not throw
    expect(getVrmSpeechState().isSpeaking).toBe(false);
  });
});

describe("feedVrmAudio / consumeVrmAudioChars / clearVrmAudio", () => {
  it("feedVrmAudio sets audioSpeaking=true and audioText", () => {
    feedVrmAudio("This is speech audio text");
    const state = getVrmSpeechState();
    expect(state.audioSpeaking).toBe(true);
    expect(state.audioText).toBe("This is speech audio text");
  });

  it("feedVrmAudio replaces previous audioText (resets on new utterance)", () => {
    feedVrmAudio("First utterance");
    feedVrmAudio("Second utterance");
    expect(getVrmSpeechState().audioText).toBe("Second utterance");
  });

  it("feedVrmAudio ignores empty string", () => {
    feedVrmAudio("");
    expect(getVrmSpeechState().audioSpeaking).toBe(false);
    expect(getVrmSpeechState().audioText).toBe("");
  });

  it("consumeVrmAudioChars returns consumed characters and reduces audioText", () => {
    feedVrmAudio("Audio text here");
    const consumed = consumeVrmAudioChars(5);
    expect(consumed).toBe("Audio");
    expect(getVrmSpeechState().audioText).toBe(" text here");
  });

  it("consumeVrmAudioChars consumes entire text when n > length", () => {
    feedVrmAudio("Hi");
    const consumed = consumeVrmAudioChars(100);
    expect(consumed).toBe("Hi");
    expect(getVrmSpeechState().audioText).toBe("");
  });

  it("consumeVrmAudioChars returns empty when no audioText", () => {
    expect(consumeVrmAudioChars(5)).toBe("");
  });

  it("consumeVrmAudioChars returns empty for n <= 0", () => {
    feedVrmAudio("Test");
    expect(consumeVrmAudioChars(0)).toBe("");
    expect(consumeVrmAudioChars(-3)).toBe("");
  });

  it("clearVrmAudio resets audioSpeaking and audioText", () => {
    feedVrmAudio("Playing");
    clearVrmAudio();
    const state = getVrmSpeechState();
    expect(state.audioSpeaking).toBe(false);
    expect(state.audioText).toBe("");
  });

  it("clearVrmAudio is no-op when already clear", () => {
    clearVrmAudio(); // should not throw
    expect(getVrmSpeechState().audioSpeaking).toBe(false);
  });
});

describe("text and audio channels are independent", () => {
  it("clearVrmSpeech does not affect audio channel", () => {
    feedVrmAudio("Audio");
    feedVrmText("Text");
    clearVrmSpeech();
    const state = getVrmSpeechState();
    expect(state.isSpeaking).toBe(false);
    expect(state.pendingText).toBe("");
    expect(state.audioSpeaking).toBe(true);
    expect(state.audioText).toBe("Audio");
  });

  it("clearVrmAudio does not affect text channel", () => {
    feedVrmText("Text");
    feedVrmAudio("Audio");
    clearVrmAudio();
    const state = getVrmSpeechState();
    expect(state.isSpeaking).toBe(true);
    expect(state.pendingText).toBe("Text");
    expect(state.audioSpeaking).toBe(false);
    expect(state.audioText).toBe("");
  });

  it("both channels can be active simultaneously", () => {
    feedVrmText("Streaming text");
    feedVrmAudio("TTS audio");
    const state = getVrmSpeechState();
    expect(state.isSpeaking).toBe(true);
    expect(state.pendingText).toBe("Streaming text");
    expect(state.audioSpeaking).toBe(true);
    expect(state.audioText).toBe("TTS audio");
  });
});

describe("subscribeVrmSpeech", () => {
  it("calls listener immediately with current state", () => {
    const states: any[] = [];
    const unsub = subscribeVrmSpeech((s) => states.push({ ...s }));
    expect(states).toHaveLength(1);
    expect(states[0].isSpeaking).toBe(false);
    expect(states[0].audioSpeaking).toBe(false);
    unsub();
  });

  it("notifies listeners on state change", () => {
    const states: any[] = [];
    const unsub = subscribeVrmSpeech((s) => states.push({ ...s }));
    // Initial call already pushed, reset
    states.length = 0;

    feedVrmText("Hello");
    expect(states).toHaveLength(1);
    expect(states[0].isSpeaking).toBe(true);
    expect(states[0].pendingText).toBe("Hello");

    unsub();
  });

  it("stops notifying after unsubscribe", () => {
    const states: any[] = [];
    const unsub = subscribeVrmSpeech((s) => states.push({ ...s }));
    states.length = 0;

    unsub();
    feedVrmText("Should not appear");
    expect(states).toHaveLength(0);
  });

  it("supports multiple listeners", () => {
    const s1: any[] = [];
    const s2: any[] = [];
    const unsub1 = subscribeVrmSpeech((s) => s1.push(s));
    const unsub2 = subscribeVrmSpeech((s) => s2.push(s));
    // Clear initial calls
    s1.length = 0;
    s2.length = 0;

    feedVrmText("Test");
    expect(s1).toHaveLength(1);
    expect(s2).toHaveLength(1);

    unsub1();
    feedVrmText("More");
    expect(s1).toHaveLength(1); // no new notification
    expect(s2).toHaveLength(2); // still receiving

    unsub2();
  });
});
