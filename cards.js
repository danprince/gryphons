// @ts-check

import {
  MoveCard,
  PlayCard,
  Damage,
  ReturnCardToDrawPile,
  CreateCardInHand,
  DestroyCard,
  Delay,
  MoveToGravePile,
  DrawCard,
} from "./actions.js";
import {
  Card,
  CardCategory,
  CardEffect,
  CardType,
  getConnectedCards,
} from "./game.js";
import * as Sprites from "./sprites.js";
import { VFX } from "./ui.js";
import { randomItem } from "./utils.js";

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

export const ProudGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_proud_gryphon,
  name: "Proud Gryphon",
  description: "Attacks the strongest adjacent hunters",
  counter: 5,
  onTurn(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    let minCounter = Math.max(...enemies.map((card) => card.counter));
    let targets = enemies.filter((enemy) => enemy.counter === minCounter);

    for (let target of targets) {
      game.board.addActionsBottom(
        new Damage({
          card: target,
          amount: 1,
          vfx: VFX.claw,
        }),
      );
    }
  },
});

export const MeanGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_mean_gryphon,
  name: "Mean Gryphon",
  description: "Attacks the weakest adjacent hunters",
  counter: 5,
  onTurn(game, card) {
    let enemies = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    let minCounter = Math.min(...enemies.map((card) => card.counter));
    let targets = enemies.filter((enemy) => enemy.counter === minCounter);

    for (let target of targets) {
      game.board.addActionsBottom(
        new Damage({
          card: target,
          amount: 1,
          vfx: VFX.claw,
        }),
      );
    }
  },
});

export const StonyGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_stone_gryphon,
  name: "Stony Gryphon",
  description: "Turns one adjacent human into a rock",
  counter: 3,
  onTurn(game, card) {
    let hunters = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type.category === Human);

    let hunter = randomItem(hunters);

    if (hunter) {
      let rock = new Card(Rocks);

      game.board.addActionsBottom(
        new DestroyCard(hunter),
        new PlayCard(rock, hunter.tile),
      );
    }
  },
});

export const Chest = new CardType({
  category: Monster,
  sprite: Sprites.card_chest,
  name: "Chest",
  description: "What's inside?",
  counter: 9,
  effects: [],
  onDeath(game, card) {
    game.gold += randomItem([5, 10, 20, 30, 100]);
    game.board.addActionsBottom(
      new DestroyCard(card),
      new PlayCard(new Card(ChestOpen), card.tile),
    );
  },
});

export const ChestOpen = new CardType({
  category: Neutral,
  sprite: Sprites.card_chest_open,
  name: "Chest",
  description: "Riches galore!",
  counter: 0,
  effects: [],
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
  effects: [Remains],
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
  effects: [Remains],
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

export const Miner = new CardType({
  category: Human,
  sprite: Sprites.card_miner,
  name: "Miner",
  description: "Destroys any touching rocks and bones",
  counter: 1,
  effects: [AttackOneRandomMonster, Remains],
  onPlay(game, card) {
    for (let neighbour of game.board.getAdjacentCards(card)) {
      if (neighbour.type === Rocks || neighbour.type === Bones) {
        game.board.addActionsBottom(new MoveToGravePile(neighbour));
      }
    }
  },
});

export const GraveRobber = new CardType({
  category: Human,
  sprite: Sprites.card_grave_robber,
  name: "Grave Robber",
  description: "When played draw a card for all adjacent bones",
  counter: 1,
  effects: [AttackOneRandomMonster, Remains],
  onPlay(game, card) {
    for (let neighbour of game.board.getAdjacentCards(card)) {
      if (neighbour.type === Bones) {
        game.board.addActionsBottom(new DrawCard());
      }
    }
  },
});

export const GhostlyGryphon = new CardType({
  category: Neutral,
  sprite: Sprites.card_ghostly_gryphon,
  name: "Ghostly Gryphon",
  description: "Woo!",
  counter: 0,
  onTurn(game, card) {
    // Turn all neighbours into bones
    for (let neighbour of game.board.getAdjacentCards(card)) {
      if (neighbour.type.category === Human) {
        let bones = new Card(Bones);
        game.board.addActionsBottom(
          new MoveToGravePile(neighbour),
          new PlayCard(bones, neighbour.tile),
        );
      }
    }

    // Then move to an adjacent empty tile
    let tiles = game.board.getAdjacentTiles(card.tile);
    let emptyTiles = tiles.filter((tile) => tile.isEmpty());
    let emptyTile = randomItem(emptyTiles);

    if (emptyTile) {
      game.board.addActionsBottom(new MoveCard(card, emptyTile));
    }
  },
});
