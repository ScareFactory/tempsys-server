// backend/routes/companyFeatures.js

const express = require("express");
const router = express.Router({ mergeParams: true });
const { Company, Feature } = require("../models");

/**
 * GET /api/companies/:companyId/features
 * Liefert alle für die Firma freigeschalteten Features zurück.
 */
router.get("/", async (req, res) => {
  const { companyId } = req.params;
  try {
    const company = await Company.findByPk(companyId, {
      include: {
        model: Feature,
        attributes: ["id", "key", "label"],
        through: { attributes: [] },
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Firma nicht gefunden" });
    }

    // company.Features ist ein Array der zugeordneten Feature-Objekte
    res.json(company.Features);
  } catch (err) {
    console.error("Error fetching company features:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/companies/:companyId/features
 * Aktualisiert die Liste der freigeschalteten Features für eine Firma.
 * Body: { featureIds: [1,2,3,...] }
 */
router.put("/", async (req, res) => {
  const { companyId } = req.params;
  const { featureIds } = req.body;

  if (!Array.isArray(featureIds)) {
    return res.status(400).json({ message: "featureIds muss ein Array sein" });
  }

  try {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: "Firma nicht gefunden" });
    }

    // setFeatures löscht alte Zuordnungen und setzt die neuen
    await company.setFeatures(featureIds);

    // 204 No Content ist angemessen, da kein Body zurückgegeben wird
    res.status(204).end();
  } catch (err) {
    console.error("Error updating company features:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
