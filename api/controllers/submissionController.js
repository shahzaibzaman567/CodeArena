import Submission from "../models/Submission.js";
import Problem from "../models/Problem.js";

export const saveSubmission = async (req, res) => {
    try {
        const { problemId, problemTitle, language, code, status } = req.body;
        const userId = req.user._id;

        if (!problemId || !language || !code) {
            return res.status(400).json({ message: "Problem ID, language, and code are required" });
        }

        // Check if problem exists
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        // Upsert submission (Update if exists, create if not)
        const submission = await Submission.findOneAndUpdate(
            { userId, problemId, language },
            { code, problemTitle: problemTitle || problem?.title || "Untitled Problem", status: status || "draft" },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Progress saved successfully", submission });
    } catch (error) {
        console.error("Error saving submission:", error);
        res.status(500).json({ message: "Failed to save progress", error: error.message });
    }
};

export const getSubmission = async (req, res) => {
    try {
        const { problemId, language } = req.query;
        const userId = req.user._id;

        if (!problemId || !language) {
            return res.status(400).json({ message: "Problem ID and language are required" });
        }

        const submission = await Submission.findOne({ userId, problemId, language });

        res.status(200).json({ submission });
    } catch (error) {
        console.error("Error fetching submission:", error);
        res.status(500).json({ message: "Failed to fetch progress", error: error.message });
    }
};

export const getUserSubmissions = async (req, res) => {
    try {
        const userId = req.user._id;
        const submissions = await Submission.find({ userId }).populate("problemId", "title difficulty");
        res.status(200).json({ submissions });
    } catch (error) {
        console.error("Error fetching user submissions:", error);
        res.status(500).json({ message: "Failed to fetch user submissions", error: error.message });
    }
};
