import mongoose from "mongoose"
import {ENV} from "./env.js"

export const connectDB= async () => {
try{
    if(!ENV.DB_URL){
        //Err if not found
          throw new Error ("DB_URL is not define in environment variable")
    }
    const connect=await mongoose.connect(ENV.DB_URL, {
  dbName: 'codearena', 
});
    console.log("✅ Connected to mongoDB : " , connect.connection.host )
}catch(err){
    console.error("DB connection error:", err.message);
    // Don't call process.exit in serverless — throw so caller can handle
    throw err;
}

}