import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { motion } from "framer-motion"; // Import Framer Motion
import "./App.css";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import yarona from "./assets/yarona.webp"; // Import the loading image

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a loading delay of 2 seconds
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <motion.img
          src={yarona}
          alt="Loading"
          initial={{ opacity: 1, scale: 3.18 }}
          animate={{ opacity: 1, scale: 3.5 }}
          transition={{ duration: 1.25 }}
        />
        <div className="loading-bar-container">
          <div className="loading-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
          <Route path="/admin25pwd" element={<Admin />} />
        </Routes>
      </Router>
    </>
  );
}
