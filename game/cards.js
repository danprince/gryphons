import {
  MoveCard,
  PlayCard,
  Damage,
  DestroyCard,
  DrawCard,
  ChangeMoraleAction,
  DiscardCard,
  Push,
  Action,
  Pull,
  ReturnCardToHand,
  CreateCardInHand,
  Delay,
  ReturnCardToDrawPile,
} from "./actions.js";
import {
  Card,
  CardCategory,
  CardEffect,
  CardType,
  Tag,
  Targeting,
} from "./game.js";
import * as Sprites from "./sprites.js";
import { Icons, VFX } from "./ui.js";
import { Neighbours, randomItem } from "./utils.js";

const Tags = {
  Bones: new Tag("Bones"),
  Fireproof: new Tag("Fireproof"),
};

export const Human = new CardCategory({
  name: "Human",
  cardBackSprite: Sprites.card_back_human,
  counterFrameSprite: Sprites.counter_frame_human,
});

export const Monster = new CardCategory({
  name: "Monster",
  cardBackSprite: Sprites.card_back_monster,
  counterFrameSprite: Sprites.counter_frame_monster,
  enemies: [Human],
});

export const Neutral = new CardCategory({
  name: "Neutral",
  cardBackSprite: Sprites.card_back_neutral,
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

export const ClawRandomAdjacentEnemy = new CardEffect({
  description: "Attack one adjacent enemy",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    let target = randomItem(targets);

    if (target) {
      game.board.addActionsBottom(new Damage({ card: target, vfx: VFX.claw }));
    }
  },
});

export const PushAllAdjacentEnemies = new CardEffect({
  description: "Push adjacent enemies",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new Push(card, target));
    }
  },
});

export const SlashAllAdjacentEnemies = new CardEffect({
  description: "Attack adjacent enemies",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new Damage({ card: target, vfx: VFX.slash }));
    }
  },
});

export const SlashStrongestAdjacentEnemies = new CardEffect({
  description: "Attack strongest adjacent enemies",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new Damage({ card: target, vfx: VFX.slash }));
    }
  },
});

export const SlashRandomAdjacentEnemy = new CardEffect({
  description: "Attack a random adjacent enemy",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    let target = randomItem(targets);
    if (target) {
      game.board.addActionsBottom(new Damage({ card: target, vfx: VFX.slash }));
    }
  },
});

const RetreatWeakestAdjacentAllies = new CardEffect({
  description: "Weakest adjacent allies retreat to the discard pile",
  targeting: [Targeting.adjacent, Targeting.allies, Targeting.weakest],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new DiscardCard(target));
    }
  },
});

const HealWeakestAdjacentAllies = new CardEffect({
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
});

const HealRandomAdjacentAlly = new CardEffect({
  description: "Heals a random adjacent ally.",
  targeting: [Targeting.adjacent, Targeting.allies],
  run(game, card, targets) {
    let target = randomItem(targets);
    if (target) {
      game.board.addActionsBottom(
        new Damage({
          card: target,
          amount: -1,
          vfx: VFX.heal,
        }),
      );
    }
  },
});

const HealAdjacentAllies = new CardEffect({
  description: "Heals adjacent allies.",
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
});

const PullAllies = new CardEffect({
  description: "Pull allies closer",
  targeting: [Targeting.grapple, Targeting.allies],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(new Pull(card, target));
    }
  },
});

export const Inspire = new CardEffect({
  description: "Gain 1 morale",
  run: (game) => game.board.addActionsBottom(new ChangeMoraleAction(1)),
});

export const Despair = new CardEffect({
  description: "Lose 1 morale",
  run: (game) => game.board.addActionsBottom(new ChangeMoraleAction(-1)),
});

export const Hopeless = new CardEffect({
  description: `Lose ALL morale ${Icons.morale}`,
  run: (game) =>
    game.board.addActionsBottom(new ChangeMoraleAction(-game.morale)),
});

export const Bones = new CardType({
  category: Neutral,
  sprite: Sprites.card_bones,
  name: "Bones",
  tags: [Tags.Bones],
});

export const GryphonBones = new CardType({
  category: Neutral,
  sprite: Sprites.card_gryphon_bones,
  name: "Bones",
  tags: [Tags.Bones],
});

export const Rocks = new CardType({
  category: Neutral,
  sprite: Sprites.card_rocks,
  name: "Rocks",
});

export const Fire = new CardType({
  category: Neutral,
  sprite: Sprites.card_fire,
  name: "Fire",
  counter: 1,
  onTurn: new CardEffect({
    description: "Burn adjacent cards",
    targeting: [Targeting.adjacent],
    run(game, card, targets) {
      card.counter -= 1;

      if (card.counter <= 0) {
        game.board.addActionsBottom(new DestroyCard(card));
      }

      for (let target of targets) {
        if (!target.hasTag(Tags.Fireproof)) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.burn }),
          );
        }
      }
    },
  }),
});

export const Egg = new CardType({
  category: Monster,
  sprite: Sprites.card_egg,
  name: "Egg",
  counter: 1,
  onDefeat: new CardEffect({
    description: "Hatches into a gryphon",
    run(game, card) {
      let type = randomItem([YoungGryphon, YoungGryphon, Gryphon, MeanGryphon]);
      game.board.addActionsBottom(
        new DestroyCard(card),
        new PlayCard(new Card(type), card.tile),
      );
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
});

export const Townsfolk = new CardType({
  category: Human,
  sprite: Sprites.card_townsfolk,
  name: "Townsfolk",
  counter: 3,
  remains: Bones,
  onDefeat: [Despair],
});

export const Peasant = new CardType({
  category: Human,
  sprite: Sprites.card_peasant,
  name: "Peasant",
  counter: 1,
  remains: Bones,
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
          new Damage({ card: target, vfx: VFX.slash }),
        );
      }
    },
  }),
});

export const Captain = new CardType({
  category: Human,
  sprite: Sprites.card_captain,
  name: "Captain",
  counter: 2,
  onPlay: [PullAllies, Inspire],
  remains: Bones,
});

export const Messenger = new CardType({
  category: Human,
  sprite: Sprites.card_messenger,
  name: "Messenger",
  counter: 1,
  onPlay: RetreatWeakestAdjacentAllies,
  remains: Bones,
});

export const Herbalist = new CardType({
  category: Human,
  sprite: Sprites.card_herbalist,
  name: "Herbalist",
  counter: 1,
  remains: Bones,
  onTurn: HealWeakestAdjacentAllies,
});

export const Brawler = new CardType({
  category: Human,
  sprite: Sprites.card_brawler,
  name: "Brawler",
  counter: 1,
  remains: Bones,
  onPlay: new CardEffect({
    description: "Push adjacent cards away",
    targeting: [Targeting.adjacent],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(new Push(card, target));
      }
    },
  }),
});

export const Hunter = new CardType({
  category: Human,
  sprite: Sprites.card_hunter,
  name: "Hunter",
  counter: 2,
  onPlay: SlashAllAdjacentEnemies,
  remains: Bones,
});

export const Friar = new CardType({
  category: Human,
  sprite: Sprites.card_friar,
  name: "Friar",
  counter: 1,
  remains: Bones,
  onPlay: HealWeakestAdjacentAllies,
});

export const Monk = new CardType({
  category: Human,
  sprite: Sprites.card_monk,
  name: "Friar",
  counter: 2,
  remains: Bones,
  onPlay: [SlashRandomAdjacentEnemy, HealRandomAdjacentAlly],
});

export const Prophet = new CardType({
  category: Human,
  sprite: Sprites.card_prophet,
  name: "Prophet",
  counter: 2,
  remains: Bones,
  onPlay: new CardEffect({
    targeting: [Targeting.adjacent, Targeting.allies],
    description: "Discard adjacent allies",
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(new DiscardCard(target));
      }
    },
  }),
});

export const Marksman = new CardType({
  category: Human,
  sprite: Sprites.card_marksman,
  name: "Marksman",
  counter: 1,
  remains: Bones,
  onPlay: new CardEffect({
    description: "Shoots the nearest enemy.",
    targeting: [Targeting.all, Targeting.enemies, Targeting.nearest],
    run(game, card, targets) {
      let target = randomItem(targets);

      if (target) {
        game.board.addActionsBottom(
          new Damage({ card: target, vfx: VFX.slash }),
        );
      }
    },
  }),
});

export const Butcher = new CardType({
  category: Human,
  sprite: Sprites.card_butcher,
  name: "Butcher",
  counter: 1,
  remains: Bones,
  onPlay: [SlashAllAdjacentEnemies, PushAllAdjacentEnemies],
});

export const Spearman = new CardType({
  category: Human,
  sprite: Sprites.card_spearman,
  name: "Spearman",
  counter: 3,
  remains: Bones,
  onPlay: [
    new CardEffect({
      description: "Attack a random enemy then try to step backwards.",
      targeting: [Targeting.adjacent, Targeting.enemies],
      run(game, card, targets) {
        let target = randomItem(targets);

        if (!target) {
          return;
        }

        game.board.addActionsBottom(
          new Damage({ card: target, vfx: VFX.slash }),
        );

        let dx = Math.sign(card.tile.x - target.tile.x);
        let dy = Math.sign(card.tile.y - target.tile.y);
        let tile = game.board.getTileAt(card.tile.x + dx, card.tile.y + dy);

        if (tile) {
          game.board.addActionsBottom(new MoveCard(card, tile));
        }
      },
    }),
  ],
});

export const Knight = new CardType({
  category: Human,
  sprite: Sprites.card_knight,
  name: "Knight",
  counter: 3,
  remains: Bones,
  onPlay: [
    new CardEffect({
      description: "Attack the weakest adjacent enemies",
      targeting: [Targeting.adjacent, Targeting.enemies, Targeting.weakest],
      run(game, card, targets) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.slash }),
          );
        }
      },
    }),
  ],
});

class Glory extends Action {
  /**
   * @param {Card} card
   * @param {Card[]} targets
   */
  constructor(card, targets) {
    super();
    this.card = card;
    this.targets = targets;
  }

  perform() {
    if (this.targets.some((target) => target.counter <= 0)) {
      this.game.board.addActionsBottom(
        new Damage({ card: this.card, vfx: VFX.heal, amount: -1 }),
      );
    }

    return Action.done;
  }
}

export const Gladiator = new CardType({
  category: Human,
  sprite: Sprites.card_gladiator,
  name: "Gladiator",
  counter: 1,
  remains: Bones,
  onPlay: [
    new CardEffect({
      description:
        "Attack the strongest adajcent enemies, if any die, gain 1 health.",
      targeting: [Targeting.adjacent, Targeting.enemies, Targeting.strongest],
      run(game, card, targets) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.slash }),
          );
        }
        game.board.addActionsBottom(new Glory(card, targets));
      },
    }),
  ],
});

export const Bedouin = new CardType({
  category: Human,
  sprite: Sprites.card_bedouin,
  name: "Bedouin",
  counter: 1,
  remains: Bones,
  onTurn: [
    SlashRandomAdjacentEnemy,
    new CardEffect({
      description: "Move to a random adjacent empty tile.",
      targeting: [Targeting.adjacent, Targeting.enemies],
      run(game, card, targets) {
        let tiles = game.board.getAdjacentTiles(card.tile);
        let emptyTiles = tiles.filter((tile) => tile.isEmpty());
        let tile = randomItem(emptyTiles);
        if (tile) {
          game.board.addActionsBottom(new MoveCard(card, tile));
        }
      },
    }),
  ],
});

export const Pyromancer = new CardType({
  category: Human,
  sprite: Sprites.card_pyromancer,
  name: "Pyromancer",
  counter: 1,
  description: "Cannot be burned",
  remains: Bones,
  tags: [Tags.Fireproof],
  onPlay: new CardEffect({
    description: "Create fire in adjacent empty tiles",
    run(game, card) {
      let tiles = game.board.getAdjacentTiles(card.tile);

      for (let tile of tiles) {
        if (tile.isEmpty()) {
          let fire = new Card(Fire);
          game.board.addActionsBottom(new PlayCard(fire, tile));
        }
      }
    },
  }),
});

export const Hermit = new CardType({
  category: Human,
  sprite: Sprites.card_hermit,
  name: "Hermit",
  counter: 2,
  remains: Bones,
  onPlay: new CardEffect({
    description:
      "Deal damage to all adjacent enemies if there are no adjacent allies.",
    condition(game, card) {
      let allies = Targeting.select(
        game,
        card,
        Targeting.adjacent,
        Targeting.allies,
      );
      return allies.length === 0;
    },
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({ card: target, vfx: VFX.slash }),
        );
      }
    },
  }),
});

const Heroics = new CardEffect({
  description:
    "Help a random adjacent injured ally retreat, then take their place",
  targeting: [Targeting.adjacent, Targeting.allies, Targeting.injured],
  run(game, card, targets) {
    let target = randomItem(targets);
    if (target) {
      game.board.addActionsBottom(
        new DiscardCard(target),
        new MoveCard(card, target.tile),
      );
    }
  },
});

export const Hero = new CardType({
  category: Human,
  sprite: Sprites.card_hero,
  name: "Hero",
  counter: 3,
  remains: Bones,
  onPlay: [Heroics, SlashAllAdjacentEnemies, Inspire],
});

export const Wizard = new CardType({
  category: Human,
  sprite: Sprites.card_wizard,
  name: "Wizard",
  counter: 3,
  remains: Bones,
  onPlay: new CardEffect({
    targeting: [Targeting.adjacent, Targeting.enemies, Targeting.connected],
    description: "Cast lightning through all connected enemies",
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({ card: target, vfx: VFX.magic }),
        );
      }
    },
  }),
});

export const Commander = new CardType({
  category: Human,
  sprite: Sprites.card_commander,
  name: "Commander",
  counter: 3,
  onPlay: [Inspire, SlashAllAdjacentEnemies],
  remains: Bones,
});

export const Champion = new CardType({
  category: Human,
  sprite: Sprites.card_champion,
  name: "Champion",
  counter: 3,
  remains: Bones,
  onPlay: [SlashAllAdjacentEnemies],
});

export const Abbess = new CardType({
  category: Human,
  sprite: Sprites.card_abbess,
  name: "Abbess",
  counter: 3,
  remains: Bones,
  onPlay: [HealAdjacentAllies],
  onTurn: [HealRandomAdjacentAlly],
});

export const Lord = new CardType({
  category: Human,
  sprite: Sprites.card_lord,
  name: "Lord",
  counter: 3,
  remains: Bones,
  onDefeat: Hopeless,
  onTurn: PullAllies,
  onPlay: new CardEffect({
    description: "Add 2 spearmen to your hand",
    run(game) {
      for (let i = 0; i < 2; i++) {
        game.board.addActionsBottom(new CreateCardInHand(new Card(Spearman)));
      }
    },
  }),
});

export const Bard = new CardType({
  category: Human,
  sprite: Sprites.card_bard,
  name: "Bard",
  remains: Bones,
  counter: 1,
  onPlay: new CardEffect({
    description: `Gain +1 ${Icons.morale} morale for each adjacent enemy.`,
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, targets) {
      if (targets.length > 0) {
        game.board.addActionsBottom(new ChangeMoraleAction(targets.length));
      }
    },
  }),
});

export const Surgeon = new CardType({
  category: Human,
  sprite: Sprites.card_surgeon,
  name: "Surgeon",
  counter: 1,
  remains: Bones,
  onPlay: new CardEffect({
    description: `Deal 1 damage to adjacent allies then return them to your draw pile`,
    targeting: [Targeting.adjacent, Targeting.allies],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({ card: target, vfx: VFX.slash }),
          new ReturnCardToDrawPile(target),
        );
      }
    },
  }),
});

export const Wytch = new CardType({
  category: Human,
  sprite: Sprites.card_wytch,
  name: "Wytch",
  counter: 1,
  remains: Bones,
  onPlay: [
    new CardEffect({
      description: "Damage adjacent enemies",
      targeting: [Targeting.adjacent, Targeting.enemies],
      run(game, card, targets) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.slash }),
          );
        }
      },
    }),
    new CardEffect({
      description: "Heal adjacent allies",
      targeting: [Targeting.adjacent, Targeting.allies],
      run(game, card, targets) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.heal, amount: -1 }),
          );
        }
      },
    }),
  ],
});

export const Demon = new CardType({
  category: Human,
  sprite: Sprites.card_demon,
  name: "Demon",
  counter: 3,
  onPlay: new CardEffect({
    description: "Push allies away then attack all adjacent cards three times.",
    targeting: [Targeting.adjacent],
    run(game, card, targets) {
      for (let target of targets) {
        if (card.isAlly(target)) {
          game.board.addActionsBottom(new Push(card, target));
        }
      }

      targets = game.board.getAdjacentCards(card);

      for (let i = 0; i < 3; i++) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.slash }),
          );
        }

        game.board.addActionsBottom(new Delay(500));
      }
    },
  }),
});

const CultistChant = new CardEffect({
  description: "Heal adjacent cultists",
  targeting: [
    Targeting.adjacent,
    Targeting.custom(
      /** @returns {boolean} */
      (card) => card.type === Cultist,
    ),
  ],
  run(game, card, targets) {
    for (let target of targets) {
      game.board.addActionsBottom(
        new Damage({ card: target, vfx: VFX.heal, amount: -1 }),
      );
    }
  },
});

const CultistSummoning = new CardEffect({
  description:
    "If three cultists are adjacent, discard them and summon a demon into your hand",
  targeting: [
    Targeting.adjacent,
    Targeting.custom(
      /** @returns {boolean} */
      (card) => card.type === Cultist,
    ),
  ],
  condition(game, card, targets) {
    return targets.length >= 2;
  },
  run(game, card, targets) {
    game.board.addActionsBottom(new DiscardCard(card));

    for (let target of targets) {
      game.board.addActionsBottom(new DiscardCard(target));
    }

    let demon = new Card(Demon);
    game.board.addActionsBottom(new CreateCardInHand(demon));
  },
});

export const Cultist = new CardType({
  category: Human,
  sprite: Sprites.card_cultist,
  name: "Cultist",
  counter: 1,
  remains: Bones,
  onPlay: [CultistSummoning, CultistChant, SlashStrongestAdjacentEnemies],
});

export const Gravedigger = new CardType({
  category: Human,
  sprite: Sprites.card_gravedigger,
  name: "Gravedigger",
  counter: 1,
  remains: Bones,
  onPlay: new CardEffect({
    description: "Draw a card for each adjacent set of bones",
    targeting: [Targeting.adjacent, Targeting.tag(Tags.Bones)],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(new DestroyCard(target), new DrawCard());
      }
    },
  }),
});

export const Cardinal = new CardType({
  category: Human,
  sprite: Sprites.card_cardinal,
  name: "Cardinal",
  counter: 1,
  remains: Bones,
  onPlay: new CardEffect({
    description: `Gain +1 ${Icons.morale} morale for each adjacent set of bones.`,
    targeting: [Targeting.adjacent, Targeting.tag(Tags.Bones)],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(new DestroyCard(target));
      }
      game.board.addActionsBottom(new ChangeMoraleAction(targets.length));
    },
  }),
});

export const Thrall = new CardType({
  category: Human,
  sprite: Sprites.card_thrall,
  name: "Thrall",
  counter: 1,
  onPlay: SlashRandomAdjacentEnemy,
});

export const Lich = new CardType({
  category: Human,
  sprite: Sprites.card_lich,
  name: "Lich",
  counter: 2,
  onPlay: new CardEffect({
    description: "Turn adjacent bones into thralls.",
    targeting: [Targeting.adjacent, Targeting.tag(Tags.Bones)],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new DestroyCard(target),
          new CreateCardInHand(new Card(Thrall)),
        );
      }
    },
  }),
});

export const Caller = new CardType({
  category: Human,
  sprite: Sprites.card_caller,
  name: "Caller",
  counter: 1,
  onPlay: new CardEffect({
    description: "Resurrect one card for each set of adjacent bones.",
    targeting: [Targeting.adjacent, Targeting.tag(Tags.Bones)],
    run(game, card, bones) {
      let gravePileQueue = Array.from(game.board.gravePile);

      for (let target of bones) {
        let card = gravePileQueue.pop();

        if (!card) {
          return;
        }

        game.board.addActionsBottom(new DestroyCard(target));

        if (card.category === Human) {
          game.board.addActionsBottom(new ReturnCardToHand(card));
        } else {
          game.board.addActionsBottom(new PlayCard(card, target.tile));
        }
      }
    },
  }),
});

export const Ghost = new CardType({
  category: Human,
  sprite: Sprites.card_ghost,
  name: "Ghost",
  // TODO: Ghost can't be "killed"
  onPlay: SlashAllAdjacentEnemies,
  onTurn: new CardEffect({
    description: `-1 ${Icons.morale} morale if adjacent to allies.`,
    targeting: [Targeting.adjacent, Targeting.allies],
    run(game, card, targets) {
      if (targets.length > 0) {
        game.board.addActionsBottom(new ChangeMoraleAction(-1));
      }
    },
  }),
});

export const Gryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_gryphon,
  name: "Gryphon",
  counter: 2,
  remains: GryphonBones,
  onTurn: ClawRandomAdjacentEnemy,
});

export const YoungGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_young_gryphon,
  name: "Young Gryphon",
  counter: 1,
  remains: GryphonBones,
  onTurn: ClawRandomAdjacentEnemy,
});

export const RestlessGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_restless_gryphon,
  name: "Restless Gryphon",
  counter: 3,
  remains: GryphonBones,
  onTurn: ClawRandomAdjacentEnemy,
  onDamage: Fly,
});

export const ProudGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_proud_gryphon,
  name: "Proud Gryphon",
  counter: 5,
  remains: GryphonBones,
  onTurn: new CardEffect({
    description: "Attack the strongest adjacent enemies",
    targeting: [Targeting.adjacent, Targeting.enemies, Targeting.strongest],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
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
  remains: GryphonBones,
  onTurn: new CardEffect({
    description: "Attack the weakest adjacent enemies",
    targeting: [Targeting.adjacent, Targeting.enemies, Targeting.weakest],
    run(game, card, targets) {
      for (let target of targets) {
        game.board.addActionsBottom(
          new Damage({
            card: target,
            vfx: VFX.claw,
          }),
        );
      }
    },
  }),
});

export const HornedGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_horned_gryphon,
  name: "Horned Gryphon",
  counter: 3,
  remains: GryphonBones,
  onTurn: [ClawRandomAdjacentEnemy, Fly],
});

const SkeletalFury = new CardEffect({
  description:
    "Attack one extra random adjacent enemy for each adjacent set of bones",
  targeting: [Targeting.adjacent, Targeting.enemies],
  run(game, card, targets) {
    let bones = game.board
      .getAdjacentCards(card)
      .filter((card) => card.type === Bones);

    for (let bone of bones) {
      let target = randomItem(targets);

      if (target) {
        game.board.addActionsBottom(
          new DestroyCard(bone),
          new Damage({ card: target, vfx: VFX.claw }),
        );
      }
    }
  },
});

export const SkeletalGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_skeletal_gryphon,
  name: "Skeletal Gryphon",
  remains: GryphonBones,
  counter: 3,
  onTurn: [ClawRandomAdjacentEnemy, SkeletalFury],
});

export const GhostlyGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_ghostly_gryphon,
  name: "Ghostly Gryphon",
  counter: 3,
  onTurn: [Fly, ClawRandomAdjacentEnemy],
});

export const ThornyGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_thorny_gryphon,
  name: "Thorny Gryphon",
  counter: 3,
  onDamage: ClawRandomAdjacentEnemy,
});

export const MatriarchGryphon = new CardType({
  category: Monster,
  sprite: Sprites.card_matriarch_gryphon,
  name: "Matriarch",
  counter: 5,
  onTurn: new CardEffect({
    description:
      "If there are adjacent enemies, attack them, otherwise create a young gryphon in an adjacent empty tile.",
    targeting: [Targeting.adjacent, Targeting.enemies],
    run(game, card, targets) {
      if (targets.length > 0) {
        for (let target of targets) {
          game.board.addActionsBottom(
            new Damage({ card: target, vfx: VFX.claw }),
          );
        }
      } else {
        let tiles = game.board.getAdjacentTiles(card.tile);
        let emptyTiles = tiles.filter((tile) => tile.isEmpty());
        let emptyTile = randomItem(emptyTiles);

        if (emptyTile) {
          game.board.addActionsBottom(
            new PlayCard(new Card(YoungGryphon), emptyTile),
          );
        }
      }
    },
  }),
});
