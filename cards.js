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
  ReturnCardToHand,
  Knockback,
} from "./actions.js";
import {
  Card,
  CardCategory,
  CardEffect,
  CardEffectList,
  CardTrigger,
  CardType,
  Targeting,
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
  enemies: [Human],
});

export const Neutral = new CardCategory({
  name: "",
  counterFrameSprite: Sprites.counter_frame_neutral,
});

export const Fly = new CardEffect({
  description: "Flies to an adjacent tile",
  run(game, card) {
    let tiles = game.board.getAdjacentTiles(card.tile);
    let emptyTiles = tiles.filter((tile) => tile.isEmpty());
    let emptyTile = randomItem(emptyTiles);
    if (emptyTile) {
      game.board.addActionsBottom(new MoveCard(card, emptyTile));
    }
  },
});

export const Remains = new CardEffect({
  description: "Leaves behind bones",
  run(game, card) {
    let bones = new Card(Bones);
    game.board.addActionsBottom(new PlayCard(bones, card.tile));
  },
});

export const Bite = new CardEffect({
  description: "Attacks one adjacent enemy each turn",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    let target = randomItem(targets);

    if (target) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: target, vfx: VFX.claw }),
      );
    }
  },
});

export const AttackAllMonsters = new CardEffect({
  description: "Attacks all adjacent gryphons when played",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, enemies) {
    for (let enemy of enemies) {
      game.board.addActionsBottom(
        new Damage({ amount: 1, card: enemy, vfx: VFX.slash }),
      );
    }
  },
});

export const AttackOneRandomMonster = new CardEffect({
  description: "Attacks one adjacent gryphon when played",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, enemies) {
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
  onTurn: Bite,
});

export const YoungGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_young_gryphon,
  name: "Young Gryphon",
  counter: 1,
  onTurn: Bite,
});

export const RestlessGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_restless_gryphon,
  name: "Restless Gryphon",
  counter: 3,
  onTurn: Bite,
  onDamage: Fly,
});

export const ProudGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_proud_gryphon,
  name: "Proud Gryphon",
  counter: 5,
  onTurn: new CardEffect({
    description: "Attack the strongest adjacent enemies",
    targeting: [Targeting.adjacent, Targeting.enemies, Targeting.strongest],
    run(game, card, targets) {
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
  }),
});

export const MeanGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_mean_gryphon,
  name: "Mean Gryphon",
  counter: 5,
  onTurn: new CardEffect({
    description: "Attack the weakest adjacent enemies",
    targeting: [Targeting.adjacent, Targeting.enemies, Targeting.weakest],
    run(game, card, targets) {
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
  }),
});

export const StonyGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_stone_gryphon,
  name: "Stony Gryphon",
  counter: 3,
  onTurn: new CardEffect({
    description: "Turn one adjacent enemy into a rock",
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, targets) {
      let target = randomItem(targets);

      if (target) {
        let rock = new Card(Rocks);

        game.board.addActionsBottom(
          new DestroyCard(target),
          new PlayCard(rock, target.tile),
        );
      }
    },
  }),
});

export const Chest = new CardType({
  category: Monster,
  sprite: Sprites.card_chest,
  name: "Chest",
  description: "What's inside?",
  counter: 9,
  onDefeat: new CardEffect({
    run(game, card) {
      game.gold += randomItem([5, 10, 20, 30, 100]);
      game.board.addActionsBottom(
        new DestroyCard(card),
        new PlayCard(new Card(ChestOpen), card.tile),
      );
    },
  }),
});

export const ChestOpen = new CardType({
  category: Neutral,
  sprite: Sprites.card_chest_open,
  name: "Chest",
  description: "Riches galore!",
  counter: 0,
});

export const Hunter = new CardType({
  category: Human,
  sprite: Sprites.card_hunter,
  name: "Hunter",
  description: "Damages adjacent gryphons when played.",
  counter: 2,
  onPlay: AttackAllMonsters,
  onDefeat: Remains,
});

export const Cleric = new CardType({
  category: Human,
  sprite: Sprites.card_cleric,
  name: "Cleric",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description: "Heals the weakest adjacent allies.",
    targeting: [Targeting.adjacent, Targeting.allies, Targeting.weakest],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
            amount: -1,
            vfx: VFX.heal,
          }),
        );
      }
    },
  }),
});

export const Knight = new CardType({
  category: Human,
  sprite: Sprites.card_knight,
  name: "Knight",
  counter: 2,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description: "Knocks adjacent enemies backwards",
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, enemies) {
      for (let enemy of enemies) {
        let dx = enemy.tile.x - card.tile.x;
        let dy = enemy.tile.y - card.tile.y;
        let tile = game.board.getTileAt(enemy.tile.x + dx, enemy.tile.y + dy);
        if (tile) {
          game.board.addActionsBottom(new Knockback(enemy, tile));
        }
      }
    },
  }),
});

export const Hero = new CardType({
  category: Human,
  sprite: Sprites.card_hero,
  name: "Hero",
  counter: 3,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description: "Return weakest adjacent allies to the draw pile.",
    targeting: [Targeting.adjacent, Targeting.allies, Targeting.weakest],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(new ReturnCardToDrawPile(target));
      }
    },
  }),
});

export const Gladiator = new CardType({
  category: Human,
  sprite: Sprites.card_gladiator,
  name: "Gladiator",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description:
      "Deal damage to a random adjacent enemy and gain +1 if it dies",
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, enemies) {
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
  }),
});

export const Lich = new CardType({
  category: Human,
  sprite: Sprites.card_lich,
  name: "Lich",
  description: "Turns adjacent bones into thralls and adds them to your hand",
  counter: 1,
  onPlay: new CardEffect({
    targeting: [Targeting.adjacent, Targeting.type(Bones)],
    run(game, card, bones) {
      for (let bone of bones) {
        let thrall = new Card(Thrall);

        game.board.addActionsBottom(
          new CreateCardInHand(thrall, bone.tile),
          new DestroyCard(bone),
        );
      }
    },
  }),
});

export const Thrall = new CardType({
  category: Human,
  sprite: Sprites.card_thrall,
  name: "Thrall",
  description: "Attacks one adjacent gryphon",
  counter: 1,
  onPlay: AttackOneRandomMonster,
});

export const Commander = new CardType({
  category: Human,
  sprite: Sprites.card_commander,
  name: "Commander",
  description: "Return connected allies to the draw pile",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    targeting(game, card) {
      return game.board.search(card, (target) => card.isAlly(target));
    },
    run(game, card, targets) {
      for (let friend of targets) {
        game.board.addActionsBottom(
          new ReturnCardToDrawPile(friend),
          new Delay(50),
        );
      }
    },
  }),
});

export const Wizard = new CardType({
  category: Human,
  sprite: Sprites.card_wizard,
  name: "Wizard",
  description: "Deal damage to all connected enemies.",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    targeting(game, card) {
      return game.board.search(card, (target) => card.isEnemy(target));
    },
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
            amount: 1,
            vfx: VFX.magic,
          }),
          new Delay(50),
        );
      }
    },
  }),
});

const MineAdjacentObstacles = new CardEffect({
  description: "Destroys any touching rocks and bones",
  targeting: [
    Targeting.adjacent,
    Targeting.test((card) => card.type === Bones || card.type === Rocks),
  ],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new MoveToGravePile(target));
    }
  },
});

export const Miner = new CardType({
  category: Human,
  sprite: Sprites.card_miner,
  name: "Miner",
  counter: 1,
  onDefeat: Remains,
  onPlay: AttackOneRandomMonster,
  effects: new CardEffectList()
    .add(CardTrigger.Play, AttackOneRandomMonster)
    .add(CardTrigger.Play, MineAdjacentObstacles),
});

export const GraveRobber = new CardType({
  category: Human,
  sprite: Sprites.card_grave_robber,
  name: "Grave Robber",
  counter: 1,
  onDefeat: Remains,
  onPlay: AttackOneRandomMonster,
  effects: new CardEffectList().add(
    CardTrigger.Play,
    new CardEffect({
      description: "Draw a card for all adjacent bones",
      targeting: [Targeting.adjacent, Targeting.type(Bones)],
      run(game, card, targets) {
        for (let i = 0; i < targets.length; i++) {
          game.board.addActionsBottom(new DrawCard());
        }
      },
    }),
  ),
});

export const Peasant = new CardType({
  category: Human,
  sprite: Sprites.card_peasant,
  name: "Peasant",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    targeting: [Targeting.adjacent, Targeting.enemies],
    description: "Damages adjacent enemies if next to another peasant",
    condition(game, card) {
      return game.board
        .getAdjacentCards(card)
        .some((neighbour) => neighbour.type === card.type);
    },
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
            amount: 1,
            vfx: VFX.slash,
          }),
        );
      }
    },
  }),
});

export const Pyromancer = new CardType({
  category: Human,
  sprite: Sprites.card_pyromancer,
  name: "Pyromancer",
  counter: 3,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description: "Create a fire on all adjacent empty tiles. Immune to fire.",
    run(game, card) {
      let tiles = game.board.getAdjacentTiles(card.tile);

      for (let tile of tiles) {
        game.board.addActionsBottom(new PlayCard(new Card(Fire), tile));
      }
    },
  }),
});

export const Fire = new CardType({
  category: Neutral,
  sprite: Sprites.card_fire,
  name: "Fire",
  counter: 3,
  onTurn: new CardEffect({
    description:
      "Damage adjacent tiles creating new fires when units are defeated.",
    targeting: [
      Targeting.adjacent,
      Targeting.test(
        /**
         * @param {Card} card
         * @returns {boolean}
         */
        (card) => card.type !== Fire && card.type !== Pyromancer,
      ),
    ],
    run(game, card, targets) {
      card.counter -= 1;

      if (card.counter <= 0) {
        return game.board.addActionsBottom(new DestroyCard(card));
      }

      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({ amount: 1, card: target, vfx: VFX.burn }),
          new PlayCard(new Card(Fire), target.tile),
        );
      }
    },
  }),
});

export const Apostle = new CardType({
  category: Human,
  sprite: Sprites.card_apostle,
  name: "Apostle",
  counter: 1,
  onDefeat: Remains,
  onTurn: new CardEffect({
    description: "Heal adjacent units every turn",
    targeting: [Targeting.adjacent, Targeting.allies],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
            amount: -1,
            vfx: VFX.heal,
          }),
        );
      }
    },
  }),
});

export const Scout = new CardType({
  category: Human,
  sprite: Sprites.card_scout,
  name: "Scout",
  counter: 1,
  onDefeat: Remains,
  onPlay: new CardEffect({
    description: "Return a random adjacent unit to your hand",
    targeting: [Targeting.adjacent, Targeting.allies],
    run(game, card, targets) {
      let target = randomItem(targets);

      if (target) {
        game.board.addActionsBottom(new ReturnCardToHand(target));
      }
    },
  }),
});

export const GhostlyGryphon = new CardType({
  category: Neutral,
  sprite: Sprites.card_ghostly_gryphon,
  name: "Ghostly Gryphon",
  description: "Woo!",
  counter: 0,
  onTurn: new CardEffect({
    targeting: [Targeting.adjacent, Targeting.adjacent],
    run(game, card, targets) {
      // Turn all neighbours into bones
      for (let neighbour of targets) {
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
  }),
});

export const SkeletalGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_skeletal_gryphon,
  name: "Skeletal Gryphon",
  counter: 5,
  onTurn: Bite,
  onDefeat: new CardEffect({
    description: "Creates bones in empty adjacent tiles",
    run(game, card) {
      for (let tile of game.board.getAdjacentTiles(card.tile)) {
        if (tile.isEmpty()) {
          let bones = new Card(Bones);
          game.board.addActionsTop(new PlayCard(bones, tile));
        }
      }
    },
  }),
});
