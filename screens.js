// @ts-check

import { PlayCard } from "./actions.js";
import {
  ctx,
  drawSprite,
  TextStyle,
  writeLine,
  pixelToGrid,
  gridToPixel,
  Timer,
  drawNineSlice,
  fillRect,
} from "./engine.js";
import { UI, GameInfo, Screen, alignToRow, drawFrame } from "./ui.js";
import { Rectangle, lerp } from "./utils.js";
import * as Sprites from "./sprites.js";

/**
 * @import { Point } from "./utils.js";
 * @import { Card, Game } from "./game.js";
 * @import { Sprite, NineSliceSprite } from "./sprites.js";
 */

export class Panel {
  /**
   * @param {object} config
   * @param {number} [config.opacity]
   * @param {Sprite | NineSliceSprite} [config.sprite]
   * @param {Rectangle} [config.bounds]
   * @param {number} [config.x]
   * @param {number} [config.y]
   * @param {number} [config.width]
   * @param {number} [config.height]
   * @param {string} [config.color]
   */
  constructor(config) {
    this.opacity = config.opacity ?? 1;
    this.sprite = config.sprite;
    this.color = config.color;

    this.bounds =
      config.bounds ??
      new Rectangle(
        config.x ?? this.sprite?.x ?? 0,
        config.y ?? this.sprite?.y ?? 0,
        config.width ?? this.sprite?.width ?? 0,
        config.height ?? this.sprite?.height ?? 0,
      );
  }

  render() {
    ctx.globalAlpha = this.opacity;

    if (this.color) {
      fillRect(
        this.bounds.x,
        this.bounds.y,
        this.bounds.w,
        this.bounds.h,
        this.color,
      );
    }

    if (this.sprite?.center) {
      drawFrame(/** @type {NineSliceSprite} */ (this.sprite), this.bounds);
    } else if (this.sprite) {
      drawSprite(this.sprite, this.bounds.x, this.bounds.y);
    }

    ctx.globalAlpha = 1;
  }
}

class SpriteButton {
  bounds = new Rectangle();
  opacity = 1;
  disabled = false;

  /**
   * @param {object} config
   * @param {Sprite} config.sprite
   * @param {Sprite} [config.hoverSprite]
   * @param {Sprite} [config.activeSprite]
   * @param {() => void} [config.onClick]
   */
  constructor(config) {
    this.sprite = config.sprite;
    this.hoverSprite = config.hoverSprite ?? config.sprite;
    this.activeSprite = config.activeSprite ?? config.sprite;
    this.bounds.w = this.sprite.width;
    this.bounds.h = this.sprite.height;
    this.onClick = config.onClick;
  }

  isHovered() {
    return !this.disabled && this.bounds.contains(UI.pointer.x, UI.pointer.y);
  }

  isDown() {
    return !this.disabled && UI.pointer.isDown() && this.isHovered();
  }

  isPressed() {
    return !this.disabled && UI.pointer.isPressed() && this.isHovered();
  }

  update() {
    if (this.isPressed()) {
      this.onClick?.();
    }
  }

  render() {
    ctx.globalAlpha = this.opacity;
    let sprite = this.sprite;
    if (this.isHovered()) sprite = this.hoverSprite;
    if (this.isDown()) sprite = this.activeSprite;
    drawSprite(sprite, this.bounds.x, this.bounds.y);
    ctx.globalAlpha = 1;
  }
}

export class TileButton extends SpriteButton {
  /**
   * @type {number | undefined}
   */
  counter;

  /**
   * @param {object} config
   * @param {import("./sprites").Sprite} config.sprite
   * @param {import("./sprites").Sprite} [config.hoverSprite]
   * @param {import("./sprites").Sprite} [config.activeSprite]
   * @param {() => number} [config.getCounter]
   * @param {() => void} [config.onClick]
   */
  constructor(config) {
    super(config);
    this.getCounter = config.getCounter;
  }

  update() {
    super.update();
    this.counter = this.getCounter?.();
  }

  render() {
    super.render();

    let isHovered = this.isHovered();

    ctx.globalAlpha = this.opacity;

    if (isHovered) {
      drawSprite(Sprites.ui_tile_active, this.bounds.x, this.bounds.y);
    }

    if (this.counter !== undefined) {
      let label = `${this.counter}`;
      let x = this.bounds.center.x;
      let y = this.bounds.y + this.bounds.h + 2;
      TextStyle.save();
      TextStyle.align = "center";
      TextStyle.baseline = "bottom";
      writeLine(label, x, y);
      TextStyle.restore();
    }

    ctx.globalAlpha = 1;
  }
}

class MenuScreenButton extends SpriteButton {
  /**
   * @param {object} config
   * @param {string} config.label
   * @param {import("./sprites").Sprite} config.sprite
   * @param {import("./sprites").Sprite} [config.hoverSprite]
   * @param {import("./sprites").Sprite} [config.activeSprite]
   * @param {() => void} config.onClick
   */
  constructor(config) {
    super(config);
    this.label = config.label;
    this.bounds.w = this.sprite.width;
    this.bounds.h = gridToPixel(2);
  }

  render() {
    super.render();
    let isHovered = this.isHovered();

    ctx.globalAlpha = this.opacity;

    if (isHovered) {
      drawSprite(Sprites.ui_tile_active, this.bounds.x, this.bounds.y);
    }

    TextStyle.save();
    TextStyle.align = "center";
    TextStyle.baseline = "top";
    TextStyle.color = isHovered ? "white" : "gray";
    writeLine(
      this.label,
      this.bounds.center.x,
      this.bounds.y + gridToPixel(1) + 5,
    );
    TextStyle.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * @param {number} delay
   */
  async enter(delay) {
    let y0 = this.bounds.y + 20;
    let y1 = this.bounds.y;

    this.opacity = 0;

    await Timer.promise(delay);
    await Timer.promise(500, (t) => {
      this.bounds.y = lerp(y0, y1, t);
      this.opacity = lerp(0, 1, t);
    });
  }

  /**
   * @param {number} delay
   */
  async exit(delay) {
    let y0 = this.bounds.y;
    let y1 = this.bounds.y + 20;

    await Timer.promise(delay);
    await Timer.promise(500, (t) => {
      this.bounds.y = lerp(y0, y1, t);
      this.opacity = lerp(1, 0, t);
    });
  }
}

export class MenuScreen extends Screen {
  logo = new Panel({
    sprite: Sprites.logo,
    x: gridToPixel(6),
    y: gridToPixel(2),
  });

  newGameButton = new MenuScreenButton({
    label: "New game",
    sprite: Sprites.button_new_game,
    onClick: () => UI.navigate(new BoardScreen(this.game)),
  });

  continueGameButton = new MenuScreenButton({
    label: "Continue",
    sprite: Sprites.button_draw,
    onClick: () => UI.navigate(new BoardScreen(this.game)),
  });

  settingsButton = new MenuScreenButton({
    label: "Settings",
    sprite: Sprites.button_settings,
    onClick: () => UI.navigate(new SettingsScreen()),
  });

  achievementsButton = new MenuScreenButton({
    label: "Achievements",
    sprite: Sprites.button_achievements,
    onClick: () => UI.navigate(new AchievementsScreen()),
  });

  /**
   * @type {MenuScreenButton[]}
   */
  buttons = [this.newGameButton, this.settingsButton, this.achievementsButton];

  /**
   * @param {Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    let x = gridToPixel(6);
    let y = gridToPixel(5);

    for (let button of this.buttons) {
      button.bounds.x = x;
      button.bounds.y = y;
      x += gridToPixel(2);
    }
  }

  update() {
    for (let button of this.buttons) {
      button.update();
    }
  }

  render() {
    this.logo.render();

    for (let button of this.buttons) {
      button.render();
    }
  }

  /**
   * @private
   */
  async enterLogo() {
    let y0 = this.logo.bounds.y - 10;
    let y1 = this.logo.bounds.y;
    this.logo.opacity = 0;
    await Timer.promise(600, (t) => {
      this.logo.bounds.y = lerp(y0, y1, t);
      this.logo.opacity = lerp(0, 1, t);
    });
  }

  /**
   * @private
   */
  async exitLogo() {
    let y0 = this.logo.bounds.y;
    let y1 = this.logo.bounds.y - 10;
    this.logo.opacity = 1;
    await Timer.promise(400, (t) => {
      this.logo.bounds.y = lerp(y0, y1, t);
      this.logo.opacity = lerp(1, 0, t);
    });
  }

  async enter() {
    await Promise.all([
      this.enterLogo(),
      ...this.buttons.map((button, index) => button.enter((index + 1) * 100)),
    ]);
  }

  async exit() {
    await Promise.all([
      this.exitLogo(),
      ...this.buttons.map((button, index) => button.exit((index + 1) * 100)),
    ]);
  }
}

export class SettingsScreen extends Screen {}

export class AchievementsScreen extends Screen {}

export class GameScreen extends Screen {
  /**
   * @type {GameInfo | undefined}
   */
  info;

  leaveButton = new TileButton({
    sprite: Sprites.button_leave,
    onClick: () => UI.navigate(new MenuScreen(this.game)),
  });

  goldButton = new TileButton({
    sprite: Sprites.button_gold,
    getCounter: () => this.game.gold,
  });

  feathersButton = new TileButton({
    sprite: Sprites.button_feather,
    getCounter: () => this.game.feathers,
  });

  deckButton = new TileButton({
    sprite: Sprites.button_deck,
    getCounter: () => this.game.deck.size,
  });

  /**
   * @param {Game} game
   */
  constructor(game) {
    super();
    this.game = game;

    alignToRow(
      UI.LEFT_TRAY,
      this.leaveButton,
      this.goldButton,
      this.feathersButton,
      this.deckButton,
    );
  }

  enter() {
    if (this.info) {
      UI.showGameInfo(this.info);
    }
  }
}

export class BoardScreen extends GameScreen {
  info = new GameInfo({
    name: "Hunt",
    description: "Hunting description",
    panelSprite: Sprites.panel,
    bannerSprite: Sprites.banner_neutral,
  });

  endTurnButton = new SpriteButton({
    sprite: Sprites.button_end_turn_2,
    hoverSprite: Sprites.button_end_turn_2_hover,
    activeSprite: Sprites.button_end_turn_2_active,
    onClick: () => this.game.endTurn(),
  });

  handPanel = new Panel({
    sprite: Sprites.panel_hand,
    bounds: UI.HAND.clone().grow(3),
    color: "black",
  });

  /**
   * @type {Card | undefined}
   */
  draggingCard = undefined;
  dragOriginX = 0;
  dragOriginY = 0;

  /**
   * @param {Game} game
   */
  constructor(game) {
    super(game);

    this.endTurnButton.bounds.x = UI.END_TURN_BUTTON.x - 6;
    this.endTurnButton.bounds.y = UI.END_TURN_BUTTON.y + 4;
  }

  enter() {
    super.enter();
    this.game.startRound();
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.game.board.update(dt);

    this.leaveButton.update();
    this.goldButton.update();
    this.feathersButton.update();
    this.deckButton.update();

    this.endTurnButton.update();

    this.updateHandHover();
    this.updateDraggingCard();
  }

  updateHandHover() {
    for (let card of this.game.board.hand) {
      if (card === this.draggingCard) {
        continue;
      } else if (card?.isHovered()) {
        card.offsetY = -2;
      } else if (card) {
        card.offsetY = 0;
      }
    }
  }

  updateDraggingCard() {
    let card = this.draggingCard;

    if (!card) {
      for (let card of this.game.board.hand) {
        if (card?.isPressed()) {
          this.draggingCard = card;
          this.dragOriginX = UI.pointer.x - card.offsetX;
          this.dragOriginY = UI.pointer.y - card.offsetY;
          break;
        }
      }
      return;
    }

    let pos = UI.screenToBoard(UI.pointer);
    let tile = this.game.board.getTileAt(pos.x, pos.y);

    if (tile?.isEmpty()) {
      let pos = UI.boardToScreen(tile);
      card.offsetX = pos.x - card.bounds.x;
      card.offsetY = pos.y - card.bounds.y;
      card.opacity = 0.5;
    } else {
      card.offsetX = UI.pointer.x - this.dragOriginX;
      card.offsetY = UI.pointer.y - this.dragOriginY;
      card.opacity = 1;
    }

    if (!UI.pointer.isDown()) {
      this.draggingCard = undefined;

      card.opacity = 1;

      if (tile?.isEmpty()) {
        this.game.board.addActionsBottom(new PlayCard(card, tile));
      } else {
        // Otherwise go back to the hand.
        card.offsetX = 0;
        card.offsetY = 0;
      }
    }
  }

  render() {
    UI.activeGameInfo?.render(UI.LEFT_PANEL);

    this.leaveButton.render();
    this.goldButton.render();
    this.feathersButton.render();
    this.deckButton.render();

    drawFrame(Sprites.panel, UI.RIGHT_PANEL);
    UI.cardInfo?.render(UI.RIGHT_PANEL);

    drawFrame(Sprites.panel_worn, UI.CENTER_PANEL);
    this.renderBoard();

    this.renderPiles();
    this.renderHand();
    this.endTurnButton.render();
    this.renderPileCards();
  }

  renderPiles() {
    drawFrame(Sprites.panel_pile, UI.DRAW_PILE);
    this.renderCardStack(
      Sprites.stack_draw,
      UI.DRAW_PILE,
      this.game.board.drawPile.size,
    );

    drawFrame(Sprites.panel_pile, UI.DISCARD_PILE);
    this.renderCardStack(
      Sprites.stack_discard,
      UI.DISCARD_PILE,
      this.game.board.discardPile.size,
    );

    if (this.game.board.gravePile.size > 0) {
      drawFrame(Sprites.panel, UI.GRAVE_PILE);
      this.renderCardStack(
        Sprites.stack_grave,
        UI.GRAVE_PILE,
        this.game.board.gravePile.size,
      );
    }
  }

  /**
   * @param {Sprite} sprite
   * @param {Rectangle} bounds
   * @param {number} size
   */
  renderCardStack(sprite, bounds, size) {
    let gap = 2;
    let maxStackSize = 5;
    let cardsPerSlice = 5;
    let stackSize = Math.min(Math.ceil(size / cardsPerSlice), maxStackSize);

    if (stackSize === 0) {
      drawSprite(Sprites.stack_empty, bounds.x, bounds.y);
    }

    for (let i = 0; i < stackSize; i++) {
      drawSprite(sprite, bounds.x, bounds.y - i * gap);
    }

    TextStyle.save();
    TextStyle.align = "center";
    TextStyle.baseline = "middle";
    writeLine(`${size}`, bounds.center.x, bounds.y + bounds.h);
    TextStyle.restore();
  }

  /**
   * @private
   * Render the cards that are in the various piles. This is necessary so that
   * you see the cards animating towards the piles.
   */
  renderPileCards() {
    for (let card of this.game.board.drawPile) {
      card.render();
    }

    for (let card of this.game.board.discardPile) {
      card.render();
    }

    for (let card of this.game.board.gravePile) {
      card.render();
    }
  }

  renderBoard() {
    for (let tile of this.game.board.tiles) {
      let x = UI.BOARD.x + gridToPixel(tile.x);
      let y = UI.BOARD.y + gridToPixel(tile.y);
      drawSprite(Sprites.tile_empty, x, y);

      if (tile.card) {
        tile.card.render();
      }
    }
  }

  renderHand(bounds = UI.HAND) {
    this.handPanel.render();

    for (let i = 0; i < this.game.board.hand.length; i++) {
      let x = bounds.x + gridToPixel(i);
      let y = bounds.y;
      drawSprite(Sprites.tile_empty, x, y);
    }

    for (let card of this.game.board.hand) {
      card?.render();
    }
  }
}
