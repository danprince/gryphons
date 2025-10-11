// @ts-check

import {
  Bones,
  Cleric,
  Gladiator,
  Gryphon,
  Hero,
  Hunter,
  Knight,
  Lich,
  RestlessGryphon,
  Rocks,
  YoungGryphon,
} from "./cards.js";
import { Card, Game } from "./game.js";
import { MenuScreen } from "./screens.js";
import { UI } from "./ui.js";
import { randomItem } from "./utils.js";

let game = new Game();

for (let i = 0; i < 20; i++) {
  let type = randomItem([Hunter, Cleric, Knight, Hero, Lich, Gladiator]);
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
  if (tile.isEmpty()) {
    tile.add(card);
  }
}

UI.init(new MenuScreen(game));
