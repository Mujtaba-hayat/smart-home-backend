const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const Member = require("../models/Member");
const Sensor = require("../models/Sensor");
const EnergyUsage = require("../models/EnergyUsage");

// Standard power ratings in Watts
const DEFAULT_WATTAGES = {
    light: 20,       // 20W LED Bulb
    fan: 75,         // 75W Fan
    pump: 550,       // 550W Pump (R8)
    appliance: 100,  // 100W General
    default: 40,
};

function getDeviceWattage(device) {
    if (device.powerWatts && device.powerWatts > 0) {
        return device.powerWatts;
    }
    const name = (device.name || "").toLowerCase();
    const type = (device.iconName || device.type || "").toLowerCase();

    if (name.includes("pump") || type.includes("pump")) return DEFAULT_WATTAGES.pump;
    if (name.includes("fan") || type.includes("fan")) return DEFAULT_WATTAGES.fan;
    if (name.includes("light") || type.includes("light")) return DEFAULT_WATTAGES.light;
    return DEFAULT_WATTAGES.default;
}

// =====================================================
// FIND USER SMART HOME
// =====================================================
async function findUserSmartHome(userId) {
    const membership = await Member.findOne({
        user: userId,
        status: "accepted",
    }).populate("smartHome");

    if (membership && membership.smartHome) {
        return membership.smartHome;
    }

    const smartHome = await SmartHome.findOne({
        owner: userId,
    }).sort({
        updatedAt: -1,
        createdAt: -1,
    });

    return smartHome;
}

// =====================================================
// GET ANALYTICS
// =====================================================
async function getAnalytics(req, res) {
    try {
        const userId = req.user.userId;

        const smartHome = await findUserSmartHome(userId);
        if (!smartHome) {
            return res.status(404).json({
                success: false,
                message: "Smart home not found",
            });
        }

        // 1. Fetch devices and calculate real-time load
        const devices = await Device.find({ home: smartHome._id });

        const totalDevices = devices.length;
        const devicesOnList = devices.filter(
            device => device.isOn === true && device.relay !== "R7"
        );
        const devicesOn = devicesOnList.length;
        const devicesOff = totalDevices - devicesOn;

        // Calculate live wattage of all active household devices
        let activeHouseholdWatts = 0;
        const deviceBreakdown = devices.map(d => {
            const watts = getDeviceWattage(d);
            if (d.isOn && d.relay !== "R7") {
                activeHouseholdWatts += watts;
            }
            return {
                id: d._id,
                name: d.name,
                relay: d.relay,
                isOn: d.isOn,
                wattage: watts,
            };
        });

        // 2. Water pump load
        const pumpIsOn = smartHome.pumpIsOn === true;
        const pumpPowerWatts = DEFAULT_WATTAGES.pump;
        const activePumpWatts = pumpIsOn ? pumpPowerWatts : 0;

        // Total live system power currently being drawn
        const currentTotalWatts = activeHouseholdWatts + activePumpWatts;
        const currentTotalKW = currentTotalWatts / 1000;

        const electricityRate = 65; // 65 PKR per kWh / unit

        // 3. Aggregate historical energy usage from EnergyUsage collection
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const energyAgg = await EnergyUsage.aggregate([
            { $match: { smartHome: smartHome._id } },
            {
                $group: {
                    _id: null,
                    totalKWh: { $sum: "$energyKWh" },
                    totalCost: { $sum: "$cost" },
                },
            },
        ]);

        const todayAgg = await EnergyUsage.aggregate([
            {
                $match: {
                    smartHome: smartHome._id,
                    startedAt: { $gte: startOfToday },
                },
            },
            {
                $group: {
                    _id: null,
                    todayKWh: { $sum: "$energyKWh" },
                    todayCost: { $sum: "$cost" },
                },
            },
        ]);

        const totalUnitsConsumed = Number((energyAgg[0]?.totalKWh || 0).toFixed(3));
        const totalCostIncurred = Number((energyAgg[0]?.totalCost || (totalUnitsConsumed * electricityRate)).toFixed(2));

        const todayUnitsConsumed = Number((todayAgg[0]?.todayKWh || 0).toFixed(3));
        const todayCostIncurred = Number((todayAgg[0]?.todayCost || (todayUnitsConsumed * electricityRate)).toFixed(2));

        // 4. Retrieve latest sensor data
        const latestSensor = await Sensor.findOne({
            smartHome: smartHome._id,
        }).sort({ createdAt: -1 });

        return res.json({
            success: true,
            smartHome: {
                id: smartHome._id,
                name: smartHome.name,
                status: smartHome.status,
                esp32Id: smartHome.esp32Id || null,
            },
            devices: {
                total: totalDevices,
                on: devicesOn,
                off: devicesOff,
                breakdown: deviceBreakdown,
            },
            power: {
                currentWatts: currentTotalWatts,
                currentKW: currentTotalKW,
                householdWatts: activeHouseholdWatts,
                pumpWatts: activePumpWatts,
                ratePerKWh: electricityRate,
                estimatedCostPerHour: Number((currentTotalKW * electricityRate).toFixed(2)),
            },
            energy: {
                todayUnits: todayUnitsConsumed, // kWh today
                todayCost: todayCostIncurred,   // PKR today
                totalUnits: totalUnitsConsumed, // Total lifetime Units (kWh)
                totalCost: totalCostIncurred,   // Total PKR
            },
            pump: {
                relay: "R8",
                isOn: pumpIsOn,
                powerWatts: pumpPowerWatts,
            },
            sensors: {
                temperature: latestSensor?.temperature ?? null,
                humidity: latestSensor?.humidity ?? null,
                doorStatus: latestSensor?.doorStatus ?? null,
                lastUpdated: latestSensor?.createdAt ?? null,
            },
        });
    } catch (error) {
        console.error("GET ANALYTICS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

module.exports = {
    getAnalytics,
};