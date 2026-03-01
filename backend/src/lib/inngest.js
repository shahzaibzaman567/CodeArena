import { connectDB } from "./db.js";
import  { Inngest } from "inngest";
import User from "../models/User.js";

export const inngest = new Inngest({id:"code-arena"})

const syncUser=inngest.createFunction(
    {id:"sync-user"},
    {event:"clerk/user.created"},
    async({event})=>{
        await connectDB()
            const {id,email_addresses,first_name,last_name,image_url}=event.data
            const newUser={
                clerkId:id,
                email:email_addresses[0].email_address,
                name:`${    first_name || ""} ${last_name || ""}`,
                profileImage:image_url
            }
         await   User.create(newUser)
    }
)
//delet user from database
const DeleteUserFromDB=inngest.createFunction(
    {id:"delete-user-from-db"},
    {event:"clerk/user.delted"},
    async({event})=>{
        await connectDB()
            const {id}=event.data
           await User.deleteOne({clerkId:id})
    }
)

export const Functions = [syncUser,DeleteUserFromDB];










