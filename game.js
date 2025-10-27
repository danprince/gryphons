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

  /**
   * The current morale level.
   */
  morale = 0;

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
    // Reset morale
    this.morale = 10;

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

  /**
   * @param {number} amount
   */
  setMorale(amount) {
    this.morale = Math.max(0, amount);
  }

  endTurn() {
    this.setMorale(this.morale - 1);

    for (let card of this.board.hand) {
      if (card) {
        this.board.addActionsBottom(new DiscardCard(card));
      }
    }

    for (let tile of this.board.tiles) {
      if (tile.card) {
        this.trigger(CardTrigger.Turn, tile.card);
      }
    }

    this.board.cardsPlayedThisTurn = [];
    this.board.addActionsBottom(new DrawCardsUntilHandIsFull());
  }

  /**
   * @param {CardTrigger} type
   * @param {Card} card
   */
  trigger(type, card) {
    for (let [trigger, effect] of card.type.effects.items) {
      if (trigger === type && effect.canRun(this, card)) {
        let targets = effect.getTargets(this, card);
        effect.run(this, card, targets);
      }
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
   * The number of turns that have taken place during this round.
   */
  turns = 0;

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
  constructor(game, width = 7, height = 7) {
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
   * @returns {number} The index of the card in the hand.
   */
  addCardToHand(card) {
    assert(!this.isHandFull());
    let index = this.hand.indexOf(undefined);
    this.hand[index] = card;
    return index;
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

  getCardsInPlay() {
    return this.tiles.map((tile) => tile.card).filter(isNonNullable);
  }

  /**
   * @param {Card} card
   * @param {(card: Card) => boolean} filter
   * @returns {Generator<Card>}
   */
  *search(card, filter) {
    let seen = new Set([card]);
    let stack = [card];

    while (stack.length > 0) {
      let card = required(stack.pop());
      let neighbours = this.getAdjacentCards(card);

      for (let neighbour of neighbours) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);

          if (filter(neighbour)) {
            yield neighbour;
            stack.push(neighbour);
          }
        }
      }
    }
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

/**
 * @typedef {(game: Game, card: Card) => Iterable<Card>} TargetingFunction
 * @typedef {(game: Game, card: Card) => Card[]} TargetingSource
 * @typedef {(game: Game, card: Card, targets: Card[]) => Card[]} TargetingFilter
 */

export const Targeting = {
  /**
   * @param  {[TargetingSource, ...TargetingFilter[]]} filters
   * @returns {TargetingFunction}
   */
  compose([source, ...filters]) {
    return (game, card) => {
      let targets = source(game, card);

      for (let filter of filters) {
        targets = filter(game, card, targets);
      }

      return targets;
    };
  },

  /**
   *
   * @param {Game} game
   * @param {Card} card
   * @param {TargetingSource} source
   * @param {...TargetingFilter} filters
   */
  select(game, card, source, ...filters) {
    let targets = source(game, card);

    for (let filter of filters) {
      targets = filter(game, card, targets);
    }

    return targets;
  },

  /**
   * @type {TargetingFilter}
   */
  enemies(game, card, targets) {
    return targets.filter((target) => card.isEnemy(target));
  },

  /**
   * @type {TargetingFilter}
   */
  allies(game, card, targets) {
    return targets.filter((target) => card.isAlly(target));
  },

  /**
   * @type {TargetingFilter}
   */
  weakest(game, card, targets) {
    let minCounter = Math.min(...targets.map((target) => target.counter));
    return targets.filter((target) => target.counter === minCounter);
  },

  /**
   * @type {TargetingFilter}
   */
  strongest(game, card, targets) {
    let maxCounter = Math.max(...targets.map((target) => target.counter));
    return targets.filter((target) => target.counter === maxCounter);
  },

  /**
   * @param {(card: Card) => boolean} predicate
   * @returns {TargetingFilter}
   */
  test(predicate) {
    return (game, card, targets) => targets.filter(predicate);
  },

  /**
   * @type {TargetingSource}
   */
  adjacent(game, card) {
    return game.board.getAdjacentCards(card);
  },

  /**
   * @type {TargetingSource}
   */
  all(game, card) {
    return game.board.getCardsInPlay();
  },

  // TODO:
  // row()
  // column()
  // lineOfSight()

  /**
   * @param {CardType} cardType
   * @returns {TargetingFilter}
   */
  type(cardType) {
    return (game, card, targets) => {
      return targets.filter((target) => target.type === cardType);
    };
  },

  /**
   * @param {Tag} tag
   * @returns {TargetingFilter}
   */
  tag(tag) {
    return (game, card, targets) => {
      return targets.filter((target) => target.type.tags.includes(tag));
    };
  },
};

export class CardTrigger {
  static Play = new CardTrigger("Play");
  static Draw = new CardTrigger("Draw");
  static Discard = new CardTrigger("Discard");
  static Defeat = new CardTrigger("Defeat");
  static Damage = new CardTrigger("Damage");
  static Turn = new CardTrigger("Turn");

  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

export class CardEffect {
  /**
   * @param {object} config
   * @param {string} [config.description]
   * @param {(game: Game, card: Card) => boolean} [config.condition]
   * @param {TargetingFunction | [TargetingSource, ...TargetingFilter[]]} [config.targeting]
   * @param {(game: Game, card: Card, targets: Card[]) => void} config.run
   */
  constructor(config) {
    this.description = config.description;
    this.targeting = Array.isArray(config.targeting)
      ? Targeting.compose(config.targeting)
      : config.targeting;
    this.run = config.run;
    this.condition = config.condition;
  }

  /**
   * @param {Game} game
   * @param {Card} card
   * @returns {boolean}
   */
  canRun(game, card) {
    return this.condition === undefined || this.condition(game, card);
  }

  /**
   * @param {Game} game
   * @param {Card} card
   * @returns {Card[]}
   */
  getTargets(game, card) {
    return this.targeting ? Array.from(this.targeting(game, card)) : [];
  }
}

/**
 * @typedef {[trigger: CardTrigger, effect: CardEffect]} CardEffectListItem
 */

export class CardEffectList {
  /**
   * @param {CardEffectListItem[]} items
   */
  constructor(items = []) {
    this.items = items;
  }

  /**
   * @param {CardTrigger} trigger
   * @param {CardEffect} effect
   * @returns {this}
   */
  add(trigger, effect) {
    this.items.push([trigger, effect]);
    return this;
  }
}

export class CardCategory {
  /**
   *
   * @param {object} config
   * @param {string} config.name
   * @param {Sprite} config.counterFrameSprite
   * @param {CardCategory[]} [config.enemies]
   * @param {CardCategory[]} [config.allies]
   */
  constructor(config) {
    this.name = config.name;
    this.counterFrameSprite = config.counterFrameSprite;
    this.enemies = config.enemies ?? [];
    this.allies = config.allies ?? [];
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
   * @param {Tag[]} [config.tags]
   * @param {CardType} [config.remains]
   * @param {CardEffectList} [config.effects]
   * @param {CardEffect} [config.onPlay]
   * @param {CardEffect} [config.onTurn]
   * @param {CardEffect} [config.onDefeat]
   * @param {CardEffect} [config.onDamage]
   */
  constructor(config) {
    this.category = config.category;
    this.sprite = config.sprite;
    this.name = config.name;
    this.description = config.description;
    this.counter = config.counter;

    this.tags = config.tags ?? [];
    this.remains = config.remains;
    this.effects = config.effects ?? new CardEffectList();

    if (config.onPlay) {
      this.effects.add(CardTrigger.Play, config.onPlay);
    }

    if (config.onDefeat) {
      this.effects.add(CardTrigger.Defeat, config.onDefeat);
    }

    if (config.onDamage) {
      this.effects.add(CardTrigger.Damage, config.onDamage);
    }

    if (config.onTurn) {
      this.effects.add(CardTrigger.Turn, config.onTurn);
    }
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
   * A mutually exclusive timer for animating this card.
   * @private
   * @type {Timer | undefined}
   */
  animationTimer;

  get category() {
    return this.type.category;
  }

  /**
   * @param {CardType} type
   */
  constructor(type) {
    this.type = type;
    this.bounds.w = type.sprite.width;
    this.bounds.h = type.sprite.height;
    this.counter = type.counter;
  }

  /**
   * Create a copy of this card.
   * @returns {Card}
   */
  copy() {
    let copy = new Card(this.type);
    copy.counter = this.counter;
    return copy;
  }

  /**
   * @param {Tag} tag
   * @returns {boolean}
   */
  hasTag(tag) {
    return this.type.tags.includes(tag);
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
   * @param {Card} card
   * @return {boolean}
   */
  isAlly(card) {
    return (
      this.category === card.category ||
      this.category.allies.includes(card.category) ||
      card.category.allies.includes(this.category)
    );
  }

  /**
   * @param {Card} card
   * @return {boolean}
   */
  isEnemy(card) {
    return (
      this.category.enemies.includes(card.category) ||
      card.category.enemies.includes(this.category)
    );
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

  /**
   * Mostly just used as a convenient way to get the tile's position as a point
   * during tests.
   * @returns {Point}
   */
  get position() {
    return { x: this.x, y: this.y };
  }
}
