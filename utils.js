// @ts-check

/**
 * @import { Sprite } from "./sprites";
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
 * Return a random item from an array.
 * @template T
 * @param {T[]} array
 * @returns {T}
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get the Euclidean distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function getEuclideanDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Get the taxicab distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function getTaxicabDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Get the Chebyshev distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function getChebyshevDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
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

/**
 * Push an item to a random index within an array.
 * @template Value
 * @param {Value[]} array
 * @param {Value} item
 */
export function pushRandom(array, item) {
  let index = Math.floor(Math.random() * array.length);
  array.splice(index, 0, item);
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
   */
  grow(size) {
    this.x -= size;
    this.y -= size;
    this.w += size * 2;
    this.h += size * 2;
    return this;
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
 * @param {HTMLImageElement} image
 */
export function waitForImage(image) {
  if (!image.complete) {
    return image.decode();
  }
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
export function recolor(image, color) {
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
 * @param {number} t
 */
export function easeInOut(t) {
  return Math.sin(t * Math.PI);
}
