/**
 * @import { Sprite } from "./sprites.js";
 *
 * @typedef {object} Point
 * @prop {number} x
 * @prop {number} y
 *
 * @typedef {object} Size
 * @prop {number} w
 * @prop {number} h
 */

/**
 * @template Value
 * @typedef {[Value, ...Value[]]} NonEmptyArray
 */

/**
 * @satisfies {Record<string, Point>}
 */
export const Directions = {
  NorthWest: { x: -1, y: -1 },
  North: { x: 0, y: -1 },
  NorthEast: { x: 1, y: -1 },
  East: { x: 1, y: 0 },
  SouthEast: { x: 1, y: 1 },
  South: { x: 0, y: 1 },
  SouthWest: { x: -1, y: 1 },
  West: { x: -1, y: 0 },
};

/**
 * @satisfies {Record<string, Point[]>}
 */
export const Neighbours = {
  adjacent: [
    Directions.North,
    Directions.NorthEast,
    Directions.East,
    Directions.SouthEast,
    Directions.South,
    Directions.SouthWest,
    Directions.West,
    Directions.NorthWest,
  ],
  cardinal: [
    Directions.North,
    Directions.East,
    Directions.South,
    Directions.West,
  ],
};

/**
 * Throw an error if the value is falsy.
 * @param {any} value
 * @param {string} message
 * @returns {asserts value}
 */
export function assert(value, message = "Assertion failed") {
  if (!value) {
    throw new Error(message);
  }
}

/**
 * Throw an error if the value is nullish.
 * @template Value
 * @param {Value} value
 * @returns {NonNullable<Value>}
 */
export function required(value) {
  if (value == null) {
    throw new Error("required");
  } else {
    return value;
  }
}

/**
 * Throw an error if we reach this code. This function accepts a `never` value
 * to ensure that you covered all branches exhaustively.
 * @param {never} value
 * @returns {asserts value is never}
 */
export function unreachable(value) {
  throw new Error("unreachable");
}

/**
 * Check whether a value is non nullable.
 * @template Value
 * @param {Value} value
 * @returns {value is NonNullable<Value>}
 */
export function isNonNullable(value) {
  return value != null;
}

/**
 * Linear interpolation between two values.
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp a value between a min and a max.
 * @param {number} min
 * @param {number} max
 * @param {number} val
 * @returns {number}
 */
export function clamp(min, max, val) {
  return Math.max(min, Math.min(val, max));
}

/**
 * Remove an item from an array.
 * @template T
 * @param {T[]} array
 * @param {T} item
 */
export function removeFromArray(array, item) {
  let index = array.indexOf(item);
  if (index >= 0) {
    array.splice(index, 1);
  }
}

/**
 * Return a random item from a non-empty array.
 * @template T
 * @overload
 * @param {[T, ...T[]]} array
 * @returns {T}
 */

/**
 * Return a random item from an array that might be empty.
 * @template T
 * @overload
 * @param {T[]} array
 * @returns {T | undefined}
 */

/**
 * Return a random item from an array.
 * @template T
 * @param {T[]} array
 * @returns {T | undefined}
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * @param {string} text
 * @param {number} maxCharsPerLine
 * @returns {string[]}
 */
export function splitText(text, maxCharsPerLine = 30) {
  let chunks = text.split(/( |\n)/);
  /** @type {string[]} */
  let lines = [];
  let line = "";

  for (let chunk of chunks) {
    if (
      (line.length === 0 || line.length + chunk.length < maxCharsPerLine) &&
      chunk !== "\n"
    ) {
      line += chunk;
    } else {
      lines.push(line.trim());
      line = chunk;
    }
  }

  if (line) {
    lines.push(line.trim());
  }

  return lines;
}

export class Rectangle {
  static temp = new Rectangle();

  x = 0;
  y = 0;
  w = 0;
  h = 0;

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  clone() {
    return new Rectangle(this.x, this.y, this.w, this.h);
  }

  /**
   * @param {number} size
   * @returns {Rectangle}
   */
  grow(size) {
    return new Rectangle(
      this.x - size,
      this.y - size,
      this.w + size * 2,
      this.h + size * 2,
    );
  }

  /**
   * @param {number} size
   * @returns {Rectangle}
   */
  shrink(size) {
    return this.grow(-size);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  contains(x, y) {
    return Rectangle.contains(this.x, this.y, this.w, this.h, x, y);
  }

  /**
   * @param {number} rx
   * @param {number} ry
   * @param {number} rw
   * @param {number} rh
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  static contains(rx, ry, rw, rh, x, y) {
    return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
  }

  get center() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2,
    };
  }

  get x0() {
    return this.x;
  }

  get y0() {
    return this.y;
  }

  get x1() {
    return this.x + this.w;
  }

  get y1() {
    return this.y + this.h;
  }
}

/**
 * Split a sprite into subsprites.
 * @param {Sprite} sprite
 * @param {number} width
 * @param {number} height
 * @returns {Sprite[]}
 */
export function splitSprite(sprite, width, height) {
  /**
   * @type {Sprite[]}
   */
  let sprites = [];

  for (let y = 0; y < sprite.height; y += height) {
    for (let x = 0; x < sprite.width; x += width) {
      sprites.push({
        ...sprite,
        x: sprite.x + x,
        y: sprite.y + y,
        width,
        height,
      });
    }
  }

  return sprites;
}

/**
 * @param {string} src
 * @returns {HTMLImageElement}
 */
export function loadImage(src) {
  let image = new Image();
  image.src = src;
  return image;
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
    canvas = document.createElement("canvas");

    if (image.complete) {
      tint(canvas, image, color);
    } else {
      image.decode().then(() => tint(required(canvas), image, color));
    }

    recolorCache.set(color, canvas);
  }

  return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} image
 * @param {string} color
 */
function tint(canvas, image, color) {
  let ctx = required(canvas.getContext("2d"));
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * @template Value
 * @param {Value[]} array
 * @returns {Value | undefined}
 */
export function last(array) {
  return array[array.length - 1];
}

/**
 * Shuffle the elements in an array.
 * @param {any[]} array
 */
export function shuffle(array) {
  for (let i = 1; i < array.length - 1; i++) {
    let j = Math.round(Math.random() * i);
    let a = array[i];
    let b = array[j];
    array[i] = b;
    array[j] = a;
  }
}

/**
 * @typedef {(t: number) => number} Easing
 */

/**
 * Linear easing at a constant speed.
 * @type {Easing}
 */
export function easeLinear(t) {
  return t;
}

/**
 * Eases in and out slowly.
 * @type {Easing}
 */
export function easeInOut(t) {
  return (t *= 2) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1);
}

/**
 * Eases out beyond the end then pulls back.
 * @type {Easing}
 */
export function easeOutBack(t) {
  return --t * t * ((1.70158 + 1) * t + 1.70158) + 1;
}

/**
 * @template T
 * @param {T[]} array
 * @param {(item: T) => number} getScore
 * @returns {T[]}
 */
export function findAllMinBy(array, getScore) {
  let minScore = Infinity;

  for (let item of array) {
    let score = getScore(item);
    if (score < minScore) {
      minScore = score;
    }
  }

  return array.filter((item) => getScore(item) === minScore);
}

/**
 * @template T
 * @param {T[]} array
 * @param {(item: T) => number} getScore
 * @returns {T[]}
 */
export function findAllMaxBy(array, getScore) {
  let maxScore = -Infinity;

  for (let item of array) {
    let score = getScore(item);
    if (score > maxScore) {
      maxScore = score;
    }
  }

  return array.filter((item) => getScore(item) === maxScore);
}

/**
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function unique(array) {
  return Array.from(new Set(array));
}
