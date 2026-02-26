import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
       typeof:String,
       require:true
    },
    email:{
      typeof:String,
      require:true,
      unique:true
    },
    profileImage:{
        typeof:String,
        default:""
    },
    clerkId:{
     typeof:String,
      require:true,
      unique:true   
    }
},{timestamps:true})// createdAt updatedAT

export  default  Usermodel=mongoose.model("User",userSchema);