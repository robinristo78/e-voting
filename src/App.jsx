import React, { useState, useEffect } from "react";
import axios from "axios"; // Assuming you'll use axios for API calls

const VotingApp = () => {
  // States for the form fields, timer, vote submission, and result display
  const [isVotingStarted, setIsVotingStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [vote, setVote] = useState(""); // 'poolt' or 'vastu'
  const [hasVoted, setHasVoted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [voteCounts, setVoteCounts] = useState({
    for: 0,
    against: 0,
    totalVotes: 0,
    startTime: "",
  });
  const [voters, setVoters] = useState([]); // List of all voters

  // Start Voting button
  const startVoting = async () => {
    try {
      // Clear the HAALETUS table
      await axios.post("http://localhost:5000/clear-votes");
      setVoters([]); // Clear the list of voters
  
      setIsVotingStarted(true);
      setTimeLeft(300); // Reset timer to 5 minutes
      setHasVoted(false); // Allow vote changes
      setFirstName("");
      setLastName("");
      setVote(""); // Clear selected vote
      setVoteCounts({
        for: 0,
        against: 0,
        totalVotes: 0,
        startTime: new Date().toISOString(), // Set the new start time
      });
  
      // Fetch the initial results
      fetchResults();
  
      // Start the timer
      const interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
  
            // Finalize results when the timer ends
            finalizeResults();
  
            // Mark voting as ended
            setIsVotingStarted(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting new voting session:", error);
    }
  };
  
  const finalizeResults = async () => {
    try {
      const response = await axios.post("http://localhost:5000/finalize-results");
      console.log(response.data.message); // Log success message
      await fetchResults(); // Fetch the finalized results
    } catch (error) {
      console.error("Error finalizing results:", error);
    }
  };

  // Handle vote change (checkbox)
  const handleVoteChange = (selectedVote) => {
    setVote(selectedVote);
  };

  // Submit vote if the timer is still running
  const submitVote = async () => {
    if (timeLeft === 0) {
      setHasVoted(true); // After vote submission, prevent changing form
    }
  
    if (timeLeft > 0 && firstName && lastName && vote) {
      try {
        // Send vote data to backend to update HAALETUS and LOGI
        await axios.post("http://localhost:5000/vote", {
          eesnimi: firstName,
          perenimi: lastName,
          otsus: vote,
        });
  
        // Update the frontend vote counts
        setVoteCounts((prevCounts) => {
          const newCounts = { ...prevCounts };
          if (vote === "poolt") {
            newCounts.for += 1;
          } else if (vote === "vastu") {
            newCounts.against += 1;
          }
          newCounts.totalVotes += 1;
          return newCounts;
        });
  
        // Fetch the updated list of voters
        fetchVoters();
        fetchResults(); // Fetch the updated results
      } catch (error) {
        if (error.response && error.response.status === 400) {
          alert("Maximum number of votes reached. No more votes can be added.");
        } else {
          console.error("Error submitting vote:", error);
        }
      }
    }
  };

  // Fetch vote results from backend (adjust to your database structure)
  const fetchResults = async () => {
    try {
      const response = await axios.get("http://localhost:5000/dynamic-results");
      console.log("Dynamic results from backend:", response.data); // Debugging
      const data = response.data;
      setVoteCounts({
        for: data.poolt_votes || 0, // Map 'poolt_votes' to 'for'
        against: data.vastu_votes || 0, // Map 'vastu_votes' to 'against'
        totalVotes: data.voter_count || 0, // Map 'voter_count' to 'totalVotes'
        startTime: data.h_alguse_aeg || "", // Map 'h_alguse_aeg' to 'startTime'
      });
    } catch (error) {
      console.error("Error fetching dynamic results:", error);
    }
  };

  // Fetch list of voters from the backend
  const fetchVoters = async () => {
    try {
      const response = await axios.get("http://localhost:5000/votes");
      setVoters(response.data); // List of voters and their votes
    } catch (error) {
      console.error("Error fetching voters:", error);
    }
  };

  // Render timer in MM:SS format
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  // Fetch results and voters on page load
  useEffect(() => {
    fetchResults();
    fetchVoters();
  }, []);

  return (
    <div className="voting-app">
      <h1>Hääletus</h1>

      {!isVotingStarted && (
        <button onClick={startVoting}>Start Voting</button>
      )}

      {isVotingStarted && (
        <div>
          <h2>Hääletus kestab: {formatTime(timeLeft)}</h2>

          <div>
            <label>
              Eesnimi:
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <br />
            <label>
              Perenimi:
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label>
              <input
                type="radio"
                name="vote"
                checked={vote === "poolt"}
                onChange={() => handleVoteChange("poolt")}
                disabled={hasVoted}
              />
              Poolt
            </label>
            <label>
              <input
                type="radio"
                name="vote"
                checked={vote === "vastu"}
                onChange={() => handleVoteChange("vastu")}
                disabled={hasVoted}
              />
              Vastu
            </label>
          </div>

          <button onClick={submitVote} disabled={timeLeft <= 0}>
            Submit Vote
          </button>
        </div>
      )}

      {/* Display Results */}
      <div className="results">
        <h2>Hääletuse seis:</h2>
        <p>Poolt: {voteCounts.for}</p>
        <p>Vastu: {voteCounts.against}</p>
        <p>Hääletanud: {voteCounts.totalVotes} inimest</p>
        <p>Hääletus algas: {voteCounts.startTime ? new Date(voteCounts.startTime).toLocaleString() : "N/A"}</p>
      </div>

      {/* Display List of Voters */}
      <div className="voters">
        <h3>Hääletajad:</h3>
        <table>
          <thead>
            <tr>
              <th>Eesnimi</th>
              <th>Perenimi</th>
              <th>Otsus</th>
              <th>Hääletuse Aeg</th>
            </tr>
          </thead>
          <tbody>
            {voters.map((voter, index) => (
              <tr key={index}>
                <td>{voter.eesnimi}</td>
                <td>{voter.perenimi}</td>
                <td>{voter.otsus}</td>
                <td>{new Date(voter.haaletuse_aeg).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VotingApp;
