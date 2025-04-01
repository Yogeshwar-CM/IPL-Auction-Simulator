const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity
  },
});

// Connect to SQLite database
const db = new sqlite3.Database("./auction.db");

// Initialize teams in SQLite
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      budget INTEGER NOT NULL,
      players TEXT DEFAULT '[]',
      logo TEXT DEFAULT NULL
    )
  `);

  // Insert default teams if not already present
  const defaultTeams = [
    {
      id: 1,
      name: "Royal Challengers Bangalore",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/54/96/c3/5496c328d02c848b352190a0eee94dc1.jpg"
    },
    {
      id: 2,
      name: "Chennai Super Kings",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/4e/e7/ac/4ee7ac144c048d64edcb30d3129a895f.jpg"
    },
    {
      id: 3,
      name: "Mumbai Indians",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/e8/87/a8/e887a81959a66337b7ccc7835c38470e.jpg"
    },
    {
      id: 4,
      name: "Kolkata Knight Riders",
      budget: 1000,
      logo: "https://i.pinimg.com/736x/dd/ef/01/ddef0161a23be84b2e8f9e2ac715cb8e.jpg"
    },
    {
      id: 5,
      name: "Delhi Capitals",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/5d/a6/04/5da6045278a7a7dba53540a9226ac1c7.jpg"
    },
    {
      id: 6,
      name: "Punjab Kings",
      budget: 10000,
      logo: "https://mir-s3-cdn-cf.behance.net/projects/404/614abb172278773.Y3JvcCwxNTAwLDExNzMsMCwxNA.png"
    },
    {
      id: 7,
      name: "Rajasthan Royals",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/44/b9/d2/44b9d2d691b2346d6a7c2a492f105dd1.jpg"
    },
    {
      id: 8,
      name: "Sunrisers Hyderabad",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/d2/a1/77/d2a177e722cd189ad6fca15fe2644d3e.jpg"
    },
    {
      id: 9,
      name: "Lucknow Super Giants",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/86/c6/14/86c61402da3732392321dc9f4c6375fb.jpg"
    },
    {
      id: 10,
      name: "Gujarat Titans",
      budget: 10000,
      logo: "https://i.pinimg.com/736x/ea/df/52/eadf52ed1b962b079801ed8e912c7e10.jpg"
    },
  ];

  defaultTeams.forEach((team) => {
    db.run(
      `INSERT OR IGNORE INTO teams (id, name, budget, players, logo) VALUES (?, ?, ?, ?, ?)`,
      [team.id, team.name, team.budget, JSON.stringify([]), team.logo]
    );
  });

  // Update existing teams with logos if they don't have one
  defaultTeams.forEach((team) => {
    db.run(
      `UPDATE teams SET logo = ? WHERE id = ? AND logo IS NULL`,
      [team.logo, team.id]
    );
  });
});

// Rest of your server code remains the same
// Function to broadcast updated data to all clients
function broadcastUpdates() {
  // Broadcast updated players
  db.all("SELECT * FROM players", (err, players) => {
    if (!err) {
      io.emit("update:players", players);
    } else {
      console.error("Error fetching players for broadcast:", err);
    }
  });

  // Broadcast updated teams
  db.all("SELECT * FROM teams", (err, teams) => {
    if (!err) {
      const processedTeams = teams.map((team) => ({
        ...team,
        players: JSON.parse(team.players),
      }));

      io.emit("update:teams", processedTeams);

      // Also broadcast each individual team update
      processedTeams.forEach(team => {
        io.emit(`update:team:${team.id}`, team);
      });
    } else {
      console.error("Error fetching teams for broadcast:", err);
    }
  });
}

let selectedTeam = null; // Track the currently selected team

// WebSocket connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Send initial data to the client
  db.all("SELECT * FROM players", (err, players) => {
    if (!err) {
      socket.emit("update:players", players);
    }
  });

  db.all("SELECT * FROM teams", (err, teams) => {
    if (!err) {
      const processedTeams = teams.map((team) => ({
        ...team,
        players: JSON.parse(team.players),
      }));

      socket.emit("update:teams", processedTeams);

      // Send the currently selected team to the client
      if (selectedTeam) {
        socket.emit("update:selectedTeam", selectedTeam);
      }
    }
  });

  // Listen for admin selecting a player
  socket.on("admin:selectPlayer", (player) => {
    console.log("Admin selected player:", player);
    io.emit("update:selectedPlayer", player); // Broadcast selected player to all clients
  });

  // Listen for team selection
  socket.on("select:team", (teamId) => {
    console.log(`Team selected: ${teamId}`);

    db.get("SELECT * FROM teams WHERE id = ?", [teamId], (err, team) => {
      if (err || !team) {
        console.error("Team not found:", err);
        return;
      }

      const processedTeam = {
        ...team,
        players: JSON.parse(team.players),
      };

      // Store the team client is viewing (for this socket only)
      socket.selectedTeam = processedTeam;

      // Send the selected team data back to the client that requested it
      socket.emit("update:selectedTeam", processedTeam);
    });
  });

  // Listen for assigning a player to a team
  socket.on("assign:player", ({ playerId, teamId, purchasedFor }) => {
    db.get("SELECT * FROM players WHERE id = ?", [playerId], (err, player) => {
      if (err || !player) {
        console.error("Player not found:", err);
        socket.emit("error", { message: "Player not found" });
        return;
      }

      db.get("SELECT * FROM teams WHERE id = ?", [teamId], (err, team) => {
        if (err || !team) {
          console.error("Team not found:", err);
          socket.emit("error", { message: "Team not found" });
          return;
        }

        const teamPlayers = JSON.parse(team.players);
        if (team.budget < purchasedFor) {
          socket.emit("error", { message: "Insufficient budget" });
          return;
        }

        // Add player to the team
        teamPlayers.push({ ...player, purchasedFor });
        const updatedBudget = team.budget - purchasedFor;

        db.run(
          "UPDATE teams SET players = ?, budget = ? WHERE id = ?",
          [JSON.stringify(teamPlayers), updatedBudget, teamId],
          (err) => {
            if (err) {
              console.error("Error updating team:", err);
              socket.emit("error", { message: "Error updating team" });
              return;
            }

            // Mark player as sold
            db.run("UPDATE players SET sold = 1 WHERE id = ?", [playerId], (err) => {
              if (err) {
                console.error("Error marking player as sold:", err);
                socket.emit("error", { message: "Error marking player as sold" });
                return;
              }

              // Broadcast updates
              broadcastUpdates();
            });
          }
        );
      });
    });
  });

  socket.on("reset:teams", () => {
    db.serialize(() => {
      db.run("UPDATE teams SET budget = 10000, players = '[]'", (err) => { // Changed 100 to 10000 to match the initialization
        if (err) {
          console.error("Error resetting teams:", err);
          socket.emit("error", { message: "Error resetting teams" });
          return;
        }

        db.run("UPDATE players SET sold = 0", (err) => {
          if (err) {
            console.error("Error resetting players:", err);
            socket.emit("error", { message: "Error resetting players" });
            return;
          }

          // Broadcast updates
          broadcastUpdates();
          socket.emit("success", { message: "Teams have been reset successfully!" });
        });
      });
    });
  });

  // Fix for the remove:player event handler
  socket.on("remove:player", (playerId) => {
    console.log("Removing player with ID:", playerId);

    db.all("SELECT * FROM teams", (err, teams) => {
      if (err) {
        console.error("Error fetching teams:", err);
        socket.emit("error", { message: "Error fetching teams" });
        return;
      }

      let playerFound = false;
      let processedTeams = 0;

      if (teams.length === 0) {
        socket.emit("error", { message: "No teams found" });
        return;
      }

      teams.forEach((team) => {
        const teamPlayers = JSON.parse(team.players || '[]');
        const playerIndex = teamPlayers.findIndex((p) => p.id === playerId);

        if (playerIndex !== -1) {
          playerFound = true;

          // Refund the budget
          const removedPlayer = teamPlayers[playerIndex];
          const updatedBudget = team.budget + removedPlayer.purchasedFor;

          // Remove the player
          teamPlayers.splice(playerIndex, 1);

          db.run(
            "UPDATE teams SET players = ?, budget = ? WHERE id = ?",
            [JSON.stringify(teamPlayers), updatedBudget, team.id],
            (err) => {
              if (err) {
                console.error("Error updating team:", err);
                socket.emit("error", { message: "Error updating team" });
                return;
              }

              // Mark player as unsold
              db.run("UPDATE players SET sold = 0 WHERE id = ?", [playerId], (err) => {
                if (err) {
                  console.error("Error marking player as unsold:", err);
                  socket.emit("error", { message: "Error marking player as unsold" });
                  return;
                }

                // Broadcast updates
                broadcastUpdates();
                console.log("Player removed successfully");
              });
            }
          );
        }

        processedTeams++;

        // If we've checked all teams and haven't found the player
        if (processedTeams === teams.length && !playerFound) {
          socket.emit("error", { message: "Player not found in any team" });
        }
      });
    });
  });

  // Fix for the API reset endpoint to match socket handler
  app.post("/api/teams/reset", (req, res) => {
    db.serialize(() => {
      db.run("UPDATE teams SET budget = 10000, players = '[]'", (err) => { // Changed 100 to 10000
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.run("UPDATE players SET sold = 0", (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Broadcast updates
          broadcastUpdates();

          res.json({ message: "Teams have been reset!" });
        });
      });
    });
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Routes
// Get all players
app.get("/api/players", (req, res) => {
  db.all("SELECT * FROM players", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get all teams
app.get("/api/teams", (req, res) => {
  db.all("SELECT * FROM teams", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(
      rows.map((team) => ({
        ...team,
        players: JSON.parse(team.players),
      }))
    );
  });
});

// Get a single team by ID
app.get("/api/teams/:id", (req, res) => {
  db.get("SELECT * FROM teams WHERE id = ?", [req.params.id], (err, team) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json({
      ...team,
      players: JSON.parse(team.players),
    });
  });
});

// Add a player to a team
app.post("/api/teams/:id/players", (req, res) => {
  const { playerId, purchasedFor } = req.body;

  db.get("SELECT * FROM players WHERE id = ?", [playerId], (err, player) => {
    if (err || !player) {
      return res.status(404).json({ message: "Player not found" });
    }

    db.get("SELECT * FROM teams WHERE id = ?", [req.params.id], (err, team) => {
      if (err || !team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const teamPlayers = JSON.parse(team.players);
      if (team.budget < purchasedFor) {
        return res.status(400).json({ message: "Insufficient budget" });
      }

      // Add player to the team
      teamPlayers.push({ ...player, purchasedFor });
      const updatedBudget = team.budget - purchasedFor;

      db.run(
        "UPDATE teams SET players = ?, budget = ? WHERE id = ?",
        [JSON.stringify(teamPlayers), updatedBudget, req.params.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Mark player as sold
          db.run("UPDATE players SET sold = 1 WHERE id = ?", [playerId], (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Broadcast updates
            broadcastUpdates();

            res.json({
              ...team,
              players: teamPlayers,
              budget: updatedBudget,
            });
          });
        }
      );
    });
  });
});

// Remove a player from a team
app.delete("/api/teams/:id/players/:playerId", (req, res) => {
  const playerId = parseInt(req.params.playerId);

  db.get("SELECT * FROM teams WHERE id = ?", [req.params.id], (err, team) => {
    if (err || !team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const teamPlayers = JSON.parse(team.players);
    const playerIndex = teamPlayers.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return res.status(404).json({ message: "Player not found in the team" });
    }

    // Refund the budget
    const removedPlayer = teamPlayers[playerIndex];
    const updatedBudget = team.budget + removedPlayer.purchasedFor;

    // Remove the player
    teamPlayers.splice(playerIndex, 1);

    db.run(
      "UPDATE teams SET players = ?, budget = ? WHERE id = ?",
      [JSON.stringify(teamPlayers), updatedBudget, req.params.id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Mark player as unsold
        db.run("UPDATE players SET sold = 0 WHERE id = ?", [playerId], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Broadcast updates
          broadcastUpdates();

          res.json({
            ...team,
            players: teamPlayers,
            budget: updatedBudget,
          });
        });
      }
    );
  });
});

// Reset all teams
app.post("/api/teams/reset", (req, res) => {
  db.serialize(() => {
    db.run("UPDATE teams SET budget = 100, players = '[]'", (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run("UPDATE players SET sold = 0", (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Broadcast updates
        broadcastUpdates();

        res.json({ message: "Teams have been reset!" });
      });
    });
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});