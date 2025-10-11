import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// happy-dom doesn't support canvas 2d.
HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {});
