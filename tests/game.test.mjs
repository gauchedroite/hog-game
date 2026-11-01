import assert from "node:assert/strict";
import test from "node:test";
import { hold, newGame, roll } from "../dist/game.js";

test("rolling one loses turn points and passes play", () => {
  const state = roll(roll(newGame(), 4), 1);
  assert.equal(state.turnScore, 0);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.die, 1);
});

test("holding banks points and declares a winner at 100", () => {
  let state = { ...newGame(), scores: [95, 0], currentPlayer: 0 };
  state = roll(state, 5);
  state = hold(state);
  assert.deepEqual(state.scores, [100, 0]);
  assert.equal(state.winner, 0);
});

test("rejects values that are not valid die rolls", () => {
  assert.throws(() => roll(newGame(), 7), RangeError);
});
