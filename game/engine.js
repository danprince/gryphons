import {
  clamp,
  loadImage,
  removeFromArray,
  required,
  splitSprite,
  splitText,
} from "./utils.js";
import * as Sprites from "./sprites.js";

/**
 * @import { Point } from "./utils.js";
 * @import { Sprite, NineSliceSprite } from "./sprites.js";
 */

const GRID_SIZE = 24;

/**
 * @returns {{
 *  canvas: HTMLCanvasElement,
 *  ctx: CanvasRenderingContext2D,
 *  spritesImage: HTMLImageElement
 * }}
 */
function createRenderer() {
  // If we are not running in a browser, we don't have access to the DOM.
  // Instead just return an empty object and trust that code (tests etc)
  // aren't going to be touching any rendering APIs.
  if (typeof document === "undefined") {
    return /** @type {any} */ ({});
  }

  const canvas = document.createElement("canvas");
  const ctx = required(canvas.getContext("2d"));
  const spritesImage = loadImage(Sprites.$url);
  return { canvas, ctx, spritesImage };
}

export const { canvas, ctx, spritesImage } = createRenderer();

/**
 * Convert a value in grid scale into pixel scale.
 * @param {number} value
 * @returns {number}
 */
export function gridToPixel(value) {
  return value * GRID_SIZE;
}

/**
 * Convert a value in pixel scale into grid scale.
 * @param {number} value
 * @returns {number}
 */
export function pixelToGrid(value) {
  return value / GRID_SIZE;
}

/**
 * @param {Point} point
 * @returns {Point}
 */
export function screenToGrid(point) {
  return {
    x: point.x / GRID_SIZE,
    y: point.y / GRID_SIZE,
  };
}

/**
 * @param {Point} point
 * @returns {Point}
 */
export function gridToScreen(point) {
  return {
    x: point.x * GRID_SIZE,
    y: point.y * GRID_SIZE,
  };
}

/**
 * Clear the canvas.
 */
export function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Resize the canvas.
 * @param {number} width
 * @param {number} height
 */
export function resize(width, height) {
  canvas.width = width;
  canvas.height = height;
  let scaleX = window.innerWidth / canvas.width;
  let scaleY = window.innerHeight / canvas.height;
  let scale = Math.min(scaleX, scaleY);
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
  canvas.style.imageRendering = "pixelated";
  ctx.imageSmoothingEnabled = false;
}

/**
 * @typedef {object} SpriteFont
 * @prop {Sprite[]} sprites Sprites representing the glyphs in this font.
 * @prop {number} glyphWidth The width of each glyph in pixels.
 * @prop {number} glyphHeight The height of each glyph in pixels.
 * @prop {number} lineHeight The vertical distance to advance when writing lines of text.
 * @prop {number} charOffset The char code of the first glyph in the font.
 * @prop {number} fallbackCharCode The char code to render for glyphs outside the font.
 * @prop {number} iconsCharCode The char code where icons start.
 *
 * @typedef {object} TextStyle
 * @prop {"left" | "center" | "right"} align
 * @prop {"top" | "middle" | "bottom"} baseline
 * @prop {string | undefined} color
 * @prop {string | undefined} backgroundColor
 * @prop {SpriteFont} font
 */

/**
 * @type {TextStyle[]}
 */
const textStyleStack = [];

export const TextStyle = {
  save() {
    textStyleStack.push({
      align: this.align,
      baseline: this.baseline,
      color: this.color,
      font: this.font,
      backgroundColor: this.backgroundColor,
    });
  },
  restore() {
    let settings = required(textStyleStack.pop());
    this.align = settings.align;
    this.baseline = settings.baseline;
    this.color = settings.color;
    this.font = settings.font;
    this.backgroundColor = settings.backgroundColor;
  },
  /**
   * Measure a single line of text.
   * @param {string} text
   * @returns {[width: number, height: number]}
   */
  measure(text) {
    // -1px because the final row/column of each glyph is spacing.
    let width = text.length * this.font.glyphWidth - 1;
    let height = this.font.glyphHeight;
    return [width, height];
  },
  /**
   * @type {TextStyle["align"]}
   */
  align: "left",
  /**
   * @type {TextStyle["baseline"]}
   */
  baseline: "top",
  /**
   * @type {TextStyle["color"]}
   */
  color: undefined,
  /**
   * @type {TextStyle["backgroundColor"]}
   */
  backgroundColor: undefined,
  /**
   * @type {SpriteFont}
   */
  font: {
    sprites: splitSprite(Sprites.font, 4, 7),
    glyphWidth: 4,
    glyphHeight: 7,
    lineHeight: 8,
    charOffset: 32,
    iconsCharCode: 128,
    fallbackCharCode: 127,
  },
};

/**
 * @param {Sprite} sprite
 * @param {number} x
 * @param {number} y
 */
export function drawSprite(sprite, x, y) {
  let { x: sx, y: sy, width: sw, height: sh } = sprite;

  let dx = Math.round(x);
  let dy = Math.round(y);

  if (sprite.pivot) {
    dx -= sprite.pivot.x;
    dy -= sprite.pivot.y;
  }

  ctx.drawImage(spritesImage, sx, sy, sw, sh, dx, dy, sw, sh);
}

/**
 * @param {Sprite} sprite
 * @param {number} x
 * @param {number} y
 */
export function drawAnchoredSprite(sprite, x, y, anchorX = 0.5, anchorY = 0.5) {
  let { x: sx, y: sy, width: sw, height: sh } = sprite;

  let dx = Math.round(x - anchorX * sw);
  let dy = Math.round(y - anchorY * sh);

  ctx.drawImage(spritesImage, sx, sy, sw, sh, dx, dy, sw, sh);
}

/**
 * Draws a 9-slice sprite.
 * @param {NineSliceSprite} sprite
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function drawNineSlice(sprite, x, y, w, h) {
  const { x: sx, y: sy, width: sw, height: sh, center } = sprite;
  const { x: cx, y: cy, width: cw, height: ch } = center;

  // Source slice sizes
  const left = cx;
  const top = cy;
  const right = sw - cx - cw;
  const bottom = sh - cy - ch;

  // Clamp to minimum size to avoid degenerate areas
  w = Math.max(w, left + right);
  h = Math.max(h, top + bottom);

  // Round everything to integer pixels to prevent blurring
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);

  const dx0 = x;
  const dx1 = dx0 + left;
  const dx2 = dx0 + w - right;
  const dy0 = y;
  const dy1 = dy0 + top;
  const dy2 = dy0 + h - bottom;

  // Recompute middle sizes to ensure consistency
  const dcw = dx2 - dx1;
  const dch = dy2 - dy1;

  // Source coordinates
  const sx0 = sx;
  const sx1 = sx0 + left;
  const sx2 = sx0 + sw - right;
  const sy0 = sy;
  const sy1 = sy0 + top;
  const sy2 = sy0 + sh - bottom;

  const img = spritesImage;

  // Corners
  ctx.drawImage(img, sx0, sy0, left, top, dx0, dy0, left, top); // top left
  ctx.drawImage(img, sx2, sy0, right, top, dx2, dy0, right, top); // top right
  ctx.drawImage(img, sx0, sy2, left, bottom, dx0, dy2, left, bottom); // bottom left
  ctx.drawImage(img, sx2, sy2, right, bottom, dx2, dy2, right, bottom); // bottom right

  // Edges
  ctx.drawImage(img, sx1, sy0, cw, top, dx1, dy0, dcw, top); // top
  ctx.drawImage(img, sx1, sy2, cw, bottom, dx1, dy2, dcw, bottom); // bottom
  ctx.drawImage(img, sx0, sy1, left, ch, dx0, dy1, left, dch); // left
  ctx.drawImage(img, sx2, sy1, right, ch, dx2, dy1, right, dch); // right

  // Center
  ctx.drawImage(img, sx1, sy1, cw, ch, dx1, dy1, dcw, dch);
}

/**
 * @type {Map<string, HTMLCanvasElement>}
 */
let recolorCache = new Map();

/**
 * @param {HTMLImageElement} image
 * @param {string} color
 * @returns {HTMLCanvasElement}
 */
function recolor(image, color) {
  let canvas = recolorCache.get(color);

  if (!canvas) {
    let canvas = document.createElement("canvas");

    function tint() {
      let ctx = required(canvas.getContext("2d"));
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(image, 0, 0);
    }

    if (image.complete) {
      tint();
    } else {
      image.decode().then(tint);
    }

    recolorCache.set(color, canvas);
    return canvas;
  }

  return canvas;
}

/**
 * Write a single line of text.
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @return {number} The height of the text.
 */
export function writeLine(text, x, y) {
  let { color, backgroundColor, font, align, baseline } = TextStyle;

  /** @type {CanvasImageSource} */
  let source = spritesImage;

  let fallbackSprite = required(
    font.sprites[font.fallbackCharCode - font.charOffset],
  );

  let width = text.length * font.glyphWidth;
  let height = font.glyphHeight;
  if (align === "right") x -= width;
  if (align === "center") x -= Math.floor(width / 2);
  if (baseline === "middle") y -= Math.floor(font.glyphHeight / 2);
  if (baseline === "bottom") y -= font.glyphHeight;
  if (color) source = recolor(source, color);

  if (backgroundColor) {
    let pad = 1;
    fillRect(x - pad, y, width + pad, height, backgroundColor);
  }

  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    let sprite = font.sprites[code - font.charOffset] ?? fallbackSprite;

    let { x: sx, y: sy, width: sw, height: sh } = sprite;
    let dx = Math.round(x + i * font.glyphWidth);
    let dy = Math.round(y);

    // Any glyphs in this range are considered icons and should be drawn from
    // the original texture instead of the recolored one.
    let glyphSource = code < font.iconsCharCode ? source : spritesImage;

    ctx.drawImage(glyphSource, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  return TextStyle.font.lineHeight;
}

/**
 * Write multiple lines of text.
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @returns {number} The height of the drawn text.
 */
export function writeText(text, x, y, maxWidth) {
  let maxChars = Math.floor(maxWidth / TextStyle.font.glyphWidth);
  let lines = splitText(text, maxChars);

  for (let i = 0; i < lines.length; i++) {
    let line = required(lines[i]);
    writeLine(line, x, y + i * TextStyle.font.lineHeight);
  }

  return lines.length * TextStyle.font.glyphHeight;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 */
export function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export class Timer {
  /**
   * @type {Timer[]}
   */
  static timers = [];

  /**
   * Clear all global timers.
   */
  static clear() {
    for (let timer of this.timers) {
      timer.updateCallback?.(1);
      timer.doneCallback?.();
    }
    this.timers = [];
  }

  /**
   * @param {number} dt
   */
  static update(dt) {
    for (let timer of this.timers) {
      timer.update(dt);

      if (timer.elapsed >= timer.duration) {
        removeFromArray(this.timers, timer);
      }
    }
  }

  /**
   * @param {number} duration
   * @param {(progress: number) => void} [callback]
   * @returns {Promise<void>}
   */
  static promise(duration, callback) {
    return new Promise((resolve) => {
      this.global({
        duration,
        update: callback,
        done: resolve,
      });
    });
  }

  /**
   * @param {object} config
   * @param {number} config.duration
   * @param {(progress: number) => void} [config.update]
   * @param {() => void} [config.done]
   */
  static global(config) {
    let timer = new Timer(config);
    timer.update(0);
    this.timers.push(timer);
    return timer;
  }

  /**
   * @private
   */
  elapsed = 0;

  /**
   * @param {object} config
   * @param {number} config.duration
   * @param {(progress: number) => void} [config.update]
   * @param {() => void} [config.done]
   */
  constructor(config) {
    this.duration = config.duration;
    this.updateCallback = config.update;
    this.doneCallback = config.done;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    this.elapsed += dt;

    let progress = clamp(0, 1, this.elapsed / this.duration);
    this.updateCallback?.(progress);

    if (this.elapsed >= this.duration) {
      this.doneCallback?.();
    }
  }

  isDone() {
    return this.elapsed >= this.duration;
  }

  cancel() {
    this.elapsed = this.duration;
    this.doneCallback?.();
  }
}

/**
 * @param {number} dt
 */
let _update = (dt) => {};

/**
 * The timestamp of the previous frame.
 */
let lastFrameTime = 0;

function loop() {
  requestAnimationFrame(loop);

  // Calculate delta time.
  let currentFrameTime = Date.now();
  lastFrameTime ||= currentFrameTime;
  let dt = currentFrameTime - lastFrameTime;
  lastFrameTime = currentFrameTime;

  _update(dt);
}

/**
 * @param {(dt: number) => void} update
 */
export function start(update) {
  _update = update;
  loop();
  document.body.append(canvas);
}
