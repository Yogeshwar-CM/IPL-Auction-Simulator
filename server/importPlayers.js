const sqlite3 = require("sqlite3").verbose();
const xlsx = require("xlsx");

// Load players from XLSX file
const workbook = xlsx.readFile("./DATA.xlsx");
const sheetName = workbook.SheetNames[0];
const playersData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

// Connect to SQLite database
const db = new sqlite3.Database("./auction.db");

// Create the players table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      points INTEGER NOT NULL,
      foreigner INTEGER NOT NULL,
      image TEXT DEFAULT NULL,
      sold INTEGER DEFAULT 0
    )
  `);

  // Insert players into the table
  const stmt = db.prepare("INSERT INTO players (name, role, points, foreigner, image, sold) VALUES (?, ?, ?, ?, ?, ?)");
  playersData.forEach((player, index) => {
    // Validate data: Skip rows with missing values
    if (!player["Player Name"] || !player["Role"] || !player["Points"] || player["Foreigner"] === undefined || !player["images"]) {
      console.warn(`Skipping row ${index + 1}: Missing data`);
      return; // Skip this row and move to the next
    }

    stmt.run(
      player["Player Name"],
      player["Role"],
      player["Points"],
      player["Foreigner"],
      player["images"],
      0, // Default sold value
      (err) => {
        if (err) {
          console.error(`Error inserting row ${index + 1}:`, err.message);
        }
      }
    );
  });
  stmt.finalize();

  console.log("Players data imported successfully!");
});

// Close the database connection
db.close();