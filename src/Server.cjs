const express =  require('express');
const mysql = require('mysql2');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
    host: "ita.voco.ee",
    port: 3306,
    user: "vs24kivit",
    password: "@3zp[w&xl,oe",
    database: "vs24kivit_AB2"
}); 

db.connect((err) => {
    if (err) {
      console.error("Could not connect to database:", err);
    } else {
      console.log("Connected to MySQL database.");
    }
  });
  
  // Start voting session
  app.post("/start-voting", (req, res) => {
    const startTime = new Date();
    db.query("INSERT INTO TULEMUSED (voter_count, h_alguse_aeg) VALUES (0, ?)", [startTime], (err, result) => {
      if (err) {
        console.error("Error starting voting session:", err);
        return res.status(500).send("Error starting voting session");
      }
      res.json({ message: "Voting session started", startTime });
    });
  });
  
  // Vote submission
//   app.post("/vote", (req, res) => {
//     const { eesnimi, perenimi, otsus } = req.body;
  
//     db.query("SELECT * FROM HAALETUS WHERE eesnimi = ? AND perenimi = ?", [eesnimi, perenimi], (err, results) => {
//       if (err) {
//         return res.status(500).send("Error checking existing vote");
//       }
  
//       if (results.length > 0) {
//         // Update existing vote if the user has already voted
//         const voteId = results[0].id;
//         const previousVote = results[0].otsus;
  
//         // Insert into LOGI table before updating the vote
//         db.query(
//           "INSERT INTO LOGI (vote_id, previous_vote, new_vote) VALUES (?, ?, ?)",
//           [voteId, previousVote, otsus],
//           (err) => {
//             if (err) return res.status(500).send("Error logging vote change");
//           }
//         );
  
//         db.query("UPDATE HAALETUS SET otsus = ? WHERE id = ?", [otsus, voteId], (err) => {
//           if (err) return res.status(500).send("Error updating vote");
  
//           res.json({ message: "Vote updated successfully" });
//         });
//       } else {
//         // If no existing vote, insert new vote
//         db.query("INSERT INTO HAALETUS (eesnimi, perenimi, otsus) VALUES (?, ?, ?)", [eesnimi, perenimi, otsus], (err) => {
//           if (err) return res.status(500).send("Error submitting vote");
  
//           res.json({ message: "Vote submitted successfully" });
//         });
//       }
//     });
//   });

app.post("/vote", (req, res) => {
    const { eesnimi, perenimi, otsus } = req.body;
  
    // Check the total number of entries in the HAALETUS table
    db.query("SELECT COUNT(*) AS total FROM HAALETUS", (err, results) => {
      if (err) {
        console.error("Error checking total votes:", err);
        return res.status(500).send("Error checking total votes");
      }
  
      const totalVotes = results[0].total;
  
      // Prevent adding new votes if there are already 11 entries
      if (totalVotes >= 11) {
        // Check if the voter already exists
        db.query("SELECT * FROM HAALETUS WHERE eesnimi = ? AND perenimi = ?", [eesnimi, perenimi], (err, results) => {
          if (err) {
            return res.status(500).send("Error checking existing vote");
          }
  
          if (results.length > 0) {
            // Update existing vote if the user has already voted
            const voteId = results[0].id;
            const previousVote = results[0].otsus;
  
            // Insert into LOGI table before updating the vote
            db.query(
              "INSERT INTO LOGI (vote_id, previous_vote, new_vote) VALUES (?, ?, ?)",
              [voteId, previousVote, otsus],
              (err) => {
                if (err) return res.status(500).send("Error logging vote change");
              }
            );
  
            db.query("UPDATE HAALETUS SET otsus = ? WHERE id = ?", [otsus, voteId], (err) => {
              if (err) return res.status(500).send("Error updating vote");
  
              res.json({ message: "Vote updated successfully" });
            });
          } else {
            // If the voter does not exist, do not allow adding a new vote
            return res.status(400).send("Maximum number of votes reached. Cannot add new votes.");
          }
        });
      } else {
        // If there are fewer than 11 votes, allow adding a new vote
        db.query("SELECT * FROM HAALETUS WHERE eesnimi = ? AND perenimi = ?", [eesnimi, perenimi], (err, results) => {
          if (err) {
            return res.status(500).send("Error checking existing vote");
          }
  
          if (results.length > 0) {
            // Update existing vote if the user has already voted
            const voteId = results[0].id;
            const previousVote = results[0].otsus;
  
            // Insert into LOGI table before updating the vote
            db.query(
              "INSERT INTO LOGI (vote_id, previous_vote, new_vote) VALUES (?, ?, ?)",
              [voteId, previousVote, otsus],
              (err) => {
                if (err) return res.status(500).send("Error logging vote change");
              }
            );
  
            db.query("UPDATE HAALETUS SET otsus = ? WHERE id = ?", [otsus, voteId], (err) => {
              if (err) return res.status(500).send("Error updating vote");
  
              res.json({ message: "Vote updated successfully" });
            });
          } else {
            // If no existing vote, insert new vote
            db.query("INSERT INTO HAALETUS (eesnimi, perenimi, otsus) VALUES (?, ?, ?)", [eesnimi, perenimi, otsus], (err) => {
              if (err) return res.status(500).send("Error submitting vote");
  
              res.json({ message: "Vote submitted successfully" });
            });
          }
        });
      }
    });
  });
  
  // Finalize voting results after 5 minutes
  app.post("/finalize-results", (req, res) => {
    db.query("CALL finalize_results()", (err, results) => {
      if (err) {
        console.error("Error calling finalize_results:", err);
        return res.status(500).send("Error finalizing results");
      }
      res.json({ message: "Voting results finalized successfully!" });
    });
  });
  
  // Fetch current vote results
  app.get("/dynamic-results", (req, res) => {
    db.query(
      `SELECT 
        COUNT(*) AS voter_count,
        (SELECT COUNT(*) FROM HAALETUS WHERE otsus = 'poolt') AS poolt_votes,
        (SELECT COUNT(*) FROM HAALETUS WHERE otsus = 'vastu') AS vastu_votes,
        (SELECT MIN(haaletuse_aeg) FROM HAALETUS) AS h_alguse_aeg
        FROM HAALETUS
      `,
      (err, results) => {
        if (err) {
          console.error("Error fetching dynamic results:", err);
          return res.status(500).send("Error fetching results");
        }
  
        res.json(results[0] || {});
      }
    );
  });
  
  // Fetch all votes
  app.get("/votes", (req, res) => {
    db.query("SELECT * FROM HAALETUS", (err, results) => {
      if (err) return res.status(500).send("Error fetching votes");
      res.json(results);
    });
  });

  app.post("/clear-votes", (req, res) => {
    db.query("TRUNCATE TABLE HAALETUS", (err) => {
      if (err) {
        console.error("Error clearing votes:", err);
        return res.status(500).send("Error clearing votes");
      }
      res.json({ message: "Votes cleared successfully" });
    });
  });
  
  // Server listening on port 5000
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });