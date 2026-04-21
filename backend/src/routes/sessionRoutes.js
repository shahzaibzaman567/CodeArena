import express from "express"
import { getStreamToken } from "../controllers/chatController.js";
import { protectRoute } from "../middleware/protectRoutes.js";
import { createSession, endSession, getActiveSession, getMyRecentSession, getSessionById, joinSession } from "../controllers/sessionController.js";

const router = express.Router();

router
.post("/",protectRoute,createSession)
.get("/active",protectRoute,getActiveSession)
.get("/my-recent-",protectRoute,getMyRecentSession)
.get("/:id",protectRoute,getSessionById)
.post("/:id/join",protectRoute,joinSession)
.post("/:id/end",protectRoute,endSession)


export const sessionRoutes =  router; 