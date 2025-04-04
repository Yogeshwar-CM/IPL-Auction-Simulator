import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./Admin.css";
import { motion, AnimatePresence } from "framer-motion";

// Create a single socket instance that can be exported and reused
export const socket = io("http://localhost:3000");

export default function Admin() {
  const [players, setPlayers] = useState([]);

  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [error, setError] = useState(null);

  // Fetch initial data
  useEffect(() => {
    // Initial data load
    fetchData();

    // Set up socket listeners for real-time updates
    socket.on("update:players", (updatedPlayers) => {
      console.log("Received updated players:", updatedPlayers);
      setPlayers(updatedPlayers);

      // If we have a selected player that was just sold, clear the selection
      if (
        selectedPlayer &&
        updatedPlayers.find((p) => p.id === selectedPlayer.id)?.sold
      ) {
        setSelectedPlayer(null);
        setSelectedTeam("");
        setPurchaseAmount("");
      }
    });

    socket.on("update:teams", (updatedTeams) => {
      console.log("Received updated teams:", updatedTeams);
      setTeams(updatedTeams);
    });

    // Add error listener
    socket.on("error", (errorData) => {
      console.error("Socket error:", errorData);
      setError(errorData.message);

      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    });

    return () => {
      socket.off("update:players");
      socket.off("update:teams");
      socket.off("error");
    };
  }, [selectedPlayer, players]); // Add players as dependency too

  const fetchData = () => {
    fetch("http://localhost:3000/api/players")
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch((err) => console.error("Error fetching players:", err));

    fetch("http://localhost:3000/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data))
      .catch((err) => console.error("Error fetching teams:", err));
  };

  // Handle player selection
  const handleSelectPlayer = (player) => {
    // Check if player is already sold
    if (player.sold) {
      setError("This player is already assigned to a team");
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }

    setSelectedPlayer(player);
    socket.emit("admin:selectPlayer", player); // Broadcast selected player
  };

  // Handle assigning a player to a team
  const handleAssignPlayer = () => {
    if (!selectedPlayer || !selectedTeam || !purchaseAmount) {
      setError("Please select a player, team, and enter a purchase amount.");
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }

    // Check if player is already sold (double check)
    const player = players.find((p) => p.id === selectedPlayer.id);
    if (player && player.sold) {
      setError("This player is already assigned to a team");
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }

    socket.emit("assign:player", {
      playerId: selectedPlayer.id,
      teamId: parseInt(selectedTeam), // Ensure teamId is a number
      purchasedFor: parseInt(purchaseAmount),
    });
    // Don't clear form here - wait for the WebSocket update
  };

  // Handle removing a player from sold list
  const handleRemovePlayer = (playerId) => {
    if (window.confirm("Are you sure you want to remove this player?")) {
      socket.emit("remove:player", playerId);
    }
  };

  // Handle resetting all teams
  const handleResetTeams = () => {
    const password = prompt("Enter the reset password:");
    if (password === "yarona2025") {
      socket.emit("reset:teams"); // Broadcast reset event
    } else {
      alert("Incorrect password. Reset canceled.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.8 }}
      className="admin-container"
    >
      <AnimatePresence>
        {error && (
          <motion.div
            className="error-popup"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
              <button className="close-error" onClick={() => setError(null)}>
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Section */}
      <div className="form-section">
        <div className="form-group">
          <label>Selected Player: </label>
          <span>{selectedPlayer ? selectedPlayer.name : "None"}</span>
        </div>
        <div className="form-group">
          <label>Team: </label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="">Select a Team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Purchase Amount: </label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
          />
        </div>
        <div className="form-buttons">
          <button onClick={handleAssignPlayer}>Assign Player</button>
          <button onClick={handleResetTeams} className="reset-button">
            Reset Teams
          </button>
        </div>
      </div>

      {/* Unsold Players Table */}
      <div className="players-table">
        <h2>Unsold Players ({players.filter((p) => !p.sold).length})</h2>
        <table>
          <thead>
            <tr>
              <th>Player Image</th>
              <th>Player Name</th>
              <th>Role</th>
              <th>Points</th>
              <th>Foreigner</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {players
              .filter((player) => !player.sold)
              .map((player) => (
                <tr key={player.id}>
                  <td>
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
                  </td>
                  <td>{player.name}</td>
                  <td>{player.role}</td>
                  <td>{player.points}</td>
                  <td>{player.foreigner ? "Yes" : "No"}</td>
                  <td>
                    <button
                      onClick={() => handleSelectPlayer(player)}
                      className="stretch-button"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Sold Players Table */}
      <div className="players-table">
        <h2>Sold Players ({players.filter((p) => p.sold).length})</h2>
        <table>
          <thead>
            <tr>
              <th>Player Image</th>
              <th>Player Name</th>
              <th>Role</th>
              <th>Points</th>
              <th>Foreigner</th>
              <th>Remove</th>
            </tr>
          </thead>
          <tbody>
            {players
              .filter((player) => player.sold)
              .map((player) => (
                <tr key={player.id}>
                  <td>
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
                  </td>
                  <td>{player.name}</td>
                  <td>{player.role}</td>
                  <td>{player.points}</td>
                  <td>{player.foreigner ? "Yes" : "No"}</td>
                  <td>
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
