// @ts-check

import { Game, Card, Tile, Board } from "./game.js";
import { test, expect, mock } from "bun:test";
import { required } from "./utils.js";
import { Gryphon, Hunter, YoungGryphon } from "./cards.js";
import { Action, PlayCard } from "./actions.js";

mock.module("./engine.js", () => {
  return {}
});

/**
 * @type {Game}
 */
let game = new Game();

/**
 * @param {Action} action
 */
function act(action) {
  game.board.addActionsBottom(action);
  game.board.update(10000);
}

/**
 * @param {Card} card
 * @param {Tile} tile
 */
function play(card, tile) {
  act(new PlayCard(card, tile));
}

/**
 * @param {Card} card
 * @param {Tile} tile
 */
function spawn(card, tile) {
  tile.add(card);
}

/**
 * @template {string} S
 * @typedef {S extends `${infer C}${infer Rest}` ? C | Chars<Rest> : S} Chars
 */

/**
 * @template {string} S
 * @typedef {Exclude<Chars<S>, "" | "\n" | "." | " ">} TemplateChars
 */

/**
 * @template {string} Template
 * @param {Template} template
 * @returns {Record<TemplateChars<Template>, Tile>}
 */
function setup(template) {
  game = new Game();

  /**
   * @type {Record<string, Tile>}
   */
  let map = {};

  let lines = template.trim().split("\n");
  let width = lines[0].trim().length;
  let height = lines.length;
  game.board = new Board(game, width, height);

  for (let y = 0; y < height; y++) {
    let line = lines[y].trim();
    for (let x = 0; x < width; x++) {
      let char = line[x];
      map[char] = required(game.board.getTileAt(x, y));
    }
  }

  return map;
}

test("playing a hunter damages adjacent gryphons", () => {
  let map = setup(`
    ...
    gh.
    ...
  `);

  let gryphon = new Card(Gryphon);
  spawn(gryphon, map.g);

  let hunter = new Card(Hunter);
  play(hunter, map.h);

  expect(gryphon.counter).toBe(1);
});

test("playing a hunter does not damage adjacent hunters", () => {
  let map = setup(`
    ...
    fh.
    ...
  `);

  let friend = new Card(Hunter);
  spawn(friend, map.f);

  let hunter = new Card(Hunter);
  play(hunter, map.h);

  expect(friend.counter).toBe(Hunter.counter);
});

test("gryphons move to grave pile when counter hits zero", () => {
  let map = setup(`
    ...
    gh.
    ...
  `);

  let gryphon = new Card(Gryphon);
  gryphon.counter = 1;
  spawn(gryphon, map.g);

  let hunter = new Card(Hunter);
  play(hunter, map.h);

  expect(gryphon.counter).toBe(0);
  expect(gryphon.isInPlay()).toBe(false);
  expect(game.board.gravePile.includes(gryphon)).toBe(true);
});
