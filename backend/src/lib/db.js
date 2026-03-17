import mongoose from "mongoose"
import {ENV} from "./env.js"


export const connectDB= async () => {
try{
    if(!ENV.DB_URL){
        //Err if not found
          throw new Error ("DB_URL is not define in environment variable")
    }
    const connect=await mongoose.connect(ENV.DB_URL)
    console.log("✅ Connected to mongoDB : " , connect.connection.host )
}catch(err){
console.log(" Erro " , err)
//process to exit
process.exit(1)// 0 means success and 1 means fail
}

}