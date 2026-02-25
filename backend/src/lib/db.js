import mongoose from "mongoose"
import {ENV} from "./env.js"


export const connectDB= async () => {
try{
    const connect=await mongoose.connect(ENV.DB_URL)
    console.log("✅Connected to mongoDB : " , connect.connection.host )
}catch(err){
console.log(" Erro " , err)
process.exit(1)// 0 means success and 1 means fail
}

}