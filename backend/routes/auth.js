const express = require("express");
const router = express.Router();
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const users = JSON.parse(fs.readFileSync("./users.json"));
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  const { company, username, password } = req.body;

  const user = users.find(
    u => u.company === company && u.username === username
  );

  if (!user) {
    return res.status(401).json({ message: "Benutzer nicht gefunden" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ message: "Falsches Passwort" });
  }

  const token = jwt.sign(
    { username: user.username, company: user.company },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token });
});

module.exports = router;