import assert from "node:assert/strict";
import test from "node:test";
import { decrementItemCount, hudIconPositions, isLevelId, levelSettings, takeRemainingKind } from "../dist/home/level.js";

test("accepts safe level IDs and rejects path segments", () => {
  assert.equal(isLevelId("level-01"), true);
  assert.equal(isLevelId("level-02-bonus"), true);
  assert.equal(isLevelId("../level-01"), false);
  assert.equal(isLevelId("level-01/extra"), false);
});

test("uses level settings when valid and defaults for missing or invalid values", () => {
  assert.deepEqual(levelSettings({}), { imageSmoothingEnabled: true, maxZoom: 10 });
  assert.deepEqual(levelSettings({ imageSmoothingEnabled: false, maxZoom: 5 }), { imageSmoothingEnabled: false, maxZoom: 5 });
  assert.deepEqual(levelSettings({ imageSmoothingEnabled: "false", maxZoom: 0 }), { imageSmoothingEnabled: true, maxZoom: 10 });
});

test("positions icon kinds and counts in HUD slots", () => {
  const hud = { tlc_x: [43, 128, 213, 301, 386], tlc_y: 21 };
  const slots = [0, 1, 2, 3];
  let positioned = hudIconPositions(hud, 60, slots, [2, 1, 1, 2, 1]);
  assert.deepEqual(positioned.map(({ x, spriteX, count }) => ({ x, spriteX, count })), [
    { x: 43, spriteX: 0, count: 2 },
    { x: 128, spriteX: 60, count: 1 },
    { x: 213, spriteX: 120, count: 1 },
    { x: 301, spriteX: 180, count: 2 },
  ]);
  slots[1] = 4;
  positioned = hudIconPositions(hud, 60, slots, [2, 0, 1, 2, 1]);
  assert.deepEqual({ spriteX: positioned[1].spriteX, count: positioned[1].count }, { spriteX: 240, count: 1 });
});

test("decrements counts and refills from unique kinds that still have items", () => {
  const counts = [2, 1, 0, 3, 2];
  assert.equal(decrementItemCount(counts, 0), 1);
  assert.equal(decrementItemCount(counts, 0), 0);
  assert.equal(decrementItemCount(counts, 0), 0);
  const pending = [0, 1, 2, 3, 4];
  const picked = [takeRemainingKind(pending, counts), takeRemainingKind(pending, counts), takeRemainingKind(pending, counts)];
  assert.deepEqual(picked.sort(), [1, 3, 4]);
  assert.equal(takeRemainingKind(pending, counts), null);
});
