import assert from "node:assert/strict";
import test from "node:test";
import { isLevelId, levelSettings } from "../dist/home/level.js";

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
