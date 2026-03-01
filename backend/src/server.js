import express from "express";
import dotenv from "dotenv";
import { ENV } from "./lib/env.js";
import path from "path";
import { connectDB } from "./lib/db.js";
import cors from "cors"
import server from "inngest/express";
import { Inngest } from "inngest";
import { Functions, inngest } from "./lib/inngest.js";
dotenv.config();

const app = express();
const __dirname = path.resolve()
//middleware
app.use(express.json())
app.use(cors({origin:ENV.CLIENT_URL,credentials:true}))//credentials: true meaning =>server allows a browser to on req
app.use("/api/inngest",server({client:inngest,Functions}))


//get health api
app.get("/health", (req, res) => {
  res.status(200).json({ message: "api is up and running on 1234 " });
});
//get a api books api
app.get("/books", (req, res) => {
  res.status(200).json({ message: "this is the book end point" });
});

const serverStart = async () =>{
  
  try{
    app.listen(ENV.port,() => {  console.log(`server started on port ${ENV.port}`)});
    connectDB()
  }catch(err){
    console.log(err)
  }
  
}

serverStart()
//make our app ready for deployment
// if(ENV.NODE_ENV === "production"){
//     app.use(express.static(path.join(__dirname,"frontend","dist")))
//     app.get("/{*any}",(req,res)=>{
//       res.sendFile(path.join(__dirname,"frontend","dist","index.html"))
//     })
// }
// console.log(path.join(__dirname,"frontend","dist"))
// app.use((req,res,next)=>{
// })