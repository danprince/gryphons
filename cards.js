// @ts-check

import {
  MoveCard,
  PlayCard,
  Damage,
  ReturnCardToDrawPile,
  CreateCardInHand,
  DestroyCard,
  Delay,
} from "./actions.js";
import {
  Card,
  CardCategory,
  CardEffect,
  CardType,
  Game,
  getConnectedCards,
} from "./game.js";
import * as Sprites from "./sprites.js";
import { VFX } from "./ui.js";
import { randomItem, required } from "./utils.js";

export const Human = new CardCategory({
  name: "Hunter",
  counterFrameSprite: Sprites.counter_frame_human,
});

export const Monster = new CardCategory({
  name: "Monster",
  counterFrameSprite: Sprites.counter_frame_monster,
});

export const Neutral = new CardCategory({
  name: "",
  counterFrameSprite: Sprites.counter_frame_neutral,
});

export const Flying = new CardEffect({
  icon: Sprites.icon_flying,
  name: "Flying",
  description: "Flies to another tile after taking damage",
  onDamage(game, card) {
    let tiles = game.board.getAdjacentTiles(card.tile);
    let emptyTiles = tiles.filter((tile) => tile.isEmpty());
    let emptyTile = randomItem(emptyTiles);
    if (emptyTile) {
      game.board.addActionsBottom(new MoveCard(card, emptyTile));
    }
  },
});

export const Remains = new CardEffect({
  icon: Sprites.icon_skull,
  name: "Remains",
  description: "Leaves behind bones",
  onDeath(game, card) {
    let bones = new Card(Bones);
    game.board.addActionsBottom(new PlayCard(bones, card.tile));
  },
});

export const Aggressive = new CardEffect({
  icon: Sprites.icon_skull,
  name: "Aggressive",
  description: "Attacks one adjacent enemy each turn",
  onTurn(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    let target = randomItem(enemies);

    if (target) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: target, vfx: VFX.claw }),
      );
    }
  },
});

export const AttackAllMonsters = new CardEffect({
  icon: Sprites.icon_attack,
  name: "Attack",
  description: "Attacks all adjacent gryphons when played",
  onPlay(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Monster);

    for (let enemy of enemies) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: enemy, vfx: VFX.slash }),
      );
    }
  },
});

export const AttackOneRandomMonster = new CardEffect({
  icon: Sprites.icon_attack,
  name: "Attack",
  description: "Attacks one adjacent gryphon when played",
  onPlay(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Monster);

    let enemy = randomItem(enemies);

    if (enemy) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: enemy, vfx: VFX.slash }),
      );
    }
  },
});

export const Bones = new CardType({
  category: Neutral,
  sprite: Sprites.card_bones,
  name: "Bones",
  description: "",
  counter: 0,
});

export const Rocks = new CardType({
  category: Neutral,
  sprite: Sprites.card_rocks,
  name: "Rocks",
  description: "",
  counter: 0,
});

export const Gryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_gryphon,
  name: "Gryphon",
  counter: 2,
  effects: [Aggressive],
});

export const YoungGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_young_gryphon,
  name: "Young Gryphon",
  counter: 1,
  effects: [Aggressive],
});

export const RestlessGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_restless_gryphon,
  name: "Restless Gryphon",
  counter: 3,
  effects: [Flying, Aggressive],
});

export const Hunter = new CardType({
  category: Human,
  sprite: Sprites.card_hunter,
  name: "Hunter",
  description: "Damages adjacent gryphons when played.",
  counter: 3,
  effects: [AttackAllMonsters, Remains],
});

export const Cleric = new CardType({
  category: Human,
  sprite: Sprites.card_cleric,
  name: "Cleric",
  description: "Heals adjacent units when played.",
  counter: 1,
  effects: [Remains],
  onPlay(game, card) {
    let friends = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    for (let friend of friends) {
      game.board.addActionsBottom(
        new Damage({
          card: friend,
          amount: -1,
          vfx: VFX.heal,
        }),
      );
    }
  },
});

export const Knight = new CardType({
  category: Human,
  sprite: Sprites.card_knight,
  name: "Knight",
  description: "Knocks adjacent gryphons backwards",
  counter: 3,
  effects: [Remains],
  onPlay(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Monster);

    for (let enemy of enemies) {
      let dx = enemy.tile.x - card.tile.x;
      let dy = enemy.tile.y - card.tile.y;
      let tile = game.board.getTileAt(enemy.tile.x + dx, enemy.tile.y + dy);
      if (tile) {
        game.board.addActionsBottom(new MoveCard(enemy, tile));
      }
    }
  },
});

export const Hero = new CardType({
  category: Human,
  sprite: Sprites.card_hero,
  name: "Hero",
  description: "Return adjacent hunters to the draw pile when played.",
  counter: 5,
  effects: [AttackAllMonsters, Remains],
  onPlay(game, card) {
    let friends = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    for (let card of friends) {
      game.board.addActionsBottom(new ReturnCardToDrawPile(card));
    }
  },
});

export const Gladiator = new CardType({
  category: Human,
  sprite: Sprites.card_gladiator,
  name: "Gladiator",
  description: "Deal damage to one adjacent gryphon and gain +1 if it dies",
  counter: 1,
  effects: [Remains],
  onPlay(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Monster);
    let enemy = randomItem(enemies);

    if (enemy) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: enemy, vfx: VFX.slash }),
      );
    }

    if (enemy && enemy.counter <= 1) {
      game.board.addActionsBottom(
        new Damage({ amount: -1, card, vfx: VFX.heal }),
      );
    }
  },
});

export const Lich = new CardType({
  category: Human,
  sprite: Sprites.card_lich,
  name: "Lich",
  description: "Turns adjacent bones into thralls and adds them to your hand",
  counter: 1,
  onPlay(game, card) {
    let bones = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type === Bones);

    for (let bone of bones) {
      let thrall = new Card(Thrall);

      game.board.addActionsBottom(
        new CreateCardInHand(thrall, bone.tile),
        new DestroyCard(bone),
      );
    }
  },
});

export const Thrall = new CardType({
  category: Human,
  sprite: Sprites.card_thrall,
  name: "Thrall",
  description: "Attacks one adjacent gryphon",
  counter: 1,
  effects: [AttackOneRandomMonster],
});

export const Commander = new CardType({
  category: Human,
  sprite: Sprites.card_commander,
  name: "Commander",
  description: "Return connected cards to the draw pile",
  counter: 1,
  onPlay(game, card) {
    for (let friend of getConnectedCards(game, card)) {
      game.board.addActionsBottom(
        new ReturnCardToDrawPile(friend),
        new Delay(50),
      );
    }
  },
});

export const Wizard = new CardType({
  category: Human,
  sprite: Sprites.card_wizard,
  name: "Wizard",
  description: "Deal damage to all connected enemies.",
  counter: 1,
  onPlay(game, card) {
    for (let enemy of getConnectedCards(game, card, Monster)) {
      game.board.addActionsBottom(
        new Damage({
          card: enemy,
          amount: 1,
          vfx: VFX.magic,
        }),
        new Delay(50),
      );
    }
  },
});
