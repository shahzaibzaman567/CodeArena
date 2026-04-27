import express from "express";
import { 
    saveSubmission, 
    getSubmission, 
    getUserSubmissions 
} from "../controllers/submissionController.js";
import { protectRoute } from "../middleware/protectRoutes.js";

const router = express.Router();

// All submission routes require authentication
router.use(protectRoute);

router.post("/save", saveSubmission);
router.get("/get", getSubmission);
router.get("/all", getUserSubmissions);

export default router;
