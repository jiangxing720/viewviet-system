import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import sentencesRouter from "./sentences";
import legalRouter from "./legal";
import travelRouter from "./travel";
import lawyersRouter from "./lawyers";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import interpreterRouter from "./interpreter";
import settingsRouter from "./settings";
import adminUsersRouter from "./admin-users";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use(interpreterRouter);
router.use(healthRouter);
router.use(wordsRouter);
router.use(sentencesRouter);
router.use(legalRouter);
router.use(travelRouter);
router.use(lawyersRouter);
router.use(activitiesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(adminUsersRouter);

export default router;
