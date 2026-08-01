const storage = require("../data/storage");

// ===============================
// Create Automation
// ===============================

function createAutomation(req, res) {
const {
  deviceId,
  deviceName,
  time,
  turnOn,
  repeatDays,
  durationMinutes,
} = req.body;

  // Validation
  if (
    !deviceId ||
    !deviceName ||
    !time ||
    !Array.isArray(repeatDays)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid automation data",
    });
  }

  // Check duplicate
  const duplicate = storage.automations.find((automation) => {
    const sameDays =
      automation.repeatDays.length === repeatDays.length &&
      automation.repeatDays.every((day) =>
        repeatDays.includes(day)
      );

    return (
      automation.deviceId === deviceId &&
      automation.time === time &&
      automation.turnOn === turnOn &&
      sameDays
    );
  });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "Automation already exists",
    });
  }

const automation = {
  id: Date.now().toString(),
  deviceId,
  deviceName,
  time,
  turnOn,
  repeatDays,
  durationMinutes: durationMinutes || null,
  enabled: true,
};

  storage.automations.push(automation);

  res.status(201).json({
    success: true,
    message: "Automation created successfully",
    automation,
  });
}

// ===============================
// Get All Automations
// ===============================

function getAutomations(req, res) {
  res.json({
    success: true,
    automations: storage.automations,
  });
}

// ===============================
// Update Automation
// ===============================

function updateAutomation(req, res) {
  const { id } = req.params;
const {
  deviceId,
  deviceName,
  time,
  turnOn,
  repeatDays,
  durationMinutes,
} = req.body;

  // Validation
  if (
    !deviceId ||
    !deviceName ||
    !time ||
    !Array.isArray(repeatDays)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid automation data",
    });
  }

  // Find automation
  const automation = storage.automations.find(
    (item) => item.id === id
  );

  if (!automation) {
    return res.status(404).json({
      success: false,
      message: "Automation not found",
    });
  }

  // Duplicate check (ignore current automation)
  const duplicate = storage.automations.find((item) => {
    const sameDays =
      item.repeatDays.length === repeatDays.length &&
      item.repeatDays.every((day) =>
        repeatDays.includes(day)
      );

    return (
      item.id !== id &&
      item.deviceId === deviceId &&
      item.time === time &&
      item.turnOn === turnOn &&
      sameDays
    );
  });

  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "Automation already exists",
    });
  }

  // Update
automation.deviceId = deviceId;
automation.deviceName = deviceName;
automation.time = time;
automation.turnOn = turnOn;
automation.repeatDays = repeatDays;
automation.durationMinutes = durationMinutes || null;

  res.json({
    success: true,
    message: "Automation updated successfully",
    automation,
  });
}

// ===============================
// Delete Automation
// ===============================

function deleteAutomation(req, res) {
  const { id } = req.params;

  const index = storage.automations.findIndex(
    (automation) => automation.id === id
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Automation not found",
    });
  }

  storage.automations.splice(index, 1);

  res.json({
    success: true,
    message: "Automation deleted successfully",
  });
}

// ===============================
// Toggle Automation
// ===============================

function toggleAutomation(req, res) {
  const { id } = req.params;

  const automation = storage.automations.find(
    (item) => item.id === id
  );

  if (!automation) {
    return res.status(404).json({
      success: false,
      message: "Automation not found",
    });
  }

  automation.enabled = !automation.enabled;

  res.json({
    success: true,
    message: "Automation toggled successfully",
    automation,
  });
}

// ===============================
// Exports
// ===============================

module.exports = {
  createAutomation,
  getAutomations,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};