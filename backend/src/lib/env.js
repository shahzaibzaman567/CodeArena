import dotenv from "dotenv";
dotenv.config()

export let ENV = {
    port :process.env.port,
    DB_url : process.env.DB_url,
    NODE_ENV : process.env.NODE_ENV 
}
