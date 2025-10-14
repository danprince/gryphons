import { ctx, drawSprite, fillRect, TextStyle, writeLine } from "./engine.js";
import { Colors, drawFrame, UI } from "./ui.js";
import { assert, Rectangle } from "./utils.js";
import * as Sprites from "./sprites.js";

/**
 * @import { Point } from "./utils.js";
 * @import { Card, Game, Pile } from "./game.js";
 * @import { Sprite, NineSliceSprite } from "./sprites.js";
 */

export class UIElement {
  /**
   * @param {object} config
   * @param {number} [config.opacity]
   * @param {Rectangle} config.bounds
   */
  constructor(config) {
    this.opacity = config.opacity ?? 1;
    this.bounds = config.bounds;
  }
}

export class Button extends UIElement {
  /**
   * @param {object} config
   * @param {number} [config.opacity]
   * @param {Rectangle} config.bounds
   * @param {boolean} [config.disabled]
   * @param {() => void} [config.onClick]
   */
  constructor(config) {
    super(config);
    this.disabled = config.disabled ?? false;
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

  render() {}
}

export class Panel extends UIElement {
  /**
   * @param {object} config
   * @param {number} [config.opacity]
   * @param {Sprite} [config.sprite]
   * @param {Rectangle} [config.bounds]
   * @param {number} [config.x]
   * @param {number} [config.y]
   * @param {number} [config.width]
   * @param {number} [config.height]
   * @param {string} [config.backgroundColor]
   */
  constructor(config) {
    super({
      ...config,
      bounds:
        config.bounds ??
        new Rectangle(
          config.x ?? config.sprite?.x ?? 0,
          config.y ?? config.sprite?.y ?? 0,
          config.width ?? config.sprite?.width ?? 0,
          config.height ?? config.sprite?.height ?? 0,
        ),
    });
    this.opacity = config.opacity ?? 1;
    this.sprite = config.sprite;
    this.backgroundColor = config.backgroundColor;
  }

  render() {
    ctx.globalAlpha = this.opacity;

    if (this.backgroundColor) {
      fillRect(
        this.bounds.x,
        this.bounds.y,
        this.bounds.w,
        this.bounds.h,
        this.backgroundColor,
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

export class SpriteButton extends Button {
  /**
   * @param {object} config
   * @param {Sprite} config.sprite
   * @param {Sprite} [config.hoverSprite]
   * @param {Sprite} [config.activeSprite]
   * @param {number} [config.x]
   * @param {number} [config.y]
   * @param {() => void} [config.onClick]
   */
  constructor(config) {
    super({
      ...config,
      bounds: new Rectangle(
        config.x ?? 0,
        config.y ?? 0,
        config.sprite.width,
        config.sprite.height,
      ),
    });

    this.sprite = config.sprite;
    this.hoverSprite = config.hoverSprite ?? config.sprite;
    this.activeSprite = config.activeSprite ?? config.sprite;
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

export class TextButtonStyle {
  static default = new TextButtonStyle({
    sprite: Sprites.button,
    activeSprite: Sprites.button_active,
    disabledSprite: Sprites.button_disabled,
    labelColor: Colors.sepia,
    hoverLabelColor: Colors.kombucha,
    activeLabelColor: Colors.kombucha,
    disabledLabelColor: Colors.jet,
  });

  /**
   * @param {object} config
   * @param {NineSliceSprite} config.sprite
   * @param {NineSliceSprite} [config.hoverSprite]
   * @param {NineSliceSprite} [config.activeSprite]
   * @param {NineSliceSprite} [config.disabledSprite]
   * @param {string} [config.labelColor]
   * @param {string} [config.hoverLabelColor]
   * @param {string} [config.activeLabelColor]
   * @param {string} [config.disabledLabelColor]
   */
  constructor(config) {
    this.sprite = config.sprite;
    this.hoverSprite = config.hoverSprite;
    this.activeSprite = config.activeSprite;
    this.disabledSprite = config.disabledSprite;
    this.labelColor = config.labelColor;
    this.hoverLabelColor = config.hoverLabelColor;
    this.activeLabelColor = config.activeLabelColor;
    this.disabledLabelColor = config.disabledLabelColor;
  }
}

export class TextButton extends Button {
  label = "";
  padding = 5;

  /**
   * @param {object} config
   * @param {TextButtonStyle} [config.style]
   * @param {string} config.label
   * @param {number} [config.x]
   * @param {number} [config.y]
   * @param {number} [config.padding]
   * @param {boolean} [config.disabled]
   * @param {() => void} config.onClick
   */
  constructor(config) {
    let bounds = new Rectangle(config.x ?? 0, config.y ?? 0, 0, 0);
    super({ ...config, bounds });
    this.style = config.style ?? TextButtonStyle.default;
    this.label = config.label;
    this.padding = config.padding ?? this.padding;
    this.update();
  }

  update() {
    let { bounds, padding, label } = this;
    let { font } = TextStyle;
    bounds.w = label.length * font.glyphWidth + padding * 2;
    bounds.h = font.glyphHeight + padding * 2;
    super.update();
  }

  render() {
    let { padding, label, style, bounds } = this;
    let isHovered = this.isHovered();
    let isActive = this.isDown();
    let sprite = style.sprite;

    if (this.disabled && style.disabledSprite) {
      sprite = style.disabledSprite;
    } else if (isActive && style.activeSprite) {
      sprite = style.activeSprite;
    } else if (isHovered && style.hoverSprite) {
      sprite = style.hoverSprite;
    }

    TextStyle.save();

    if (this.disabled) {
      TextStyle.color = style.disabledLabelColor;
    } else if (isActive && style.activeLabelColor) {
      TextStyle.color = style.activeLabelColor;
    } else if (isHovered && style.hoverLabelColor) {
      TextStyle.color = style.hoverLabelColor;
    } else {
      TextStyle.color = style.labelColor;
    }

    let labelOffsetY = isActive ? 1 : 0;
    drawFrame(sprite, bounds);
    writeLine(label, bounds.x + padding, bounds.y + padding + labelOffsetY);
    TextStyle.restore();
  }
}

export class CounterButton extends SpriteButton {
  /**
   * @type {number | undefined}
   */
  counter;

  /**
   * @param {object} config
   * @param {Sprite} config.sprite
   * @param {Sprite} [config.hoverSprite]
   * @param {Sprite} [config.activeSprite]
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

export class CardStackButton extends Button {
  gap = 2;
  maxStackSize = 5;
  cardsPerStack = 5;

  /**
   * @param {object} config
   * @param {number} [config.size]
   * @param {string} [config.label]
   * @param {Sprite} config.cardBackSprite
   * @param {Sprite} [config.emptyStackSprite]
   * @param {number} [config.gap]
   * @param {number} [config.maxStackSize]
   * @param {number} [config.cardsPerStack]
   * @param {number} [config.opacity]
   * @param {Rectangle} config.bounds
   * @param {boolean} [config.disabled]
   * @param {() => void} [config.onClick]
   */
  constructor(config) {
    super(config);
    this.size = config.size ?? 0;
    this.label = config.label;
    this.cardBackSprite = config.cardBackSprite;
    this.emptyStackSprite = config.emptyStackSprite ?? Sprites.stack_empty;
    this.gap = config.gap ?? this.gap;
    this.maxStackSize = config.maxStackSize ?? this.maxStackSize;
    this.cardsPerStack = config.cardsPerStack ?? this.cardsPerStack;
  }

  render() {
    let { bounds, size, gap, cardsPerStack, maxStackSize } = this;

    let stackSize = Math.min(Math.ceil(size / cardsPerStack), maxStackSize);

    if (stackSize === 0) {
      drawSprite(Sprites.stack_empty, bounds.x, bounds.y);
    }

    for (let i = 0; i < stackSize; i++) {
      drawSprite(this.cardBackSprite, bounds.x, bounds.y - i * gap);
    }

    TextStyle.save();
    TextStyle.align = "center";
    TextStyle.baseline = "middle";
    TextStyle.backgroundColor = "black";

    if (this.isHovered() && this.label) {
      writeLine(this.label, bounds.center.x + 1, bounds.y + bounds.h);
    } else {
      writeLine(`${size}`, bounds.center.x, bounds.y + bounds.h);
    }

    TextStyle.restore();
  }
}
