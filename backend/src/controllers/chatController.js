import { chatClient } from "../lib/stream.js"




export const getStreamToken = async (req,res) => {
try{
    // user clerkId for stream (not mongoDB id ) =>it should match the id and we have in the stream dashboard

    const token = chatClient.createToken(req.user.clerkId)
    res.status(200).json({
        token,
        userId:req.user.clerkId,
        userImage:req.user.image,
        userName:req.user.name
    })
}catch(err){
console.error("Error in getStreamToken controller",err.message)
res.status(500).json({message:"Internal server error"})
}
}