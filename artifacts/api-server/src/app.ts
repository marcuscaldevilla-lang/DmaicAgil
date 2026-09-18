import router from "./routes";
import { createApp } from "./appFactory";

const app = createApp(router);

export default app;
