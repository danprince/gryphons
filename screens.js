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
import { UI, GameInfo, Screen, alignToRow, drawFrame, Drag } from "./ui.js";
import { Rectangle, assert, easeInOut, lerp, required } from "./utils.js";
import * as Sprites from "./sprites.js";
import {
  CardStackButton,
  CounterButton,
  Panel,
  SpriteButton,
  TextButton,
  UIElement,
} from "./elements.js";
import { Board, Card, Game } from "./game.js";
import { Chest, ChestOpen, Monster } from "./cards.js";
import {
  generateBoard,
  generateCardRewards,
  STARTING_DECK,
} from "./campaign.js";

/**
 * @import { CardType, Pile } from "./game.js";
 * @import { Sprite } from "./sprites.js";
 */

class MenuScreenButton extends SpriteButton {
  /**
   * @param {object} config
   * @param {string} config.label
   * @param {Sprite} config.sprite
   * @param {Sprite} [config.hoverSprite]
   * @param {Sprite} [config.activeSprite]
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
    onClick: () => this.startNewGame(),
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

  startNewGame() {
    this.game.deck.addToTop(...STARTING_DECK.map((type) => new Card(type)));
    this.game.board = generateBoard(this.game);
    this.game.startRound();
    UI.navigate(new BoardScreen(this.game));
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
  /**
   * @private
   */
  drag = new Drag();

  info = new GameInfo({
    name: "Hunt",
    get description() {
      return `Level ${
        Game.current.level + 1
      }: Remove all the gryphons from this roost before running out of cards!`;
    },
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
    bounds: UI.HAND.grow(3),
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

    let hasMonsters = this.game.board.tiles.some(
      (tile) =>
        tile.card?.type.category === Monster &&
        // TODO: This is probably a sign that chests shouldn't be
        // implemented as monsters, just need some other system for
        // saying they are attackable then.
        (tile.card.type !== Chest || tile.card.type !== ChestOpen),
    );

    if (!hasMonsters) {
      return UI.navigate(new VictoryScreen(this.game));
    }

    if (
      this.game.board.drawPile.isEmpty() &&
      this.game.board.discardPile.isEmpty() &&
      this.game.board.isHandEmpty()
    ) {
      return UI.navigate(new DefeatScreen(this.game));
    }
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
    this.drag.update();

    let card = this.draggingCard;

    if (!card) {
      for (let card of this.game.board.hand) {
        if (card?.isPressed()) {
          this.drag.begin();
          this.draggingCard = card;
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
      card.offsetX = this.drag.deltaX;
      card.offsetY = this.drag.deltaY;
      card.opacity = 1;
    }

    if (this.drag.isReleased()) {
      this.draggingCard = undefined;
      this.drag.end();

      card.opacity = 1;

      if (tile?.isEmpty()) {
        this.game.board.addActionsBottom(new PlayCard(card, tile));
      } else {
        let { offsetX, offsetY } = card;
        card.interactive = false;

        // Otherwise go back to the hand.
        Timer.global({
          duration: 200,
          update(t) {
            let k = easeInOut(t);
            card.offsetX = lerp(offsetX, 0, k);
            card.offsetY = lerp(offsetY, 0, k);
          },
          done() {
            card.interactive = true;
          },
        });
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
  CARD_AREA = UI.CENTER_PANEL.grow(-gridToPixel(1));

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
    this.columns = pixelToGrid(this.CARD_AREA.w);
    this.rows = pixelToGrid(this.CARD_AREA.h);
  }

  enter() {
    // Copy the cards from the pile so that we can set with their bounds and
    // visibility without messing up the board's game state.
    this.cards = [...this.pile].map((card) => card.copy());

    for (let i = 0; i < this.cards.length; i++) {
      let card = required(this.cards[i]);
      let x = i % this.columns;
      let y = Math.floor(i / this.columns);
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
    drawFrame(Sprites.panel_table, this.CARD_AREA.grow(3));

    if (UI.cardInfo) {
      drawFrame(Sprites.panel, UI.RIGHT_PANEL);
      UI.cardInfo.render(UI.RIGHT_PANEL);
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        drawSprite(
          Sprites.tile_empty,
          this.CARD_AREA.x + gridToPixel(x),
          this.CARD_AREA.y + gridToPixel(y),
        );
      }
    }

    for (let card of this.cards) {
      card.render();
    }

    this.backButton.render();
  }
}

export class ShopScreenItem extends UIElement {
  /**
   * @private
   */
  get game() {
    return Game.current;
  }

  /**
   * @param {object} config
   * @param {number} config.x
   * @param {number} config.y
   * @param {Card} config.card
   * @param {number} config.cost
   */
  constructor(config) {
    let bounds = new Rectangle(
      config.x,
      config.y,
      gridToPixel(1),
      gridToPixel(2),
    );

    super({ bounds });

    this.cost = config.cost;
    this.available = true;

    this.card = config.card;
    this.card.visible = true;
    this.card.bounds.x = this.bounds.x;
    this.card.bounds.y = this.bounds.y;

    this.button = new TextButton({
      label: `\u0080 ${this.cost}`,
      x: this.bounds.x,
      y: this.card.bounds.y1,
      padding: 3,
      onClick: () => this.buy(),
    });

    this.button.bounds.x = this.bounds.center.x - this.button.bounds.w / 2;
  }

  buy() {
    assert(this.canBuy());
    this.game.deck.addToTop(this.card);
    this.available = false;
    this.card.opacity = 0.4;
  }

  canBuy() {
    return this.available && this.cost <= this.game.gold;
  }

  /**
   *
   * @param {number} dt
   */
  update(dt) {
    this.card.update(dt);
    this.button.update();

    if (this.card.isPressed() && this.canBuy()) {
      this.buy();
    }

    if (this.button.isHovered()) {
      UI.inspectCard(this.card);
    }

    this.button.disabled = !this.canBuy();
  }

  isHovered() {
    return this.card.isHovered() || this.button.isHovered();
  }

  render() {
    if (this.canBuy() && this.isHovered()) {
      let bounds = this.card.bounds.grow(3);
      drawFrame(Sprites.panel_shop_select, bounds);
    } else if (this.canBuy()) {
      let bounds = this.card.bounds.grow(3);
      drawFrame(Sprites.panel_shop, bounds);
    }

    this.card.render();
    this.button.render();
  }
}

export class ShopScreen extends GameScreen {
  LEFT_PANEL = UI.LEFT_PANEL;
  CENTER_PANEL = UI.CENTER_PANEL;
  STOCK_GRID = this.CENTER_PANEL.shrink(gridToPixel(1));
  RIGHT_PANEL = UI.RIGHT_PANEL;
  COLUMNS = 4;
  ROWS = 4;
  GAP = 1;

  info = new GameInfo({
    name: "Shop",
    description: "This is where you buy cards",
    bannerSprite: Sprites.banner_victory,
  });

  /**
   * @private
   * @type {ShopScreenItem[]}
   */
  items = [];

  /**
   * @private
   */
  doneButton = new TextButton({
    label: "DONE",
    x: gridToPixel(8),
    y: this.CENTER_PANEL.y1,
    onClick: () => this.done(),
  });

  /**
   * @param {object} config
   * @param {CardType[]} config.cardTypes
   */
  constructor(config) {
    super(Game.current);
    this.cardsTypes = config.cardTypes;

    this.items = this.cardsTypes.map((type, index) => {
      let x = (index % this.COLUMNS) * 2;
      let y = Math.floor(index / this.COLUMNS) * 2;

      return new ShopScreenItem({
        x: this.STOCK_GRID.x + gridToPixel(x),
        y: this.STOCK_GRID.y + gridToPixel(y),
        card: new Card(type),
        cost: 0,
      });
    });
  }

  /**
   * @private
   */
  done() {
    let game = Game.current;
    this.game.board = generateBoard(this.game);
    game.startRound();
    UI.navigate(new BoardScreen(game));
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    super.update(dt);

    this.goldButton.update();
    this.feathersButton.update();
    this.deckButton.update();
    this.leaveButton.update();

    this.doneButton.update();

    for (let item of this.items) {
      item.update(dt);
    }
  }

  render() {
    drawFrame(Sprites.panel, this.LEFT_PANEL);
    drawFrame(Sprites.panel, this.RIGHT_PANEL);
    UI.cardInfo?.render(this.RIGHT_PANEL);
    UI.activeGameInfo?.render(this.LEFT_PANEL);

    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLUMNS; x++) {
        drawSprite(
          Sprites.ui_tile_empty,
          this.STOCK_GRID.x + gridToPixel(x * 2),
          this.STOCK_GRID.y + gridToPixel(y * 2),
        );
      }
    }

    this.goldButton.render();
    this.feathersButton.render();
    this.deckButton.render();
    this.leaveButton.render();

    drawFrame(Sprites.panel_shop, this.CENTER_PANEL);
    drawSprite(
      Sprites.shop_title,
      this.CENTER_PANEL.center.x,
      this.CENTER_PANEL.y,
    );

    for (let item of this.items) {
      item.render();
    }

    this.doneButton.render();
  }
}

export class DefeatScreen extends GameScreen {
  continueButton = new TextButton({
    label: "CONTINUE",
    x: UI.END_TURN_BUTTON.x,
    y: UI.END_TURN_BUTTON.y,
    onClick: () => {
      // TODO: Implement a less hacky reset.
      this.game.gold = 0;
      this.game.feathers = 0;
      UI.navigate(new MenuScreen(this.game));
    },
  });

  update() {
    this.continueButton.update();
  }

  render() {
    TextStyle.save();
    TextStyle.baseline = "top";
    TextStyle.align = "center";
    writeLine("Defeat", UI.BOARD.center.x, 10);
    TextStyle.restore();

    for (let tile of this.game.board.tiles) {
      let x = UI.BOARD.x + gridToPixel(tile.x);
      let y = UI.BOARD.y + gridToPixel(tile.y);
      drawSprite(Sprites.tile_empty, x, y);

      if (tile.card) {
        tile.card.render();
      }
    }

    this.continueButton.render();
  }
}
export class VictoryScreen extends GameScreen {
  continueButton = new TextButton({
    label: "CONTINUE",
    x: UI.END_TURN_BUTTON.x,
    y: UI.END_TURN_BUTTON.y,
    onClick: () => {
      let rewards = generateCardRewards(this.game);
      let shop = new ShopScreen({ cardTypes: rewards });
      UI.navigate(shop);
    },
  });

  /**
   * @param {number} dt
   */
  update(dt) {
    this.continueButton.update();
    this.game.board.update(dt);
  }

  render() {
    TextStyle.save();
    TextStyle.baseline = "top";
    TextStyle.align = "center";
    writeLine("Victory!", UI.BOARD.center.x, 10);
    TextStyle.restore();

    for (let tile of this.game.board.tiles) {
      let x = UI.BOARD.x + gridToPixel(tile.x);
      let y = UI.BOARD.y + gridToPixel(tile.y);
      drawSprite(Sprites.tile_empty, x, y);

      if (tile.card) {
        tile.card.render();
      }
    }

    this.continueButton.render();
  }
}
