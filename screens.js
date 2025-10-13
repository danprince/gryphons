// @ts-check

import { PlayCard } from "./actions.js";
import {
  ctx,
  drawSprite,
  TextStyle,
  writeLine,
  gridToPixel,
  Timer,
  pixelToGrid,
} from "./engine.js";
import { UI, GameInfo, Screen, alignToRow, drawFrame } from "./ui.js";
import { Rectangle, lerp, required } from "./utils.js";
import * as Sprites from "./sprites.js";
import {
  CardStackButton,
  CounterButton,
  Panel,
  SpriteButton,
  TextButton,
} from "./elements.js";

/**
 * @import { Card, Game, Pile } from "./game.js";
 * @import { Sprite } from "./sprites.js";
 */

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

  leaveButton = new CounterButton({
    sprite: Sprites.button_leave,
    onClick: () => UI.navigate(new MenuScreen(this.game)),
  });

  goldButton = new CounterButton({
    sprite: Sprites.button_gold,
    getCounter: () => this.game.gold,
  });

  feathersButton = new CounterButton({
    sprite: Sprites.button_feather,
    getCounter: () => this.game.feathers,
  });

  deckButton = new CounterButton({
    sprite: Sprites.button_deck,
    getCounter: () => this.game.deck.size,
    onClick: () =>
      UI.navigate(
        new CardPileScreen({
          pile: this.game.deck,
          title: "Deck",
          description: "These are the cards in your deck",
          previousScreen: this,
        }),
      ),
  });

  drawStackButton = new CardStackButton({
    label: "Draw",
    cardBackSprite: Sprites.stack_draw,
    bounds: UI.DRAW_PILE,
    onClick: () =>
      UI.navigate(
        new CardPileScreen({
          pile: this.game.board.drawPile,
          title: "Draw",
          description: "These are the cards in your draw pile",
          previousScreen: this,
        }),
      ),
  });

  discardStackButton = new CardStackButton({
    label: "Disc.",
    cardBackSprite: Sprites.stack_discard,
    bounds: UI.DISCARD_PILE,
    onClick: () =>
      UI.navigate(
        new CardPileScreen({
          pile: this.game.board.discardPile,
          title: "Discard",
          description: "These are the cards in your discard pile",
          previousScreen: this,
        }),
      ),
  });

  graveStackButton = new CardStackButton({
    label: "Grave",
    cardBackSprite: Sprites.stack_grave,
    bounds: UI.GRAVE_PILE,
    onClick: () =>
      UI.navigate(
        new CardPileScreen({
          pile: this.game.board.gravePile,
          title: "Grave",
          description: "These are the cards in your grave pile",
          previousScreen: this,
        }),
      ),
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

  endTurnButton = new TextButton({
    label: "END TURN",
    x: UI.END_TURN_BUTTON.x,
    y: UI.END_TURN_BUTTON.y,
    onClick: () => this.game.endTurn(),
  });

  handPanel = new Panel({
    sprite: Sprites.panel_hand,
    bounds: UI.HAND.clone().grow(3),
    backgroundColor: "black",
  });

  tablePanel = new Panel({
    sprite: Sprites.panel_table,
    bounds: UI.TABLE,
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

  /**
   * @param {number} dt
   */
  update(dt) {
    this.game.board.update(dt);

    this.leaveButton.update();
    this.goldButton.update();
    this.feathersButton.update();
    this.deckButton.update();

    this.drawStackButton.size = this.game.board.drawPile.size;
    this.drawStackButton.update();

    this.discardStackButton.size = this.game.board.discardPile.size;
    this.discardStackButton.update();

    this.graveStackButton.size = this.game.board.gravePile.size;
    this.graveStackButton.update();

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

    this.tablePanel.render();
    this.renderPiles();
    this.renderHand();
    this.renderHandCards();
    this.renderPileCards();

    this.endTurnButton.render();
  }

  renderPiles() {
    this.drawStackButton.render();
    this.discardStackButton.render();
    this.graveStackButton.render();
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
  }

  renderHandCards() {
    for (let card of this.game.board.hand) {
      card?.render();
    }
  }
}

export class CardPileScreen extends Screen {
  /**
   * @type {Card[]}
   */
  cards = [];

  /**
   * @private
   * @type {Rectangle}
   */
  CARD_AREA = UI.CENTER_PANEL.clone().grow(-gridToPixel(1));

  /**
   * @private
   */
  backButton = new TextButton({
    label: "BACK",
    x: UI.BACK_BUTTON.x,
    y: UI.BACK_BUTTON.y,
    onClick: () => UI.navigate(this.previousScreen),
  });

  /**
   * @param {object} config
   * @param {Pile} config.pile
   * @param {string} config.title
   * @param {string} config.description
   * @param {Screen} config.previousScreen
   */
  constructor(config) {
    super();
    this.pile = config.pile;
    this.title = config.title;
    this.description = config.description;
    this.previousScreen = config.previousScreen;
  }

  enter() {
    // Copy the cards from the pile so that we can set with their bounds and
    // visibility without messing up the board's game state.
    this.cards = [...this.pile].map((card) => card.copy());

    let cardsPerRow = pixelToGrid(this.CARD_AREA.w);

    for (let i = 0; i < this.cards.length; i++) {
      let card = required(this.cards[i]);
      let x = i % cardsPerRow;
      let y = Math.floor(i / cardsPerRow);
      card.bounds.x = this.CARD_AREA.x + gridToPixel(x);
      card.bounds.y = this.CARD_AREA.y + gridToPixel(y);
    }
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.backButton.update();

    for (let card of this.cards) {
      card.update(dt);
    }
  }

  render() {
    drawFrame(Sprites.panel, UI.CENTER_PANEL);

    if (UI.cardInfo) {
      drawFrame(Sprites.panel, UI.RIGHT_PANEL);
      UI.cardInfo.render(UI.RIGHT_PANEL);
    }

    for (let card of this.cards) {
      card.render();
    }

    this.backButton.render();
  }
}
