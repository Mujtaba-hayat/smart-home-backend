const express = require('express');
const router = express.Router();

const {
    createAutomation,
    getAutomations,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
} = require("../controllers/automationController");


// ===============================
// Automation Routes
// ===============================

router.post("/automation", createAutomation);
router.get("/automations", getAutomations);
router.put("/automation/:id", updateAutomation);
router.delete("/automation/:id", deleteAutomation);
router.patch("/automation/:id/toggle", toggleAutomation);
module.exports = router;