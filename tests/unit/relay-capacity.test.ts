import { describe, expect, it } from "vitest";

/**
 * 候补递补算法的纯逻辑复刻（与 capacity.promoteWaitlist 一致）。
 */
function promote(
  capacity: number | null,
  joined: number,
  waiting: { id: string; participantCount: number }[],
) {
  if (capacity === null) return waiting.map((w) => w.id);
  let remaining = Math.max(0, capacity - joined);
  const promoted: string[] = [];
  for (const entry of waiting) {
    if (entry.participantCount <= remaining) {
      promoted.push(entry.id);
      remaining -= entry.participantCount;
    }
  }
  return promoted;
}

describe("relay waitlist promotion", () => {
  it("按顺序完整晋升，不拆分多人报名", () => {
    const promoted = promote(5, 3, [
      { id: "a", participantCount: 2 },
      { id: "b", participantCount: 1 },
    ]);
    expect(promoted).toEqual(["a"]);
  });

  it("无容量时全部晋升", () => {
    expect(
      promote(null, 0, [
        { id: "a", participantCount: 2 },
        { id: "b", participantCount: 3 },
      ]),
    ).toEqual(["a", "b"]);
  });
});
