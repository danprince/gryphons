import { Action, PlayCard } from "../actions.js";
import { Game, Tile, Board, Card } from "../game.js";
import { required } from "../utils.js";

/**
 * @template {string} S
 * @typedef {S extends `${infer C}${infer Rest}` ? C | CharsOf<Rest> : S} CharsOf
 */

/**
 * @template {string} S
 * @typedef {Exclude<CharsOf<S>, "" | "\n" | "." | " ">} TemplateChars
 */

/**
 * @template {string} Template
 * @param {Template} template
 */
export function setup(template) {
  let game = new Game();

  /**
   * @type {Record<string, Tile>}
   */
  let lookup = {};

  let lines = template.trim().split("\n");
  let width = required(lines[0]).trim().length;
  let height = lines.length;
  game.board = new Board(game, width, height);

  for (let y = 0; y < height; y++) {
    let line = required(lines[y]).trim();
    for (let x = 0; x < width; x++) {
      let char = required(line[x]);
      lookup[char] = required(game.board.getTileAt(x, y));
    }
  }

  /**
   * @type {Record<TemplateChars<Template>, Tile>}
   */
  let map = lookup;

  /**
   * @param {Action} action
   */
  function act(action) {
    game.board.addActionsBottom(action);
    game.board.update(10_000);
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

  function endTurn() {
    game.endTurn();
    game.board.update(10_000);
  }

  return { map, game, act, play, endTurn, spawn };
}
