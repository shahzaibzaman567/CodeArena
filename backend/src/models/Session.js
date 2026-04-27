import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        problem:{
            required:true,
            type:String
        },
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Problem",
            default: null
        },
        difficulty:{
            type:String,
          required:true,
          enum:["easy","medium","hard"]
        },
        host:{
            type:mongoose.Schema.Types.ObjectId,
            required:true,
            ref:"User",
        },
        participant:{
            type:mongoose.Schema.Types.ObjectId,
            default:null,
            ref:"User",
        },
        status:{
         type:String,
         enum:["active", "completed"],
         default:"active"
        },
        callId:{
            type:String,
            default:""
        },
        // Feature 1: Session description and host capacity control
        description:{
            type:String,
            default:""
        },
        maxParticipants:{
            type:Number,
            default:1,
            min:1,
            max:5
        },
        invitedUsers:[{
            email:String,
            status:{
                type:String,
                enum:["pending", "accepted", "rejected"],
                default:"pending"
            }
        }],
        languageCodeMap: {
            type: Map,
            of: String,
            default: {}
        },
        isChallengeMode: {
            type: Boolean,
            default: false
        }

    },{timestamps:true}
)

const Session = mongoose.model("Session",sessionSchema)


export default Session