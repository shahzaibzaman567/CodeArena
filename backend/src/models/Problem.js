import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    description: {
      type: String,
      default: "",
    },
    testCases: [
      {
        input: String,
        output: String,
      },
    ],
    // 🛡️ Senior Dev: Store starter code for multiple languages
    starterCode: {
      type: Map,
      of: String,
      default: {}
    },
    // 🛡️ Senior Dev: Store expected output for each language
    expectedOutput: {
      type: Map,
      of: String,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDummy: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Problem = mongoose.models.Problem || mongoose.model("Problem", problemSchema);

export default Problem;
