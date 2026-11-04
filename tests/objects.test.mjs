import assert from "node:assert/strict";
import test from "node:test";
import { objectComponent, objectNameFromPixel } from "../dist/home/objects.js";

test("matches mask RGB values regardless of alpha", () => {
  const names = new Map([["#7460E0", "chat"]]);
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([116, 96, 224, 255]), names), "chat");
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([118, 94, 226, 0]), names), "chat");
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([119, 96, 224, 255]), names), undefined);
  assert.equal(objectNameFromPixel(new Uint8ClampedArray([0, 0, 0, 0]), names), undefined);
});

test("extracts only the connected silhouette at the clicked pixel", () => {
  const width = 6;
  const pixels = new Uint8ClampedArray(width * 4 * 4);
  for (const [x, y] of [[1, 1], [5, 3]]) pixels.set([116, 96, 224, 255], (y * width + x) * 4);
  pixels.set([118, 94, 226, 64], (1 * width + 2) * 4);
  pixels.set([119, 96, 224, 255], (1 * width + 3) * 4);
  pixels.set([116, 96, 224, 255], (2 * width + 1) * 4);
  const component = objectComponent(pixels, width, 4, 1, 1);
  assert.deepEqual(component, { pixels: [7, 8, 13], x1: 1, y1: 1, x2: 2, y2: 2 });
  assert.equal(objectComponent(pixels, width, 4, 0, 0), null);
});
