import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";

// Create a single socket instance that can be shared across components
const socket = io("http://localhost:3000");

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Fetch initial data and set up WebSocket listeners
  useEffect(() => {
    // Initial data load
    fetchData();

    // Set up socket listeners for global updates
    socket.on("update:selectedPlayer", (player) => {
      console.log("Home received selected player:", player);
      setSelectedPlayer(player);
    });

    socket.on("update:teams", (updatedTeams) => {
      console.log("Home received updated teams:", updatedTeams);
      setTeams(updatedTeams);

      // If we have a selected team, update it with fresh data from the server
      if (selectedTeam) {
        const freshTeamData = updatedTeams.find(
          (team) => team.id === selectedTeam.id
        );
        if (freshTeamData) {
          setSelectedTeam(freshTeamData);
        }
      }
    });

    // Listen for selected team broadcasts
    socket.on("update:selectedTeam", (team) => {
      console.log("Selected team update from server:", team);
      // Only update if this is the team we're currently viewing
      if (selectedTeam && team.id === selectedTeam.id) {
        setSelectedTeam(team);
      }
    });

    // Cleanup function to remove listeners when component unmounts
    return () => {
      socket.off("update:selectedPlayer");
      socket.off("update:teams");
      socket.off("update:selectedTeam");
    };
  }, [selectedTeam]); // Add selectedTeam as dependency to properly update

  // Effect to handle default team selection
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      // Default to the first team if no team is selected
      setSelectedTeam(teams[0]);
      // Emit to server which team this client is viewing
      socket.emit("select:team", teams[0].id);
    }
  }, [teams, selectedTeam]);

  const fetchData = () => {
    fetch("http://localhost:3000/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data);
      })
      .catch((err) => console.error("Error fetching teams:", err));
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    // Emit to server which team this client is viewing
    socket.emit("select:team", team.id);
  };

  // Helper function to calculate player roles
  const calculateRoleCounts = (players) => {
    const counts = { batters: 0, bowlers: 0, allRounders: 0 };
    players.forEach((player) => {
      if (player.role === "Batter") counts.batters++;
      else if (player.role === "Bowler") counts.bowlers++;
      else if (player.role === "All-Rounder") counts.allRounders++;
    });
    return counts;
  };

  // Default placeholder logo
  const defaultLogo =
    "https://www.rcbshop.com/cdn/shop/files/Artboard_1_d8d2bccd-ad1c-4e2e-ba21-144aa9124743.png";

  return (
    <motion.div
      initial={{ opacity: 0.7, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.8 }}
      className="home-container"
    >
      <img
        className="header-img"
        src="https://thumbs.dreamstime.com/b/cricket-red-ball-stadium-lighting-natural-green-grass-horizontal-sport-theme-poster-greeting-cards-headers-website-app-290793545.jpg"
        alt=""
      />
      {/* Currently Selected Player */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            className="selected-player"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Currently Selected Player</h2>
            <p>Name: {selectedPlayer.name}</p>
            <p>Role: {selectedPlayer.role}</p>
            <p>Points: {selectedPlayer.points}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Info */}
      {selectedTeam && (
        <>
          <div className="team-info">
            <div className="tl">
              <img
                src={selectedTeam.logo || defaultLogo}
                alt={selectedTeam.name}
                className="team"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = defaultLogo;
                }}
              />
              <div className="ins-info">
                <h1>{selectedTeam.name}</h1>
                <h2>TEAM NAME</h2>
              </div>
            </div>
            <div className="tr">
              <p className="coins">
                <i className="fa-solid fa-indian-rupee-sign"></i>
                {selectedTeam.budget.toLocaleString()} L
              </p>
            </div>
          </div>

          {/* Players Table */}
          <div className="players-table">
            <h2>Players List</h2>
            <table>
              <thead>
                <tr>
                  <th>S. No</th>
                  <th>Player Image</th>
                  <th>Player Name</th>
                  <th>Points</th>
                  <th>Role</th>
                  <th>Foreigner</th>
                  <th>Purchased for (₹ Cr)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 16 }).map((_, index) => {
                  const player = selectedTeam.players[index];
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        {player ? (
                          <img
                            src={player.image}
                            alt={player.name}
                            style={{
                              width: "50px",
                              height: "50px",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          ""
                        )}
                      </td>
                      <td>{player ? player.name : ""}</td>
                      <td>{player ? player.points : ""}</td>
                      <td>{player ? player.role : ""}</td>
                      <td>{player ? (player.foreigner ? "Yes" : "No") : ""}</td>
                      <td>{player ? player.purchasedFor : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="allt">All Teams</h2>
      {/* Horizontal Scrollable Cards */}
      <div className="team-carousel">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`team-card ${
              selectedTeam?.id === team.id ? "selected" : ""
            }`}
            onClick={() => handleTeamSelect(team)}
          >
            <img
              src={team.logo || defaultLogo}
              alt={team.name}
              className="team-card-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultLogo;
              }}
            />
            <h3>{team.name}</h3>
            <p className="team-budget-label">
              ₹ {team.budget.toLocaleString()} L
            </p>
            <p className="team-players-label">Players: {team.players.length}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
