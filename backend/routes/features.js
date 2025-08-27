// backend/routes/features.js
const express = require("express");
const router = express.Router();
const { Feature } = require("../models");

router.get("/", async (req, res) => {
  try {
    const features = await Feature.findAll({
      attributes: ["id", "key", "label", "description"],
      order: [["id", "ASC"]],
    });
    res.json(features);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;