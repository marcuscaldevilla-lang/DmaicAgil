import { Router, type IRouter } from "express";
import dmaicRouter from "./dmaic";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dmaicRouter);

export default router;
