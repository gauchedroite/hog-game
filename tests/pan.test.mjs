import assert from "node:assert/strict";
import test from "node:test";
import { clampPan, clampZoom, imagePoint } from "../dist/home/pan.js";

test("pan stays within the image bounds", () => {
  assert.equal(clampPan(20, 400, 800), 0);
  assert.equal(clampPan(-900, 400, 800), -400);
  assert.equal(clampPan(-150, 400, 800), -150);
  assert.equal(clampPan(-20, 400, 300), 0);
});

test("zoom stays between the fitted view and 10x", () => {
  assert.equal(clampZoom(0.5), 1);
  assert.equal(clampZoom(2), 2);
  assert.equal(clampZoom(10), 10);
  assert.equal(clampZoom(11), 10);
  assert.equal(clampZoom(6, 5), 5);
});

test("maps screen positions to image pixels and ignores positions outside the image", () => {
  assert.deepEqual(imagePoint(20, 30, -10, -10, 2, 100, 100), { x: 15, y: 20 });
  assert.equal(imagePoint(0, 0, -10, -10, 2, 5, 5), null);
});
