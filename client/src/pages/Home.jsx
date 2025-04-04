import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";

const socket = io("https://ipl-auction-simulator.onrender.com");

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchData();
    socket.on("update:selectedPlayer", (player) => {
      console.log("Home received selected player:", player);
      setSelectedPlayer(player);
    });

    socket.on("update:teams", (updatedTeams) => {
      console.log("Home received updated teams:", updatedTeams);
      setTeams(updatedTeams);
      if (selectedTeam) {
        const freshTeamData = updatedTeams.find(
          (team) => team.id === selectedTeam.id
        );
        if (freshTeamData) {
          setSelectedTeam(freshTeamData);
        }
      }
    });

    socket.on("update:selectedTeam", (team) => {
      console.log("Selected team update from server:", team);
      if (selectedTeam && team.id === selectedTeam.id) {
        setSelectedTeam(team);
      }
    });

    // Listen for "player:sold" event
    socket.on("player:sold", (player) => {
      // Show toast with player name
      setToastMessage(`${player.name} has been SOLD!`);

      // Clear the selected player if it matches the sold player
      if (selectedPlayer && selectedPlayer.id === player.id) {
        setSelectedPlayer(null);
      }

      // Clear toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);
    });

    return () => {
      socket.off("update:selectedPlayer");
      socket.off("update:teams");
      socket.off("update:selectedTeam");
      socket.off("player:sold");
    };
  }, [selectedTeam, selectedPlayer]);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
      socket.emit("select:team", teams[0].id);
    }
  }, [teams, selectedTeam]);

  const fetchData = () => {
    fetch("https://ipl-auction-simulator.onrender.com/api/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data);
      })
      .catch((err) => console.error("Error fetching teams:", err));
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    socket.emit("select:team", team.id);
  };

  const calculateRoleCounts = (players) => {
    const counts = { batters: 0, bowlers: 0, allRounders: 0 };
    players.forEach((player) => {
      if (player.role === "Batter") counts.batters++;
      else if (player.role === "Bowler") counts.bowlers++;
      else if (player.role === "All-Rounder") counts.allRounders++;
    });
    return counts;
  };
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <img
        className="header-img"
        src="https://thumbs.dreamstime.com/b/cricket-red-ball-stadium-lighting-natural-green-grass-horizontal-sport-theme-poster-greeting-cards-headers-website-app-290793545.jpg"
        alt=""
      />
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            className="selected-player-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="player-card-content">
              {/* <DotLottieReact
                src="https://lottie.host/2e551f51-37b6-4f51-aa96-a697e35c2960/gyK8WPSPzQ.lottie"
                loop
                autoplay
                className="animation"
              /> */}
              <img
                src={selectedPlayer.image}
                alt={selectedPlayer.name}
                className="player-card-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"; // Fallback image
                }}
              />
              <div className="player-card-details">
                <h2>{selectedPlayer.name}</h2>
                <p>
                  <strong>Role:</strong> {selectedPlayer.role}
                </p>
                <p>
                  <strong>Points:</strong> {selectedPlayer.points}
                </p>
                <p>
                  <strong>Foreigner:</strong>{" "}
                  {selectedPlayer.foreigner ? "Yes" : "No"}
                </p>
              </div>
            </div>
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
                {selectedTeam.budget.toLocaleString()} Cr
              </p>
            </div>
          </div>
          <div className="players-table">
            {/* <h2 className="pl">Players List</h2> */}
            <table>
              <thead>
                <tr>
                  <th>POS</th>
                  <th>PLAYER</th>
                  <th>POINTS</th>
                  <th>ROLE</th>
                  <th>PURCHASED FOR</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeam.players.map((player, index) => (
                  <tr key={index} className={index % 2 === 0 ? "gray-row" : ""}>
                    <td>{index + 1}</td>
                    <td className="inntd">
                      <img
                        src={player.image}
                        className="td-img"
                        id="player-img"
                        alt={player.name}
                      />
                      <div className="inntdr">
                        {player.name}{" "}
                        {player.foreigner ? (
                          <i className="fa-solid fa-plane td-flight"></i>
                        ) : null}
                      </div>
                    </td>
                    <td className="td-pts">{player.points}</td>
                    <td className="td-role">{player.role}</td>
                    <td className="td-budget">{player.purchasedFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="allt">All Teams</h2>
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
              ₹ {team.budget.toLocaleString()} Cr
            </p>
            <p className="team-players-label">Players: {team.players.length}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
