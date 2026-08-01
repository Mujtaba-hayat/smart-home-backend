const devices = {
    R1: "OFF",
    R2: "OFF",
    R3: "OFF",
    R4: "OFF",
    R5: "OFF",
    R6: "OFF",
    R7: "OFF",
    R8: "OFF",
};

let automations = [];

const pump = {
    running: false,
    duration: 0,
    remaining: 0,
    timer: null,
};

module.exports = {
    devices,
    automations,
    pump,
};