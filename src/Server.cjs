const express =  require('express');
const mysql = require('mysql2');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
    host: "localhost:3306",
    user: "vs24kivit",
    password: "@3zp[w&xl,oe",
    database: "vs24kivit_AB2"
}); 

db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to MySQL database");
})

app.get("/votes", (req, res) => {
    db.query("SELECT * FROM HAALETUS", (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send("Database error");
        } else {
            res.json(results);
        }
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
})