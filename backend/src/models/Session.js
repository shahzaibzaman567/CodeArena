import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        problem:{
            required:true,
            type:String
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

        }

    },{timestamps:true}
)

const Session = mongoose.model("Session",sessionSchema)


export default Session