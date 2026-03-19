import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
       type:String,
       require:true
    },
    email:{
      type:String,
      require:true,
      unique:true
    },
    profileImage:{
        type:String,
        default:""
    },
    clerkId:{
     type:String,
      require:true,
      unique:true   
    }
},{timestamps:true})// createdAt updatedAT
 
const Usermodel = mongoose.model("User",userSchema);
 
export default Usermodel