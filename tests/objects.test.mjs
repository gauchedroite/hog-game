import assert from "node:assert/strict";
import test from "node:test";
import { extractMaskedRegion, fadeProgress, isZoneComplete, objectComponent, objectNameFromPixel } from "../dist/home/objects.js";

test("matches mask RGB values regardless of alpha", () => {
  const names = new Map([["#7460E0", "chat"]]);
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([116, 96, 224, 255]), names), "chat");
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([118, 94, 226, 0]), names), "chat");
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([119, 96, 224, 255]), names), undefined);
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([0, 0, 0, 0]), names), undefined);
});

test("fades revealed objects from transparent to visible", () => {
  assert.equal(fadeProgress(100, 100, 150), 0);
  assert.equal(fadeProgress(175, 100, 150), 0.5);
  assert.equal(fadeProgress(250, 100, 150), 1);
});

test("extracts source pixels matching the zone mask and preserves mask alpha", () => {
  const width = 3;
  const source = new Uint8ClampedArray(width * 2 * 4).fill(255);
  const mask = new Uint8ClampedArray(width * 2 * 4);
  mask.set([116, 96, 224, 255], (0 * width + 1) * 4);
  mask.set([118, 94, 226, 128], (1 * width + 2) * 4);
  const extracted = extractMaskedRegion(source, mask, width, 2, "#7460E0", { x1: 0, y1: 0, x2: 2, y2: 1 });
  assert.ok(extracted);
  assert.equal(extracted.pixels[(0 * width + 1) * 4 + 3], 255);
  assert.equal(extracted.pixels[(1 * width + 2) * 4 + 3], 128);
  assert.equal(extracted.pixels[(0 * width + 0) * 4 + 3], 0);
});

test("completes a zone only after every object in that zone is selected", () => {
  const items = [{ id: 1, zone: "fond" }, { id: 2, zone: "fond" }, { id: 3, zone: "gauche" }];
  assert.equal(isZoneComplete(items, new Set([1]), "fond"), false);
  assert.equal(isZoneComplete(items, new Set([1, 2]), "fond"), true);
  assert.equal(isZoneComplete(items, new Set([1, 2, 3]), "empty"), false);
});

test("extracts only the connected silhouette at the clicked pixel", () => {
  const width = 6;
  const pixels = new Uint8ClampedArray(width * 4 * 4);
  for (const [x, y] of [[1, 1], [5, 3]]) pixels.set([116, 96, 224, 255], (y * width + x) * 4);
  pixels.set([118, 94, 226, 64], (1 * width + 2) * 4);
  pixels.set([119, 96, 224, 255], (1 * width + 3) * 4);
  pixels.set([116, 96, 224, 255], (2 * width + 1) * 4);
  const component = objectComponent(pixels, width, 4, 1, 1);
  assert.deepEqual(component, { id: 7, pixels: [7, 8, 13], x1: 1, y1: 1, x2: 2, y2: 2 });
  assert.equal(objectComponent(pixels, width, 4, 0, 0), null);
});
