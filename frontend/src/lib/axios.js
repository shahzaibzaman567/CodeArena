import axios from "axios"

const axiosIntance = axios.create({
    baseURL:import.meta.env.VITE_API_URL,
    withCredentials:true  //by adding this field browser will send the cookies on every singal request
})

export default axiosIntance;