import assert from "node:assert/strict";
import test from "node:test";
import { clampPan, clampZoom } from "../dist/home/pan.js";

test("pan stays within the image bounds", () => {
  assert.equal(clampPan(20, 400, 800), 0);
  assert.equal(clampPan(-900, 400, 800), -400);
  assert.equal(clampPan(-150, 400, 800), -150);
  assert.equal(clampPan(-20, 400, 300), 0);
});

test("zoom stays between the fitted view and 3x", () => {
  assert.equal(clampZoom(0.5), 1);
  assert.equal(clampZoom(2), 2);
  assert.equal(clampZoom(4), 3);
});
