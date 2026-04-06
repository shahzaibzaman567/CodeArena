import {StreamChat} from "stream-chat"
import { ENV } from "./env.js"

const apiKey=ENV.STREAM_API_KEY
const apiSecret=ENV.STREAM_API_SECRET

if(!apiKey || !apiSecret){
    console.error("STREAM_API_KEY or STREAM_API_SECRET missing");
}

export const chatClient = StreamChat.getInstance(apiKey,apiSecret);

export const upsertStreamUser = async(userData)=>{
try{
await chatClient.upsertUser(userData)
console.log("stream User upserted successfully ")
return userData;
}catch(err){
console.log("Error upserting stream User: ",err)
}

}

export const deleteStreamUser = async(userData)=>{
try{
await chatClient.upsertUser(userData)
console.log("stream User deleted successfully ")
return userData;
}catch(err){
console.log("Error deleteing  stream User: ",err)
}

}