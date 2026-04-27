import express from "express"
import { getStreamToken } from "../controllers/chatController.js";
import { protectRoute } from "../middleware/protectRoutes.js";
import { checkUserByEmail, createSession, deleteSession, endSession, getActiveSession, getMyRecentSession, getSessionById, joinSession, searchSessions, updateSession } from "../controllers/sessionController.js";

const router = express.Router();

router
.post("/",protectRoute,createSession)
.get("/active",protectRoute,getActiveSession)
.get("/search",protectRoute,searchSessions)
.get("/search-user",protectRoute,checkUserByEmail)
.get("/my-recent",protectRoute,getMyRecentSession)
.get("/:id",protectRoute,getSessionById)
.put("/:id",protectRoute,updateSession)
.post("/:id/join",protectRoute,joinSession)
.post("/:id/end",protectRoute,endSession)
.delete("/:id",protectRoute,deleteSession)


export const sessionRoutes =  router; 