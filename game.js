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
import { DrawCardsUntilHandIsFull, DiscardCard, Action } from "./actions.js";

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

  /**
   * The current progress through the game.
   */
  level = 0;

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

  endRound() {
    this.level += 1;
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
   * @returns {boolean}
   */
  isHandEmpty() {
    return this.hand.every((slot) => slot === undefined);
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
    // Actions need to be reversed to go onto the stack in the order they'll
    // be processed.
    //
    // addActionsTop(
    //   new ActionA(), <-- We naturally expect this to happen first but
    //   new ActionB(),     but push will put this on top of the stack before
    //   new ActionC(),     the others meaning it will be processed after them.
    // )
    this.actions.push(...actions.reverse());
  }

  /**
   * Add actions to the bottom of the action stack (back of the queue).
   * @param {...Action} actions
   */
  addActionsBottom(...actions) {
    // Actions need to be reversed to go onto the stack in the order they'll
    // be processed.
    //
    // addActionsBottom(
    //   new ActionA(), <-- We naturally expect this to happen first but
    //   new ActionB(),     but unshift will put this at the bottom of the
    //   new ActionC(),     stack meaning it will be processed last.
    // )
    this.actions.unshift(...actions.reverse());
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

    for (let card of this.gravePile) {
      card.update(dt);
    }

    for (let card of this.drawPile) {
      card.update(dt);
    }

    for (let card of this.discardPile) {
      card.update(dt);
    }

    for (let card of this.hand) {
      card?.update(dt);
    }

    /**
     * Set that makes sure we don't update any units twice even if they
     * move tiles during their turn.
     * @type {Set<Card>}
     */
    let updatedCards = new Set();

    for (let tile of this.tiles) {
      let card = tile.card;
      if (card && !updatedCards.has(card)) {
        updatedCards.add(card);
        card.update(dt);
      }
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
      if (this.set.has(card)) {
        console.warn("Adding duplicate card to top of pile", this, card);
        removeFromArray(this.cards, card);
      }

      this.set.add(card);
      this.cards.push(card);
    }
  }

  /**
   * @param {...Card} cards
   */
  addToBottom(...cards) {
    for (let card of cards) {
      if (this.set.has(card)) {
        console.warn("Adding duplicate card to bottom of pile", this, card);
        removeFromArray(this.cards, card);
      }

      this.set.add(card);
      this.cards.unshift(card);
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
   * @param {string} config.name
   * @param {Sprite} config.counterFrameSprite
   */
  constructor(config) {
    this.name = config.name;
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

  /**
   * Create a copy of this card.
   * @returns {Card}
   */
  copy() {
    let copy = new Card(this.type);
    copy.effects = [...this.effects];
    copy.counter = this.counter;
    return copy;
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

/**
 * @param {Game} game
 * @param {Card} card
 * @param {CardCategory} category
 * @returns {Generator<Card>}
 */
export function* getConnectedCards(game, card, category = card.type.category) {
  let seen = new Set([card]);
  let stack = [card];

  while (stack.length > 0) {
    let card = required(stack.pop());
    let neighbours = game.board.getAdjacentCards(card);

    for (let neighbour of neighbours) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour);

        if (neighbour.type.category === category) {
          yield neighbour;
          stack.push(neighbour);
        }
      }
    }
  }
}
