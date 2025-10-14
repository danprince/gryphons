import { Game } from "./game.js";
import { MenuScreen } from "./screens.js";
import { UI } from "./ui.js";

let game = new Game();

UI.init(new MenuScreen(game));
