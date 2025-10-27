import { generateBoard, STARTING_DECK } from "./campaign.js";
import { Card, Game } from "./game.js";
import { BoardScreen } from "./screens.js";
import { UI } from "./ui.js";

let game = new Game();

game.deck.addToTop(...STARTING_DECK.map((type) => new Card(type)));
game.board = generateBoard(game);
game.startRound();

UI.init(new BoardScreen(game));
