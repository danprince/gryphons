// @ts-check

import { ctx, drawSprite, TextStyle, Timer, writeLine } from "./engine.js";
import { Colors, UI } from "./ui.js";
import {
  assert,
  isNonNullable,
  last,
  Neighbours,
  Rectangle,
  removeFromArray,
  required,
  shuffle,
} from "./utils.js";
import { DrawCardsUntilHandIsFull, DiscardCard } from "./actions.js";

/**
 * @import { Sprite } from "./sprites.js";
 * @import { Point } from "./utils.js";
 */

export class Game {
  /**
   * A global reference to the current game for ease of access.
   * @type {Game}
   */
  static current;

  gold = 0;
  feathers = 0;
  deck = new Pile();
  board = new Board(this);

  /**
   * @type {Trinket[]}
   */
  trinkets = [];

  constructor() {
    Game.current = this;
  }

  startRound() {
    // Reset the piles for a new round.
    this.board.drawPile.reset();
    this.board.discardPile.reset();
    this.board.gravePile.reset();

    // Shuffle the deck into the draw pile.
    this.board.drawPile.addToTop(...this.deck);
    this.board.drawPile.shuffle();

    // Move the cards to the draw pile visually.
    for (let card of this.board.drawPile) {
      card.visible = false;
      card.interactive = false;
    }

    // Draw the initial round of cards.
    this.board.addActionsBottom(new DrawCardsUntilHandIsFull());
  }

  endTurn() {
    for (let card of this.board.hand) {
      if (card) {
        this.board.addActionsBottom(new DiscardCard(card));
      }
    }

    for (let tile of this.board.tiles) {
      if (tile.card) {
        this.onTurn(tile.card);
      }
    }

    this.board.cardsPlayedThisTurn = [];
    this.board.addActionsBottom(new DrawCardsUntilHandIsFull());
  }

  /**
   * Called when a card is drawn into the player's hand.
   * @param {Card} card
   */
  onDraw(card) {
    card.type.onDraw?.(this, card);

    for (let effect of card.effects) {
      effect.onDraw?.(this, card);
    }

    for (let trinket of this.trinkets) {
      trinket.type.onDraw?.(this, trinket, card);
    }
  }

  /**
   * Called when a card is played onto the board.
   * @param {Card} card
   */
  onPlay(card) {
    card.type.onPlay?.(this, card);

    for (let effect of card.effects) {
      effect.onPlay?.(this, card);
    }

    for (let trinket of this.trinkets) {
      trinket.type.onPlay?.(this, trinket, card);
    }
  }

  /**
   * Called when a card is sent to the discard pile.
   * @param {Card} card
   */
  onDiscard(card) {
    card.type.onDiscard?.(this, card);

    for (let effect of card.effects) {
      effect.onDiscard?.(this, card);
    }

    for (let trinket of this.trinkets) {
      trinket.type.onDiscard?.(this, trinket, card);
    }
  }

  /**
   * Called when a card updates after the player ends their turn.
   * @param {Card} card
   */
  onTurn(card) {
    card.type.onTurn?.(this, card);

    for (let effect of card.effects) {
      effect.onTurn?.(this, card);
    }
  }

  /**
   * Called when the card is sent to the grave pile.
   * @param {Card} card
   */
  onDeath(card) {
    card.type.onDeath?.(this, card);

    for (let effect of card.effects) {
      effect.onDeath?.(this, card);
    }

    for (let trinket of this.trinkets) {
      trinket.type.onDeath?.(this, trinket, card);
    }
  }

  /**
   * Called when a card is damaged.
   * @param {Card} card
   */
  onDamage(card) {
    card.type.onDamage?.(this, card);

    for (let effect of card.effects) {
      effect.onDamage?.(this, card);
    }

    for (let trinket of this.trinkets) {
      trinket.type.onDamage?.(this, trinket, card);
    }
  }
}

export class Board {
  /**
   * The width of the board in grid units.
   * @readonly
   * @type {number}
   */
  width;

  /**
   * The height of the board in grid units.
   * @readonly
   * @type {number}
   */
  height;

  /**
   * @type {Tile[]}
   */
  tiles = [];

  /**
   * @type {(Card | undefined)[]}
   */
  hand = [undefined, undefined, undefined, undefined, undefined];

  /**
   * @type {Card[]}
   */
  cardsPlayedThisTurn = [];

  /**
   * Stack of actions.
   * @type {Action[]}
   */
  actions = [];

  /**
   * Cards go here if they aren't played by the end of the turn.
   */
  discardPile = new Pile();

  /**
   * Cards are drawn from here into the hand at the start of the turn.
   */
  drawPile = new Pile();

  /**
   * Cards go here when they are defeated.
   */
  gravePile = new Pile();

  /**
   * @param {Game} game
   * @param {number} width
   * @param {number} height
   */
  constructor(game, width = 7, height = 6) {
    this.game = game;
    this.width = width;
    this.height = height;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles.push(new Tile(x, y));
      }
    }
  }

  reset() {
    for (let tile of this.tiles) {
      if (tile.card) {
        this.removeCard(tile.card);
      }
    }
  }

  /**
   * @returns {boolean}
   */
  isHandFull() {
    return this.hand.indexOf(undefined) === -1;
  }

  /**
   * @param {Card} card
   */
  addCardToHand(card) {
    assert(!this.isHandFull());
    let index = this.hand.indexOf(undefined);
    this.hand[index] = card;
  }

  /**
   * @param {Card} card
   */
  removeCard(card) {
    card.tile.card = undefined;
    card.tile = Tile.none;
  }

  /**
   * @param {Card} card
   */
  removeCardFromHand(card) {
    let index = this.hand.indexOf(card);
    if (index >= 0) {
      this.hand[index] = undefined;
    }
  }

  /**
   * Add actions to the top of the action stack (front of the queue).
   * @param {...Action} actions
   */
  addActionsTop(...actions) {
    this.actions.push(...actions);
  }

  /**
   * Add actions to the bottom of the action stack (back of the queue).
   * @param {...Action} actions
   */
  addActionsBottom(...actions) {
    this.actions.unshift(...actions);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  getTileAt(x, y) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      return this.tiles[x + y * this.width];
    }
  }

  /**
   * @param {Tile} tile
   * @returns {Tile[]}
   */
  getAdjacentTiles(tile, rule = Neighbours.adjacent) {
    if (tile === Tile.none) return [];
    return rule
      .map((offset) => this.getTileAt(tile.x + offset.x, tile.y + offset.y))
      .filter(isNonNullable);
  }

  /**
   * @param {Card} card
   * @param {Point[]} rule
   * @returns {Card[]}
   */
  getAdjacentCards(card, rule = Neighbours.adjacent) {
    return this.getAdjacentTiles(card.tile, rule)
      .map((tile) => tile.card)
      .filter(isNonNullable);
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.updateActions();

    for (let card of this.drawPile) {
      card.update(dt);
    }

    for (let card of this.discardPile) {
      card.update(dt);
    }

    for (let card of this.hand) {
      card?.update(dt);
    }

    for (let tile of this.tiles) {
      tile.card?.update(dt);
    }
  }

  /**
   * @private
   */
  updateActions() {
    UI.needsRender ||= this.actions.length > 0;

    while (this.actions.length > 0) {
      let action = required(last(this.actions));
      let result = action.perform();

      if (result === Action.continue) {
        continue;
      } else if (result === Action.wait) {
        break;
      } else {
        removeFromArray(this.actions, action);
      }
    }
  }
}

export class Pile {
  /**
   * @type {Card[]}
   */
  cards = [];

  /**
   * @private
   * @type {Set<Card>}
   */
  set = new Set();

  get size() {
    return this.cards.length;
  }

  [Symbol.iterator]() {
    return this.cards[Symbol.iterator]();
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this.cards.length === 0;
  }

  reset() {
    this.cards.length = 0;
    this.set.clear();
  }

  /**
   * @param {...Card} cards
   */
  addToTop(...cards) {
    for (let card of cards) {
      if (!this.set.has(card)) {
        this.set.add(card);
        this.cards.push(card);
      } else {
        throw new Error("Attempt to add a duplicate card to a pile!");
      }
    }
  }

  /**
   * @param {...Card} cards
   */
  addToBottom(...cards) {
    for (let card of cards) {
      if (!this.set.has(card)) {
        this.set.add(card);
        this.cards.unshift(card);
      } else {
        throw new Error("Attempt to add a duplicate card to a pile!");
      }
    }
  }

  /**
   * @return {Card | undefined}
   */
  removeFromTop() {
    let card = this.cards.pop();

    if (card) {
      this.set.delete(card);
    }

    return card;
  }

  /**
   * @return {Card | undefined}
   */
  peekAtTop() {
    return this.cards[this.cards.length - 1];
  }

  /**
   * @param {Card} card
   */
  remove(card) {
    this.set.delete(card);
    removeFromArray(this.cards, card);
  }

  /**
   * @param {Card} card
   */
  includes(card) {
    return this.set.has(card);
  }

  shuffle() {
    shuffle(this.cards);
  }
}
/**
 * @typedef {typeof Action.done | typeof Action.continue | typeof Action.wait} ActionResult
 */

export class Action {
  /**
   * Return this value from an action's perform method to indicate that the
   * action has finished and can be removed.
   * @type {"done"}
   */
  static done = "done";

  /**
   * Return this value from an action's perform method to indicate that the
   * action needs to continue updating.
   * @type {"continue"}
   */
  static continue = "continue";

  /**
   * Return this value from an action's perform method to indicate that the
   * action needs to continue updating during the next frame.
   * @type {"wait"}
   */
  static wait = "wait";

  /**
   * Quick access to the current game.
   */
  get game() {
    return Game.current;
  }

  /**
   * @return {ActionResult}
   */
  perform() {
    return Action.done;
  }
}

export class AsyncAction extends Action {
  /**
   * @private
   * @type {Promise<void> | undefined}
   */
  _promise;

  /**
   * @private
   */
  _resolved = false;

  perform() {
    if (this._promise === undefined) {
      this._promise = this.run();
      this._promise.then(() => (this._resolved = true));
    }

    if (this._resolved) {
      return Action.done;
    } else {
      return Action.wait;
    }
  }

  async run() {}
}

export class CardEffect {
  /**
   * @param {object} config
   * @param {Sprite} config.icon
   * @param {string} config.name The name of this effect.
   * @param {string} config.description A short description of the effect.
   * @param {(game: Game, card: Card) => void} [config.onDraw]
   * @param {(game: Game, card: Card) => void} [config.onPlay]
   * @param {(game: Game, card: Card) => void} [config.onTurn]
   * @param {(game: Game, card: Card) => void} [config.onDeath]
   * @param {(game: Game, card: Card) => void} [config.onDamage]
   * @param {(game: Game, card: Card) => void} [config.onDiscard]
   */
  constructor(config) {
    this.icon = config.icon;
    this.name = config.name;
    this.description = config.description;
    this.onDraw = config.onDraw;
    this.onPlay = config.onPlay;
    this.onTurn = config.onTurn;
    this.onDeath = config.onDeath;
    this.onDamage = config.onDamage;
    this.onDiscard = config.onDiscard;
  }
}

export class CardCategory {
  /**
   *
   * @param {object} config
   * @param {Sprite} config.counterFrameSprite
   */
  constructor(config) {
    this.counterFrameSprite = config.counterFrameSprite;
  }
}

export class CardType {
  /**
   * @param {object} config
   * @param {CardCategory} config.category
   * @param {Sprite} config.sprite
   * @param {string} config.name
   * @param {string} [config.description]
   * @param {number} config.counter
   * @param {CardEffect[]} [config.effects]
   * @param {(game: Game, card: Card) => void} [config.onDraw]
   * @param {(game: Game, card: Card) => void} [config.onPlay]
   * @param {(game: Game, card: Card) => void} [config.onTurn]
   * @param {(game: Game, card: Card) => void} [config.onDeath]
   * @param {(game: Game, card: Card) => void} [config.onDamage]
   * @param {(game: Game, card: Card) => void} [config.onDiscard]
   */
  constructor(config) {
    this.category = config.category;
    this.sprite = config.sprite;
    this.name = config.name;
    this.description = config.description ?? "";
    this.counter = config.counter;
    this.effects = config.effects ?? [];
    this.onDraw = config.onDraw;
    this.onPlay = config.onPlay;
    this.onTurn = config.onTurn;
    this.onDeath = config.onDeath;
    this.onDamage = config.onDamage;
    this.onDiscard = config.onDiscard;
  }
}

export class Card {
  /**
   * The tile the card is currently on (or {@link Tile.none} if it's not in
   * play).
   */
  tile = Tile.none;

  /**
   * The bounds of the card in pixel coordinates.
   */
  bounds = new Rectangle();

  /**
   * The rendered opacity of the card.
   */
  opacity = 1;

  /**
   * Whether or not the card is rendered.
   */
  visible = true;

  /**
   * Whether or not the card is interactive.
   */
  interactive = true;

  /**
   * @type {number}
   */
  offsetX = 0;

  /**
   * @type {number}
   */
  offsetY = 0;

  /**
   * The effects that are currently
   * @type {CardEffect[]}
   */
  effects = [];

  /**
   * A mutually exclusive timer for animating this card.
   * @private
   * @type {Timer | undefined}
   */
  animationTimer;

  /**
   * @param {CardType} type
   */
  constructor(type) {
    this.type = type;
    this.bounds.w = type.sprite.width;
    this.bounds.h = type.sprite.height;
    this.effects = [...type.effects];
    this.counter = type.counter;
  }

  isHovered() {
    return (
      this.interactive &&
      this.visible &&
      this.bounds.contains(UI.pointer.x, UI.pointer.y)
    );
  }

  isPressed() {
    return (
      this.interactive &&
      this.visible &&
      UI.pointer.isPressed() &&
      this.isHovered()
    );
  }

  /**
   * Check whether the card is currently on the board.
   * @returns {boolean}
   */
  isInPlay() {
    return this.tile !== Tile.none;
  }

  /**
   * Create a card specific timer, replacing any other timers that were active
   * on this card. Useful to make sure that multiple animations don't run at
   * once.
   *
   * @param {object} config
   * @param {number} config.duration
   * @param {(progress: number) => void} [config.update]
   * @param {() => void} [config.done]
   */
  animate(config) {
    this.animationTimer = new Timer(config);
  }

  /**
   * Render the card at specific coordinates.
   * @param {number} x
   * @param {number} y
   */
  render(x = this.bounds.x + this.offsetX, y = this.bounds.y + this.offsetY) {
    if (!this.visible || this.opacity === 0) {
      return;
    }

    ctx.globalAlpha = this.opacity;
    drawSprite(this.type.sprite, x, y);

    //if (this.hasBounty) {
    //  let sprite = Sprites.icon_gold;
    //  let sx = x + this.bounds.w - sprite.width;
    //  let sy = y;
    //  drawSprite(sprite, sx, sy);
    //}

    if (this.counter > 0) {
      let sprite = this.type.category.counterFrameSprite;
      let sx = x - 1;
      let sy = y - 1;
      drawSprite(sprite, sx, sy);

      TextStyle.save();
      if (this.counter < this.type.counter) {
        TextStyle.color = Colors.red;
      } else if (this.counter > this.type.counter) {
        TextStyle.color = Colors.waterfall;
      } else {
        TextStyle.color = Colors.white;
      }
      writeLine(`${this.counter}`, sx + 3, sy + 3);
      TextStyle.restore();
    }

    ctx.globalAlpha = 1;

    if (UI.debug) {
      ctx.save();
      ctx.strokeStyle = "cyan";
      ctx.strokeRect(x + 0.5, y + 0.5, this.bounds.w - 1, this.bounds.h - 1);
      ctx.restore();
    }
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (this.animationTimer) {
      this.animationTimer.update(dt);
      UI.needsRender = true;
    }

    if (this.animationTimer?.isDone()) {
      this.animationTimer = undefined;
    }

    if (this.isHovered()) {
      UI.inspectCard(this);
    }
  }
}

export class TrinketType {
  /**
   * @param {object} config
   * @param {string} config.name
   * @param {string} config.description
   * @param {Sprite} config.sprite
   * @param {(game: Game, trinket: Trinket, card: Card) => void} [config.onPlay]
   * @param {(game: Game, trinket: Trinket, card: Card) => void} [config.onDraw]
   * @param {(game: Game, trinket: Trinket, card: Card) => void} [config.onDiscard]
   * @param {(game: Game, trinket: Trinket, card: Card) => void} [config.onDamage]
   * @param {(game: Game, trinket: Trinket, card: Card) => void} [config.onDeath]
   */
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.sprite = config.sprite;
    this.onPlay = config.onPlay;
    this.onDraw = config.onDraw;
    this.onDamage = config.onDamage;
    this.onDiscard = config.onDiscard;
    this.onDeath = config.onDeath;
  }
}

export class Trinket {
  counter = 0;

  /**
   * @param {TrinketType} type
   */
  constructor(type) {
    this.type = type;
  }
}

export class Tile {
  /**
   * A tile that cards can point to when they're not in play.
   */
  static none = new Tile(NaN, NaN);

  /**
   * X position in board coordinates.
   * @type {number}
   */
  x = 0;

  /**
   * Y position in board coordinates.
   * @type {number}
   */
  y = 0;

  /**
   * @type {Card | undefined}
   */
  card;

  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Check whether the tile is not currently occupied.
   * @returns {boolean}
   */
  isEmpty() {
    return this.card === undefined;
  }

  /**
   * @param {Card} card
   */
  add(card) {
    assert(this.isEmpty());
    card.tile = this;
    this.card = card;

    let pos = UI.boardToScreen(this);
    card.bounds.x = pos.x;
    card.bounds.y = pos.y;
  }
}
