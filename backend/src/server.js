import express from "express";
import dotenv from "dotenv";
import { ENV } from "./lib/env.js";
import path from "path";
dotenv.config();

const app = express();
const __dirname = path.resolve()
//get health api
app.get("/health", (req, res) => {
  res.status(200).json({ message: "api is up and running on 1234 " });
});
//get a api books api
app.get("/books", (req, res) => {
  res.status(200).json({ message: "this is the book end point" });
});

//make our app ready for deployment
if(ENV.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")))
    app.get("/{*any}",(req,res)=>{
      res.sendFile(path.join(__dirname,"../frontend","dist","index.html"))
    })
}

app.listen(ENV.port, () => console.log(`server started on port ${ENV.port}`));
// push your folder on github repo 
//step of after 30m to 35