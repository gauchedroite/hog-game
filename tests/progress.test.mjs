import assert from "node:assert/strict";
import test from "node:test";
import { congratDelay, parseGameState } from "../dist/home/progress.js";

test("loads valid saved selections and ignores invalid entries", () => {
  assert.deepEqual(parseGameState(JSON.stringify({
    levelId: "level-01",
    selections: [{ id: 3, x: 12, y: 8 }, { id: -1, x: 0, y: 0 }, null],
    completedAt: 1000,
    congratShown: true,
  })), {
    levelId: "level-01",
    selections: [{ id: 3, x: 12, y: 8 }],
    completedAt: 1000,
    congratShown: true,
  });
});

test("waits two seconds after completion, or shows immediately when the wait elapsed", () => {
  assert.equal(congratDelay(1000, 1000), 2000);
  assert.equal(congratDelay(1000, 2500), 500);
  assert.equal(congratDelay(1000, 3000), 0);
  assert.equal(congratDelay(3000, 1000), 2000);
});

test("rejects missing, malformed, or empty game state", () => {
  assert.equal(parseGameState(null), null);
  assert.equal(parseGameState("not json"), null);
  assert.equal(parseGameState(JSON.stringify({ levelId: "../level-01", selections: [{ id: 0, x: 0, y: 0 }] })), null);
  assert.equal(parseGameState(JSON.stringify({ levelId: "level-01", selections: [] })), null);
});
