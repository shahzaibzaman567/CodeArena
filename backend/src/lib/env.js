import dotenv from "dotenv";
dotenv.config();  // load .env file

export let ENV = {
    port: process.env.PORT ,
    DB_URL: process.env.DB_URL,
    NODE_ENV: process.env.NODE_ENV ,
};

console.log("PORT:", ENV.port);