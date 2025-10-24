import {
  Apostle,
  Bones,
  Cleric,
  Commander,
  Gladiator,
  GraveRobber,
  Gryphon,
  Hero,
  Hunter,
  Knight,
  Lich,
  MeanGryphon,
  Miner,
  Peasant,
  ProudGryphon,
  Pyromancer,
  RestlessGryphon,
  Rocks,
  Scout,
  SkeletalGryphon,
  StonyGryphon,
  Wizard,
  YoungGryphon,
} from "./cards.js";
import { Board, Card, CardType, Game } from "./game.js";
import { assert, randomItem, required, shuffle } from "./utils.js";

/**
 * @import { NonEmptyArray } from "./utils.js";
 */

export const STARTING_DECK = [
  Peasant,
  Peasant,
  Peasant,
  Peasant,
  Peasant,
  Hunter,
  Hunter,
  Cleric,
  Hero,
];

/**
 * @type {NonEmptyArray<CardType>}
 */
const EASY_MONSTERS = [Gryphon, YoungGryphon, RestlessGryphon];

/**
 * @type {NonEmptyArray<CardType>}
 */
const TOUGH_MONSTERS = [MeanGryphon, ProudGryphon];

/**
 * @type {NonEmptyArray<CardType>}
 */
const HARD_MONSTERS = [SkeletalGryphon, StonyGryphon];

/**
 * @type {NonEmptyArray<CardType>}
 */
const OBSTACLES = [Rocks, Bones];

/**
 * @template Item
 * @param {number} count
 * @param  {NonEmptyArray<Item>} items
 * @returns {Item[]}
 */
function pick(count, items) {
  /**
   * @type {Item[]}
   */
  let picked = [];

  for (let i = 0; i < count; i++) {
    picked.push(randomItem(items));
  }

  return picked;
}

/**
 * @param {Board} board
 * @param {Array<CardType | CardType[]>} cardTypes
 */
function spawn(board, cardTypes) {
  let tileQueue = [...board.tiles];
  shuffle(tileQueue);

  for (let cardType of cardTypes.flat()) {
    let card = new Card(cardType);
    let tile = required(tileQueue.pop());
    assert(tile.isEmpty());
    tile.add(card);
  }
}

/**
 * @param {Game} game
 * @returns {Board}
 */
export function generateBoard(game) {
  let board = new Board(game);

  if (game.level < 2) {
    spawn(board, [pick(5, EASY_MONSTERS), pick(3, OBSTACLES)]);
  } else if (game.level < 5) {
    spawn(board, [
      pick(5, EASY_MONSTERS),
      pick(1, TOUGH_MONSTERS),
      pick(3, OBSTACLES),
    ]);
  } else if (game.level < 8) {
    spawn(board, [
      pick(5, EASY_MONSTERS),
      pick(3, TOUGH_MONSTERS),
      pick(1, HARD_MONSTERS),
      pick(3, OBSTACLES),
    ]);
  } else {
    spawn(board, [
      pick(3, EASY_MONSTERS),
      pick(3, TOUGH_MONSTERS),
      pick(3, HARD_MONSTERS),
      pick(5, OBSTACLES),
    ]);
  }

  return board;
}

/**
 * @type {NonEmptyArray<CardType>}
 */
const COMMON_REWARDS = [Hunter, Cleric, Miner, Gladiator];

/**
 * @type {NonEmptyArray<CardType>}
 */
const UNCOMMON_REWARDS = [
  Lich,
  Hero,
  Knight,
  GraveRobber,
  Apostle,
  Scout,
];

/**
 * @type {NonEmptyArray<CardType>}
 */
const RARE_REWARDS = [Wizard, Commander, Pyromancer];

/**
 * @param {Game} game
 * @returns {CardType[]}
 */
export function generateCardRewards(game) {
  let baseChance = game.level / 20;

  /**
   * @type {CardType[]}
   */
  let rewards = [];

  for (let i = 0; i < 16; i++) {
    let chance = Math.random() - baseChance;
    if (chance <= 0.1) {
      rewards.push(randomItem(RARE_REWARDS));
    } else if (chance <= 0.25) {
      rewards.push(randomItem(UNCOMMON_REWARDS));
    } else if (chance <= 0.75) {
      rewards.push(randomItem(COMMON_REWARDS));
    }
  }

  return rewards;
}
