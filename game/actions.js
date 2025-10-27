import { gridToPixel } from "./engine.js";
import { Card, CardTrigger, Game, Tile } from "./game.js";
import { getHandRect, Message, UI, VFX } from "./ui.js";
import { required, lerp, easeInOut } from "./utils.js";

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

export class DrawCardsUntilHandIsFull extends Action {
  perform() {
    let { board } = this.game;

    if (board.isHandFull()) {
      return Action.done;
    } else if (board.discardPile.isEmpty() && board.drawPile.isEmpty()) {
      return Action.done;
    } else {
      board.addActionsTop(new DrawCard());
      return Action.continue;
    }
  }
}

export class DrawCard extends Action {
  perform() {
    let { board } = this.game;

    if (board.isHandFull()) {
      Message.show("Your hand is full!");
      return Action.done;
    }

    if (board.discardPile.isEmpty() && board.drawPile.isEmpty()) {
      Message.show("You don't have any cards left!");
      return Action.done;
    }

    if (board.drawPile.isEmpty()) {
      board.addActionsTop(new ShuffleDiscardIntoDraw());
      return Action.continue;
    }

    let card = required(board.drawPile.removeFromTop());
    board.addCardToHand(card);
    this.game.trigger(CardTrigger.Draw, card);

    this.animate(card);

    return Action.done;
  }

  /**
   * @private
   * @param {Card} card
   */
  async animate(card) {
    let { board } = this.game;
    let index = board.hand.indexOf(card);

    let x0 = UI.DRAW_PILE.x;
    let y0 = UI.DRAW_PILE.y;
    let x1 = UI.HAND.x + gridToPixel(index);
    let y1 = UI.HAND.y;

    card.visible = true;
    card.interactive = false;
    card.opacity = 1;

    card.animate({
      duration: 300,
      update: (t) => {
        let k = easeInOut(t);
        let hop = Math.sin(k * Math.PI) * 4;
        card.bounds.x = lerp(x0, x1, k);
        card.bounds.y = lerp(y0, y1, k) - hop;
      },
      done: () => {
        card.interactive = true;
        card.visible = true;
      },
    });
  }
}

export class DiscardCard extends Action {
  /**
   * @param {Card} card
   */
  constructor(card) {
    super();
    this.card = card;
  }

  perform() {
    let { board } = this.game;

    board.removeCard(this.card);
    board.removeCardFromHand(this.card);
    board.discardPile.addToTop(this.card);

    this.animate();

    return Action.done;
  }

  /**
   * @private
   */
  async animate() {
    let { card } = this;
    let x0 = card.bounds.x;
    let y0 = card.bounds.y;
    let x1 = UI.DISCARD_PILE.x;
    let y1 = UI.DISCARD_PILE.y;

    card.visible = true;
    card.interactive = false;
    card.opacity = 1;

    card.animate({
      duration: 200,
      update: (t) => {
        let k = easeInOut(t);
        let hop = Math.sin(k * Math.PI) * 4;
        card.bounds.x = lerp(x0, x1, k);
        card.bounds.y = lerp(y0, y1, k) - hop;
      },
      done: () => {
        card.visible = false;
        card.interactive = false;
      },
    });
  }
}

export class DiscardHand extends Action {
  perform() {
    let { board } = this.game;

    for (let card of board.hand) {
      if (card) {
        board.addActionsTop(new DiscardCard(card));
      }
    }

    return Action.done;
  }
}

export class PlayCard extends Action {
  /**
   * @param {Card} card
   * @param {Tile} tile
   */
  constructor(card, tile) {
    super();
    this.card = card;
    this.tile = tile;
  }

  perform() {
    let { card, tile } = this;
    let { board } = this.game;

    if (!tile.isEmpty()) {
      // TODO: Should the card be sent automatically to the grave if it can't
      // be played here?
      return Action.done;
    }

    if (board.hand.includes(card)) {
      board.cardsPlayedThisTurn.push(card);
      board.removeCardFromHand(card);
    }

    let { x, y } = UI.boardToScreen(tile);
    card.bounds.x = x;
    card.bounds.y = y;
    card.visible = true;
    card.interactive = true;
    card.opacity = 1;
    // Remove offset that might have been set when card was dragged.
    card.offsetX = 0;
    card.offsetY = 0;

    tile.add(card);

    this.game.trigger(CardTrigger.Play, card);

    return Action.done;
  }
}

export class ShuffleDiscardIntoDraw extends Action {
  perform() {
    let { board } = this.game;

    board.discardPile.shuffle();
    board.drawPile.addToBottom(...board.discardPile);
    board.discardPile.reset();

    for (let card of board.drawPile) {
      card.visible = false;
      card.interactive = false;
      card.bounds.x = UI.DRAW_PILE.x;
      card.bounds.y = UI.DRAW_PILE.y;
    }

    return Action.done;
  }
}

export class Damage extends Action {
  /**
   * @param {object} config
   * @param {number} [config.amount]
   * @param {Card} config.card
   * @param {VFX} [config.vfx]
   */
  constructor(config) {
    super();
    this.amount = config.amount ?? 1;
    this.card = config.card;
    this.vfx = config.vfx;
  }

  perform() {
    let { board } = this.game;

    // Bail if the target card is no longer on the board.
    if (!this.card.isInPlay()) {
      return Action.done;
    }

    if (this.vfx) {
      let pos = UI.boardToScreen(this.card.tile);
      VFX.play(this.vfx, pos.x, pos.y);
      UI.screenshake(100);
    }

    this.card.counter -= this.amount;

    this.game.trigger(CardTrigger.Damage, this.card);

    if (this.card.counter <= 0) {
      board.addActionsTop(new MoveToGravePile(this.card));
    }

    return Action.done;
  }
}

export class MoveToGravePile extends Action {
  /**
   * @param {Card} card
   */
  constructor(card) {
    super();
    this.card = card;
  }

  perform() {
    let { tile } = this.card;

    this.game.trigger(CardTrigger.Defeat, this.card);
    this.game.deck.remove(this.card);
    this.game.board.removeCard(this.card);
    this.game.board.gravePile.addToTop(this.card);

    if (this.card.type.remains) {
      let remains = new Card(this.card.type.remains);
      tile.add(remains);
    }

    this.animate();
    return Action.done;
  }

  /**
   * @private
   */
  animate() {
    let { card } = this;
    let x0 = this.card.bounds.x;
    let y0 = this.card.bounds.y;
    let x1 = UI.GRAVE_PILE.x;
    let y1 = UI.GRAVE_PILE.y;

    card.interactive = false;

    card.animate({
      duration: 300,
      update: (t) => {
        card.bounds.x = lerp(x0, x1, t);
        card.bounds.y = lerp(y0, y1, t);
      },
      done: () => {
        card.visible = false;
      },
    });
  }
}

export class DestroyCard extends Action {
  /**
   * @param {Card} card
   */
  constructor(card) {
    super();
    this.card = card;
  }

  perform() {
    if (this.card.isInPlay()) {
      VFX.play(VFX.bump, this.card.bounds.x, this.card.bounds.y);
    }

    // We don't actually know where the card is so just remove it from
    // everywhere.
    this.game.deck.remove(this.card);
    this.game.board.removeCard(this.card);
    this.game.board.removeCardFromHand(this.card);

    return Action.done;
  }
}

export class Pull extends Action {
  /**
   * @param {Card} card
   * @param {Card} target
   */
  constructor(card, target) {
    super();
    this.card = card;
    this.target = target;
  }

  perform() {
    // Bail if either card was removed from play after the action was created.
    if (!this.card.isInPlay() || !this.target.isInPlay()) {
      return Action.done;
    }

    // Normalize the direction of the push so that we never skip tiles.
    let dx = Math.sign(this.card.tile.x - this.target.tile.x);
    let dy = Math.sign(this.card.tile.y - this.target.tile.y);

    let x = this.target.tile.x + dx;
    let y = this.target.tile.y + dy;

    let tile = this.game.board.getTileAt(x, y);

    if (tile) {
      this.game.board.addActionsTop(new MoveCard(this.target, tile));
    }

    return Action.done;
  }
}

export class Push extends Action {
  /**
   * @param {Card} card
   * @param {Card} target
   */
  constructor(card, target) {
    super();
    this.card = card;
    this.target = target;
  }

  perform() {
    // Bail if either card was removed from play after the action was created.
    if (!this.card.isInPlay() || !this.target.isInPlay()) {
      return Action.done;
    }

    // Normalize the direction of the push so that we never skip tiles.
    let dx = Math.sign(this.target.tile.x - this.card.tile.x);
    let dy = Math.sign(this.target.tile.y - this.card.tile.y);

    let x = this.target.tile.x + dx;
    let y = this.target.tile.y + dy;

    let tile = this.game.board.getTileAt(x, y);

    if (tile) {
      this.game.board.addActionsTop(new Knockback(this.target, tile));
    }

    return Action.done;
  }
}

export class Knockback extends Action {
  /**
   * @param {Card} card
   * @param {Tile} tile
   */
  constructor(card, tile) {
    super();
    this.card = card;
    this.tile = tile;
  }

  perform() {
    // Bail if the card was removed from play after the action was created.
    if (!this.card.isInPlay()) {
      return Action.done;
    }

    // Normalize the direction of the knockback so that we never skip tiles.
    let dx = Math.sign(this.tile.x - this.card.tile.x);
    let dy = Math.sign(this.tile.y - this.card.tile.y);

    // Queue up an action that moves the card into this tile.
    this.game.board.addActionsTop(new MoveCard(this.card, this.tile));

    // If the target tile is empty, then check whether the card will crash into
    // the card behind the empty tile.
    if (this.tile.isEmpty()) {
      let nextTile = this.game.board.getTileAt(
        this.tile.x + dx,
        this.tile.y + dy,
      );

      if (nextTile?.card) {
        this.game.board.addActionsTop(
          new Damage({ card: nextTile.card, amount: 1, vfx: VFX.bump }),
        );
      }
    }

    return Action.done;
  }
}

export class MoveCard extends Action {
  /**
   * @param {Card} card
   * @param {Tile} tile
   */
  constructor(card, tile) {
    super();
    this.card = card;
    this.tile = tile;
  }

  perform() {
    // Bail if the card was removed from play after the action was created.
    if (!this.card.isInPlay()) {
      return Action.done;
    }

    // Bail if there's now something in the tile.
    if (!this.tile.isEmpty()) {
      this.playBumpAnimation();
      return Action.done;
    }

    this.playMoveAnimation();
    this.game.board.removeCard(this.card);
    this.tile.add(this.card);

    return Action.done;
  }

  playMoveAnimation() {
    let dx = gridToPixel(this.card.tile.x - this.tile.x);
    let dy = gridToPixel(this.card.tile.y - this.tile.y);

    this.card.animate({
      duration: 100,
      update: (t) => {
        this.card.offsetX = lerp(dx, 0, t);
        this.card.offsetY = lerp(dy, 0, t);
      },
    });
  }

  playBumpAnimation() {
    let dx = gridToPixel(this.tile.x - this.card.tile.x);
    let dy = gridToPixel(this.tile.y - this.card.tile.y);

    this.card.animate({
      duration: 100,
      update: (t) => {
        let k = Math.sin(t * Math.PI) * 0.1;
        this.card.offsetX = lerp(0, dx, k);
        this.card.offsetY = lerp(0, dy, k);
      },
    });
  }
}

export class ReturnCardToDrawPile extends Action {
  /**
   * @param {Card} card
   */
  constructor(card) {
    super();
    this.card = card;
  }

  perform() {
    let { board } = this.game;

    if (!this.card.isInPlay()) {
      return Action.done;
    }

    board.removeCard(this.card);
    board.drawPile.addToBottom(this.card);
    this.animate();

    return Action.done;
  }

  /**
   * @private
   */
  async animate() {
    let x0 = this.card.bounds.x;
    let y0 = this.card.bounds.y;
    let x1 = UI.DRAW_PILE.x;
    let y1 = UI.DRAW_PILE.y;

    this.card.interactive = false;

    this.card.animate({
      duration: 300,
      update: (t) => {
        this.card.bounds.x = lerp(x0, x1, t);
        this.card.bounds.y = lerp(y0, y1, t);
      },
      done: () => {
        this.card.visible = false;
      },
    });
  }
}

export class ReturnCardToHand extends Action {
  /**
   * @param {Card} card
   */
  constructor(card) {
    super();
    this.card = card;
  }

  perform() {
    let { board } = this.game;

    if (!this.card.isInPlay() || board.isHandFull()) {
      return Action.done;
    }

    board.removeCard(this.card);
    let index = board.addCardToHand(this.card);

    this.animate(index);

    return Action.done;
  }

  /**
   * @private
   * @param {number} index
   */
  async animate(index) {
    let { x: x0, y: y0 } = this.card.bounds;
    let { x: x1, y: y1 } = getHandRect(index);

    this.card.interactive = false;

    this.card.animate({
      duration: 300,
      update: (t) => {
        this.card.bounds.x = lerp(x0, x1, t);
        this.card.bounds.y = lerp(y0, y1, t);
      },
      done: () => {
        this.card.interactive = true;
      },
    });
  }
}

export class CreateCardInHand extends Action {
  /**
   * @param {Card} card
   * @param {Tile} [tile]
   */
  constructor(card, tile) {
    super();
    this.card = card;
    this.tile = tile;
  }

  perform() {
    let { card, tile } = this;
    let { board } = this.game;

    if (tile) {
      let pos = UI.boardToScreen(tile);
      card.bounds.x = pos.x;
      card.bounds.y = pos.y;
    } else {
      card.bounds.x = UI.BOARD.center.x - card.bounds.w / 2;
      card.bounds.y = UI.BOARD.center.y - card.bounds.h / 2;
    }

    if (board.isHandFull()) {
      board.drawPile.addToTop(card);
      this.animateToDrawPile();
    } else {
      board.addCardToHand(card);
      this.animateToHand();
    }

    return Action.done;
  }

  async animateToHand() {
    let { card } = this;
    let { board } = this.game;

    let index = board.hand.indexOf(card);
    let x0 = card.bounds.x;
    let y0 = card.bounds.y;
    let x1 = UI.HAND.x + gridToPixel(index);
    let y1 = UI.HAND.y;

    card.interactive = false;
    card.visible = true;
    card.opacity = 1;

    card.animate({
      duration: 300,
      update: (t) => {
        card.bounds.x = lerp(x0, x1, t);
        card.bounds.y = lerp(y0, y1, t);
      },
      done: () => {
        card.interactive = true;
      },
    });
  }

  async animateToDrawPile() {
    let { card } = this;

    let x0 = card.bounds.x;
    let y0 = card.bounds.y;
    let x1 = UI.DRAW_PILE.x;
    let y1 = UI.DRAW_PILE.y;

    card.interactive = false;
    card.visible = true;
    card.opacity = 1;

    card.animate({
      duration: 300,
      update: (t) => {
        card.bounds.x = lerp(x0, x1, t);
        card.bounds.y = lerp(y0, y1, t);
      },
      done: () => {
        card.visible = false;
      },
    });
  }
}

export class Delay extends AsyncAction {
  /**
   * @param {number} duration
   */
  constructor(duration) {
    super();
    this.duration = duration;
  }

  run() {
    return new Promise((resolve) => {
      setTimeout(resolve, this.duration);
    });
  }
}

export class ChangeMoraleAction extends Action {
  /**
   * @param {number} amount
   */
  constructor(amount) {
    super();
    this.amount = amount;
  }

  perform() {
    this.game.morale += this.amount;
    return Action.done;
  }
}

export class Resurrect extends Action {
  /**
   * @param {Card} card
   * @param {Tile} tile
   */
  constructor(card, tile) {
    super();
    this.card = card;
    this.tile = tile;
  }

  run() {
    // Card is no longer in the grave pile.
    if (!this.game.board.gravePile.includes(this.card)) {
      return Action.done;
    }

    //
    if (!this.tile.isEmpty()) {
      return Action.done;
    }

    this.card.interactive = true;
    this.card.visible = true;
    this.tile.add(this.card);

    VFX.play(VFX.heal, this.card.bounds.center.x, this.card.bounds.center.y);

    // TODO: Animate
  }
}
