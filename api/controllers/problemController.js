const SEED_PROBLEMS = [
  {
    title: "Two Sum",
    difficulty: "easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    testCases: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
    ],
    isDummy: true
  },
  {
    title: "Reverse String",
    difficulty: "easy",
    description: "Write a function that reverses a string. The input string is given as an array of characters s.",
    testCases: [
      { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' }
    ],
    isDummy: true
  },
  {
    title: "Valid Palindrome",
    difficulty: "easy",
    description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
    testCases: [
      { input: 's = "A man, a plan, a canal: Panama"', output: "true" }
    ],
    isDummy: true
  },
  {
    title: "Maximum Subarray",
    difficulty: "medium",
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    testCases: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6" }
    ],
    isDummy: true
  }
];

import Problem from "../models/Problem.js";

export const createProblem = async (req, res) => {
  try {
    const { title, difficulty, description, testCases, starterCode } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Problem title is required" });
    }

    const existingProblem = await Problem.findOne({ title });
    if (existingProblem) {
      return res.status(400).json({ message: "A problem with this title already exists" });
    }

    const problem = new Problem({
      title,
      difficulty: difficulty || "easy",
      description: description || "",
      testCases: testCases || [],
      starterCode: starterCode || {},
      createdBy: req.user?._id,
    });

    await problem.save();
    res.status(201).json({ message: "Problem created successfully", problem });
  } catch (error) {
    console.error("Error creating problem:", error);
    res.status(500).json({ message: "Failed to create problem", error: error.message });
  }
};

export const getProblems = async (req, res) => {
  try {
    const { search } = req.query;
    // req.user may be undefined on public route — check safely
    const userEmail = req.user?.email;
    const isAdminUser = userEmail === "shahzaibzaman465@gmail.com";

    let query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // FILTER LOGIC: If not the admin user, hide dummy problems
    if (!isAdminUser) {
      query.isDummy = { $ne: true };
    }

    let problems = await Problem.find(query).populate("createdBy", "name email");

    // SEEDING LOGIC: If no problems exist in the DB, seed them (only happens once)
    const totalCount = await Problem.countDocuments();
    if (totalCount === 0 && !search) {
      console.log("Seeding dummy problems...");
      await Problem.insertMany(SEED_PROBLEMS.map(p => ({
        ...p,
        createdBy: req.user?._id
      })));
      problems = await Problem.find(query).populate("createdBy", "name email");
    }

    res.status(200).json({ problems });
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ message: "Failed to fetch problems", error: error.message });
  }
};

export const deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    await Problem.findByIdAndDelete(id);
    res.status(200).json({ message: "Problem deleted successfully" });
  } catch (error) {
    console.error("Error deleting problem:", error);
    res.status(500).json({ message: "Failed to delete problem", error: error.message });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id).populate("createdBy", "name email");
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    res.status(200).json({ problem });
  } catch (error) {
    console.error("Error fetching problem:", error);
    res.status(500).json({ message: "Failed to fetch problem", error: error.message });
  }
};
