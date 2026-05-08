import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import sentencesRouter from "./sentences";
import legalRouter from "./legal";
import travelRouter from "./travel";
import lawyersRouter from "./lawyers";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(sentencesRouter);
router.use(legalRouter);
router.use(travelRouter);
router.use(lawyersRouter);
router.use(activitiesRouter);
router.use(dashboardRouter);

export default router;
