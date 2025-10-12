// @ts-check

import {
  Bones,
  Cleric,
  Commander,
  Gladiator,
  Gryphon,
  Hero,
  Hunter,
  Knight,
  Lich,
  RestlessGryphon,
  Rocks,
  Wizard,
  YoungGryphon,
} from "./cards.js";
import { Card, Game } from "./game.js";
import { BoardScreen, MenuScreen } from "./screens.js";
import { UI } from "./ui.js";
import { randomItem } from "./utils.js";

let game = new Game();

for (let i = 0; i < 20; i++) {
  let type = randomItem([
    Hunter,
    Cleric,
    Knight,
    Hero,
    Lich,
    Gladiator,
    Commander,
    Wizard,
  ]);
  let card = new Card(type);
  game.deck.addToTop(card);
}

for (let i = 0; i < 10; i++) {
  let type = randomItem([
    Gryphon,
    YoungGryphon,
    RestlessGryphon,
    Gryphon,
    YoungGryphon,
    Rocks,
    Bones,
  ]);
  let card = new Card(type);
  let tile = randomItem(game.board.tiles);

  if (tile?.isEmpty()) {
    tile.add(card);
  }
}

UI.init(new BoardScreen(game));
