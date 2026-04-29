import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Problem",
            required: true
        },
        problemTitle: {
            type: String,
            required: true
        },
        language: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["draft", "solved"],
            default: "draft"
        }
    },
    { timestamps: true }
);

// Unique constraint to ensure one submission per user per problem per language
submissionSchema.index({ userId: 1, problemId: 1, language: 1 }, { unique: true });

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;
