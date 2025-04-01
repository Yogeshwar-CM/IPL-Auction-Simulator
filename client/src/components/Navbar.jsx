import React from "react";
import "./Navbar.css";
import nexus from "../assets/nexus.png";
import hits from "../assets/hits.png";
import yarona from "../assets/yarona.webp"; // Import the new logo

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo left-logo">
        <img src={hits} alt="Left Logo" />
      </div>
      {/* <div className="center">IPL AUCTION</div> */}
      <div className="navbar-logo right-logo">
        <img src={nexus} alt="Right Logo" />
      </div>
    </nav>
  );
}
