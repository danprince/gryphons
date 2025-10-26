import {
  ctx,
  drawNineSlice,
  drawSprite,
  TextStyle,
  Timer,
  gridToPixel,
  writeLine,
  writeText,
  clear,
  resize,
  start,
  canvas,
  pixelToGrid,
  screenToGrid,
} from "./engine.js";
import {
  assert,
  clamp,
  easeInOut,
  lerp,
  randomItem,
  Rectangle,
  removeFromArray,
  splitSprite,
} from "./utils.js";
import * as Sprites from "./sprites.js";
import { Card, Game } from "./game.js";

/**
 * @import { Point } from "./utils.js";
 * @import { Sprite, NineSliceSprite } from "./sprites.js";
 */

export const Colors = {
  white: "#ffffff",
  black: "#000000",
  bone: "#e3d5c5",
  turtle: "#504237",
  waterfall: "#30be9f",
  red: "#bf4848",
  eiffel: "#9b8d7e",
  kombucha: "#d9a066",
  sepia: "#704517",
  jet: "#383535",
};

/**
 * Create a rectangle in pixel coordinates, given grid coordinates.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {Rectangle}
 */
export function GRID_RECT(x, y, w, h) {
  return new Rectangle(
    gridToPixel(x),
    gridToPixel(y),
    gridToPixel(w),
    gridToPixel(h),
  );
}

export const UI = {
  GRID: GRID_RECT(0, 0, 17, 11),
  LEFT_PANEL: GRID_RECT(0, 1, 4, 8),
  CENTER_PANEL: GRID_RECT(4, 1, 9, 9),
  RIGHT_PANEL: GRID_RECT(13, 1, 4, 9),
  LEFT_TRAY: GRID_RECT(0, 9, 4, 1),
  RIGHT_TRAY: GRID_RECT(13, 9, 4, 1),
  BOARD: GRID_RECT(5, 2, 7, 6),
  HAND: GRID_RECT(6, 9, 5, 1),
  TABLE: GRID_RECT(4, 9, 9, 1),
  DRAW_PILE: GRID_RECT(5, 9, 1, 1),
  DISCARD_PILE: GRID_RECT(11, 9, 1, 1),
  GRAVE_PILE: GRID_RECT(12, 9, 1, 1),
  END_TURN_BUTTON: GRID_RECT(8, 10, 2, 1),
  BACK_BUTTON: GRID_RECT(8, 10, 2, 1),

  /**
   * Track whether the UI needs to refresh during the next frame.
   */
  needsRender: true,

  /**
   * Whether or not to show debug information.
   */
  debug: false,

  /**
   *
   */
  pointer: {
    x: 0,
    y: 0,
    buttons: 0,
    prevButtons: 0,
    isPressed() {
      return this.buttons === 1 && this.prevButtons === 0;
    },
    isDown() {
      return this.buttons === 1;
    },
  },

  screenshakeTimer: 0,

  /**
   * @type {Screen | undefined}
   */
  currentScreen: undefined,

  /**
   * @type {boolean}
   */
  isNavigating: false,

  /**
   * @type {GameInfo | undefined}
   */
  currentGameInfo: undefined,

  /**
   * @type {GameInfo | undefined}
   */
  tempGameInfo: undefined,

  /**
   * @type {CardInfo | undefined}
   */
  cardInfo: undefined,

  get activeGameInfo() {
    return this.tempGameInfo ?? this.currentGameInfo;
  },

  /**
   * @param {Screen} screen
   */
  init(screen) {
    resize(UI.GRID.w, UI.GRID.h);
    this.navigate(screen);
    this.addEventListeners();
    start((dt) => UI.update(dt));
  },

  addEventListeners() {
    /**
     * @param {PointerEvent} event
     */
    const handlePointerEvent = (event) => {
      let bounds = canvas.getBoundingClientRect();
      let scaleX = bounds.width / canvas.width;
      let scaleY = bounds.height / canvas.height;
      let canvasX = (event.clientX - bounds.x) / scaleX;
      let canvasY = (event.clientY - bounds.y) / scaleY;
      this.pointer.x = Math.floor(canvasX);
      this.pointer.y = Math.floor(canvasY);
      this.pointer.buttons = event.buttons;
      this.needsRender = true;
    };

    /**
     * @param {UIEvent} event
     */
    const handleResizeEvent = (event) => {
      resize(canvas.width, canvas.height);
      this.render();
    };

    /**
     *
     * @param {KeyboardEvent} event
     */
    const handleKeyDownEvent = (event) => {
      if (event.key === "D") {
        this.debug = !this.debug;
        this.needsRender = true;
      }
    };

    addEventListener("keydown", handleKeyDownEvent);
    addEventListener("pointermove", handlePointerEvent);
    addEventListener("pointerdown", handlePointerEvent);
    addEventListener("pointerup", handlePointerEvent);
    addEventListener("resize", handleResizeEvent);
  },

  /**
   * @param {number} duration
   */
  screenshake(duration = 100) {
    this.screenshakeTimer = Math.max(duration, this.screenshakeTimer);
  },

  /**
   * @param {Card} card
   */
  inspectCard(card) {
    this.cardInfo = new CardInfo(card);
  },

  /**
   * @param {GameInfo} info
   */
  showGameInfo(info) {
    this.currentGameInfo = info;
  },

  /**
   * @param {GameInfo} info
   */
  previewGameInfo(info) {
    this.tempGameInfo = info;
  },

  /**
   * @param {Point} pos
   * @returns {Point}
   */
  screenToBoard(pos) {
    return {
      x: Math.floor(pixelToGrid(pos.x - this.BOARD.x)),
      y: Math.floor(pixelToGrid(pos.y - this.BOARD.y)),
    };
  },

  /**
   * @param {Point} pos
   * @returns {Point}
   */
  boardToScreen(pos) {
    return {
      x: this.BOARD.x + gridToPixel(pos.x),
      y: this.BOARD.y + gridToPixel(pos.y),
    };
  },

  /**
   * Navigate to a new screen.
   * @param {Screen} screen
   */
  async navigate(screen) {
    if (this.isNavigating) return;

    this.isNavigating = true;
    let previousScreen = this.currentScreen;
    let currentScreen = screen;
    await previousScreen?.exit();
    this.needsRender = true;
    this.currentScreen = currentScreen;
    this.isNavigating = false;
    await currentScreen.enter();
    this.needsRender = true;
  },

  /**
   * @param {number} dt
   */
  update(dt) {
    this.cardInfo = undefined;
    this.tempGameInfo = undefined;
    this.currentScreen?.update(dt);
    this.needsRender ||= Timer.timers.length > 0;
    this.needsRender ||= VFX.animations.length > 0;
    this.needsRender ||= this.screenshakeTimer > 0;
    VFX.update(dt);
    Timer.update(dt);
    Message.update(dt);

    if (this.screenshakeTimer > 0) {
      this.screenshakeTimer -= dt;
    }

    if (this.needsRender) {
      this.needsRender = false;
      this.render();
    }

    this.pointer.prevButtons = this.pointer.buttons;
  },

  render() {
    clear();

    let shake = this.screenshakeTimer > 0;

    if (shake) {
      let x = randomItem([-1, 0, 1]);
      let y = randomItem([-1, 0, 1]);
      ctx.save();
      ctx.translate(x, y);
    }

    this.currentScreen?.render();
    VFX.render();
    Message.render();

    if (shake) {
      ctx.restore();
    }

    if (this.debug) {
      this.renderDebug();
    }
  },

  renderDebug() {
    let gridPos = screenToGrid(this.pointer);
    let boardPos = UI.screenToBoard(this.pointer);
    let tile = Game.current.board.getTileAt(boardPos.x, boardPos.y);
    let board = Game.current.board;
    let log = Debug.log;

    Debug.clear();
    log(Colors.eiffel, "DEBUG");
    log();

    log(Colors.turtle, "pointer");
    log(Colors.white, `${this.pointer.x} ${this.pointer.y}`);
    log();

    log(Colors.turtle, "grid");
    log(Colors.white, `${gridPos.x | 0} ${gridPos.y | 0}`);
    log();

    log(Colors.turtle, "board");
    log(Colors.white, `${boardPos.x} ${boardPos.y}`);
    log();

    log(Colors.turtle, "hand");
    for (let card of board.hand) {
      if (card) {
        log(Colors.white, `${card.type.name} (${card.counter})`);
      } else {
        log(Colors.eiffel, "---");
      }
    }
    log();

    log(Colors.turtle, "card");
    if (tile?.card) {
      let card = tile.card;
      log(Colors.white, `${card.type.name} (${card.counter})`);
    } else {
      log(Colors.eiffel, "---");
    }

    Debug.render();
  },
};

export class Message {
  /**
   * @private
   */
  static global = new Message();

  /**
   * @param {string} text
   */
  static show(text) {
    this.global.show(text);
  }

  /**
   * @param {number} dt
   */
  static update(dt) {
    this.global.update(dt);
  }

  static render() {
    this.global.render();
  }

  timer = 0;
  opacity = 1;
  text = "";
  bounds = new Rectangle();
  visible = false;

  /**
   * @param {number} dt
   */
  update(dt) {
    this.timer -= dt;

    if (this.timer <= 0 && this.visible) {
      this.hide();
    }
  }

  /**
   * @param {string} text
   */
  async show(text) {
    this.text = text;
    this.visible = true;
    this.timer = 3000;
    let [w, h] = TextStyle.measure(text);
    this.bounds.w = w;
    this.bounds.h = h;
    this.bounds.x = UI.HAND.center.x - this.bounds.w / 2;
    this.bounds.y = UI.HAND.y + UI.HAND.h - this.bounds.h / 2;
    this.bounds = this.bounds.grow(3);

    let y0 = this.bounds.y + 10;
    let y1 = this.bounds.y;

    await Timer.promise(300, (t) => {
      let k = easeInOut(t);
      this.bounds.y = lerp(y0, y1, k);
      this.opacity = lerp(0, 1, k * 2);
    });
  }

  async hide() {
    let y0 = this.bounds.y;
    let y1 = this.bounds.y + 10;
    this.visible = false;

    await Timer.promise(300, (t) => {
      let k = easeInOut(t);
      this.bounds.y = lerp(y0, y1, k);
      this.opacity = lerp(1, 0, k);
    });
  }

  render() {
    if (!this.visible || this.opacity === 0) return;
    ctx.globalAlpha = this.opacity;
    drawFrame(Sprites.panel, this.bounds);
    TextStyle.save();
    TextStyle.align = "center";
    TextStyle.baseline = "middle";
    writeLine(this.text, this.bounds.center.x, this.bounds.center.y);
    TextStyle.restore();
    ctx.globalAlpha = this.opacity;
  }
}

export class Screen {
  /**
   * Called when the screen enters. If you return a promise then it should
   * resolve when the screen finishes animating in.
   * @return {void | Promise<void>}
   */
  enter() {}
  /**
   * Called when the screen exits. If you return a promise then it should
   * resolve when the screen finishes animating out.
   * @return {void | Promise<void>}
   */
  exit() {}
  /**
   * Called every frame.
   * @param {number} dt The number of milliseconds since the last update.
   */
  update(dt) {}
  /**
   * Called whenever the screen needs to redraw.
   */
  render() {}
}

/**
 * @typedef {object} Box
 * @prop {Rectangle} bounds
 */

/**
 * @param {Point} point
 * @param {...Box} boxes
 */
export function alignToRow({ x, y }, ...boxes) {
  for (let box of boxes) {
    box.bounds.x = x;
    box.bounds.y = y;
    x += box.bounds.w;
  }
}

/**
 * @param {NineSliceSprite} sprite
 * @param {Rectangle} rect
 */
export function drawFrame(sprite, rect) {
  drawNineSlice(sprite, rect.x, rect.y, rect.w, rect.h);
}

export class GameInfo {
  /**
   * @param {object} config
   * @param {string} config.name
   * @param {string} config.description
   * @param {Sprite} [config.bannerSprite]
   * @param {NineSliceSprite} [config.panelSprite]
   */
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.bannerSprite = config.bannerSprite;
    this.panelSprite = config.panelSprite;
  }

  /**
   * @param {Rectangle} bounds
   */
  render(bounds) {
    let y = bounds.y;

    if (this.panelSprite) {
      drawFrame(this.panelSprite, bounds);
    }

    if (this.bannerSprite) {
      drawSprite(this.bannerSprite, bounds.x, y);
      y += this.bannerSprite.height;
    }

    TextStyle.save();

    TextStyle.align = "center";
    y += writeLine(this.name, bounds.center.x, y);

    TextStyle.align = "center";
    TextStyle.color = Colors.eiffel;
    y += writeText(this.description, bounds.center.x, y, bounds.w);

    TextStyle.restore();
  }
}

export class CardInfo {
  /**
   * @param {Card} card
   */
  constructor(card) {
    this.card = card;
  }

  /**
   * @param {Rectangle} bounds
   */
  render(bounds) {
    let { card } = this;
    let { x, y, w } = bounds.grow(-5);
    let gap = 5;

    TextStyle.save();

    drawSprite(Sprites.banner_monster, bounds.x, bounds.y);
    y += gap;

    let sprite = card.type.sprite;
    drawSprite(sprite, bounds.center.x - sprite.width / 2, y);
    y += sprite.height + gap;

    TextStyle.align = "center";
    y += writeLine(card.type.name, bounds.center.x, y);

    if (card.type.category.name) {
      TextStyle.align = "center";
      TextStyle.color = Colors.eiffel;
      y += writeLine(card.type.category.name, bounds.center.x, y);
    }

    y += gap;

    if (card.type.description) {
      TextStyle.align = "left";
      TextStyle.color = Colors.eiffel;
      y += writeText(card.type.description, x, y, w);
      y += gap;
    }

    y += gap;

    for (let [trigger, effect] of card.type.effects.items) {
      if (effect.description) {
        TextStyle.align = "left";
        TextStyle.color = Colors.eiffel;
        y += writeLine(trigger.name, x, y + 1) + 2;

        TextStyle.color = Colors.white;
        y += writeText(effect.description, x, y, w);
        y += gap;
      }
    }

    TextStyle.restore();
  }
}

/**
 * @typedef {object} SpriteAnimation
 * @prop {number} x
 * @prop {number} y
 * @prop {Sprite[]} sprites
 * @prop {number} duration
 * @prop {number} elapsed
 * @prop {number} frame
 */

export class VFX {
  static slash = new VFX(Sprites.vfx_slash);
  static claw = new VFX(Sprites.vfx_claw);
  static heal = new VFX(Sprites.vfx_heal);
  static magic = new VFX(Sprites.vfx_magic);
  static burn = new VFX(Sprites.vfx_burn);
  static bump = new VFX(Sprites.vfx_bump);

  /**
   * @type {SpriteAnimation[]}
   */
  static animations = [];

  /**
   * @param {VFX} vfx
   * @param {number} x
   * @param {number} y
   */
  static play(vfx, x, y) {
    this.animations.push({
      x,
      y,
      frame: 0,
      elapsed: 0,
      sprites: vfx.sprites,
      duration: vfx.duration,
    });
  }

  /**
   *
   * @param {number} dt
   */
  static update(dt) {
    for (let anim of this.animations) {
      let progress = clamp(0, 1, anim.elapsed / anim.duration);

      anim.elapsed += dt;
      anim.frame = Math.floor(progress * (anim.sprites.length - 1));

      if (anim.elapsed > anim.duration) {
        removeFromArray(this.animations, anim);
      }
    }
  }

  static render() {
    for (let anim of this.animations) {
      let sprite = anim.sprites[anim.frame];
      if (sprite) {
        drawSprite(sprite, anim.x, anim.y);
      }
    }
  }

  /**
   * @param {Sprite} sprite
   * @param {number} [duration]
   */
  constructor(sprite, duration) {
    this.sprites = splitSprite(sprite, sprite.height, sprite.height);
    this.duration = duration || this.sprites.length * 100;
    assert(this.sprites.length > 0);
  }
}

const Debug = {
  bounds: UI.LEFT_PANEL.clone(),

  /**
   * @type {[color: string, text: string][]}
   * @private
   */
  lines: [],

  /**
   * @param {string} color
   * @param {string} text
   */
  log(color = Colors.white, text = "") {
    Debug.lines.push([color, text]);
  },

  clear() {
    this.lines = [];
  },

  render() {
    this.renderGrid();
    this.renderPointer();
    this.renderLog();
  },

  renderLog() {
    let font = TextStyle.font;
    let padding = 5;

    drawFrame(Sprites.panel, this.bounds);

    TextStyle.save();
    TextStyle.align = "left";
    TextStyle.baseline = "top";
    let x = this.bounds.x + padding;
    let y = this.bounds.y + padding;

    for (let [color, text] of this.lines) {
      TextStyle.color = color;
      writeLine(text, x, y);
      y += font.lineHeight;
    }

    TextStyle.restore();
  },

  renderGrid() {
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "blue";
    ctx.translate(0.5, 0.5);
    for (let y = UI.GRID.y0; y < UI.GRID.y1; y += gridToPixel(1)) {
      ctx.moveTo(UI.GRID.x0, y);
      ctx.lineTo(UI.GRID.x1, y);
    }
    for (let x = UI.GRID.x0; x < UI.GRID.x1; x += gridToPixel(1)) {
      ctx.moveTo(x, UI.GRID.y0);
      ctx.lineTo(x, UI.GRID.y1);
    }
    ctx.stroke();
    ctx.restore();
  },

  renderPointer() {
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "white";
    ctx.translate(0.5, 0.5);
    ctx.moveTo(UI.GRID.x0, UI.pointer.y);
    ctx.lineTo(UI.GRID.x1, UI.pointer.y);
    ctx.moveTo(UI.pointer.x, UI.GRID.y0);
    ctx.lineTo(UI.pointer.x, UI.GRID.y1);
    ctx.stroke();
    ctx.restore();
  },
};

export class Drag {
  /**
   * Whether or not to allow "tap A then tap B" style drag (easier for
   * trackpads and touch devices).
   */
  tapDraggingEnabled = true;

  /**
   * Whether the user is currently tap dragging.
   */
  isTapDragging = true;

  /**
   * The max delay (in milliseconds) that the pointer can be down for before it
   * can't be considered to be a tap drag.
   */
  tapDraggingMaxDelay = 250;

  /**
   * The max distance (in pixels) that the pointer can move before it can't be
   * considered a to be a tap drag.
   */
  tapDraggingMaxDistance = 3;

  /**
   * Whether the drag is currently active.
   */
  isActive = false;

  /**
   * The x coordinate where the drag started.
   */
  originX = 0;

  /**
   * The y coordinate where the drag started.
   */
  originY = 0;

  /**
   * The x distance since the drag started.
   */
  deltaX = 0;

  /**
   * The y distance since the drag started.
   */
  deltaY = 0;

  /**
   * The time (in ms) that the drag started at.
   */
  startTime = 0;

  isReleased() {
    if (this.isTapDragging) {
      // If this is a tap style drag then the second press ends the drag.
      return UI.pointer.isPressed();
    } else {
      // If this is a regular drag then releasing the pointer ends the drag.
      return !UI.pointer.isDown();
    }
  }

  begin() {
    assert(!this.isActive);
    this.isActive = true;
    this.isTapDragging = false;
    this.originX = UI.pointer.x;
    this.originY = UI.pointer.y;
    this.startTime = Date.now();
  }

  end() {
    assert(this.isActive);
    this.isActive = false;
  }

  update() {
    if (!this.isActive) {
      return;
    }

    this.deltaX = UI.pointer.x - this.originX;
    this.deltaY = UI.pointer.y - this.originY;

    if (this.tapDraggingEnabled && this.isReleased()) {
      let distance = Math.hypot(this.deltaX, this.deltaY);
      let duration = Date.now() - this.startTime;

      if (
        duration < this.tapDraggingMaxDelay &&
        distance < this.tapDraggingMaxDistance
      ) {
        this.isTapDragging = true;
      }
    }
  }
}

/**
 * @param {number} index
 */
export function getHandRect(index) {
  return new Rectangle(
    UI.HAND.x + gridToPixel(index),
    UI.HAND.y,
    gridToPixel(1),
    gridToPixel(1),
  );
}
