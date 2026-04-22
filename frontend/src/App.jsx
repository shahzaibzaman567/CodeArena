import { useState } from 'react'
import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import {Routes,Route, Navigate} from "react-router-dom"
import HomePage from './pages/home.jsx';
// import AboutPage from './pages/about.jsx';
import ProbelmsPage from './probelmsPages/problemspage.jsx';
import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/dashboard.jsx"
function App() {

  const {isSignedIn,isLoaded} = useUser();
  
  if(!isLoaded) return null


  return (
    <>
    <Routes>
    <Route path="/" element={!isSignedIn ? <HomePage/>:<Navigate to={"/dashboard"}/>}></Route>
    <Route path="/dashboard" element={isSignedIn ? <DashboardPage/>:<Navigate to={"/"}/>}></Route>
    {/* <Route path="/about" element={<AboutPage/>}></Route> */}
    <Route path="/problems" element={isSignedIn ? <ProbelmsPage/>:<Navigate to={"/"}/>}></Route>
    </Routes>
    <Toaster position='top-right' toastOptions={{duration:3000}}/>
    </>
  )
}

export default App
