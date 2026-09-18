const Device = require("../models/Device");
const SmartHome = require("../models/SmartHome");
const Member = require("../models/Member");
const Sensor = require("../models/Sensor");


// =====================================================
// FIND USER SMART HOME
// =====================================================

async function findUserSmartHome(userId) {

    // -------------------------------------------------
    // FIRST: ACCEPTED MEMBER
    // -------------------------------------------------

    const membership =
        await Member.findOne({
            user: userId,
            status: "accepted",
        }).populate("smartHome");


    if (
        membership &&
        membership.smartHome
    ) {

        return membership.smartHome;
    }


    // -------------------------------------------------
    // SECOND: OWNER
    // -------------------------------------------------

    const smartHome =
        await SmartHome.findOne({
            owner: userId,
        }).sort({
            updatedAt: -1,
            createdAt: -1,
        });


    return smartHome;
}


// =====================================================
// GET ANALYTICS
//
// GET /user/analytics
//
// Provides:
//
// - Smart home information
// - Device count
// - Devices ON
// - Devices OFF
// - Pump state
// - Estimated pump power
// - Estimated energy usage
// - Estimated cost
// - Latest sensor information
//
// =====================================================

async function getAnalytics(req, res) {

    try {

        const userId =
            req.user.userId;


        console.log();
        console.log("=================================");
        console.log("GET SMART HOME ANALYTICS");
        console.log("=================================");
        console.log(
            "User:",
            userId
        );


        // =================================================
        // FIND SMART HOME
        // =================================================

        const smartHome =
            await findUserSmartHome(
                userId
            );


        if (!smartHome) {

            return res.status(404).json({

                success: false,

                message:
                    "Smart home not found",

            });
        }


        // =================================================
        // GET DEVICES
        // =================================================

        const devices =
            await Device.find({

                home:
                    smartHome._id,

            });


        // =================================================
        // DEVICE STATISTICS
        // =================================================

        const totalDevices =
            devices.length;


        const devicesOn =
            devices.filter(
                device =>
                    device.isOn === true &&
                    device.relay !== "R7"
            ).length;


        const devicesOff =
            totalDevices -
            devicesOn;


        // =================================================
        // WATER PUMP
        // =================================================

        const pumpIsOn =
            smartHome.pumpIsOn === true;


        // =================================================
        // PUMP POWER
        //
        // Your FYP uses a 550W water pump.
        // =================================================

        const pumpPowerWatts =
            550;


        const pumpPowerKW =
            pumpPowerWatts / 1000;


        // =================================================
        // ESTIMATED ENERGY
        //
        // Theoretical energy consumed in one hour
        // if the pump runs continuously.
        // =================================================

        const energyPerHour =
            pumpPowerKW;


        // =================================================
        // ELECTRICITY RATE
        //
        // Configured rate:
        // 65 PKR per kWh
        // =================================================

        const electricityRate =
            65;


        const costPerHour =
            energyPerHour *
            electricityRate;


        // =================================================
        // GET LATEST SENSOR READING
        //
        // Sensor data is stored in the Sensor collection.
        //
        // We retrieve the newest reading belonging
        // to this Smart Home.
        // =================================================

        const latestSensor =
            await Sensor.findOne({

                smartHome:
                    smartHome._id,

            }).sort({

                createdAt:
                    -1,

            });


        // =================================================
        // SENSOR DATA
        // =================================================

        const temperature =
            latestSensor?.temperature ??
            null;


        const humidity =
            latestSensor?.humidity ??
            null;


        const doorStatus =
            latestSensor?.doorStatus ??
            null;


        const sensorLastUpdated =
            latestSensor?.createdAt ??
            null;


        // =================================================
        // LOG ANALYTICS
        // =================================================

        console.log(
            "Smart Home:",
            smartHome.name
        );


        console.log(
            "Smart Home ID:",
            smartHome._id.toString()
        );


        console.log(
            "Total Devices:",
            totalDevices
        );


        console.log(
            "Devices ON:",
            devicesOn
        );


        console.log(
            "Devices OFF:",
            devicesOff
        );


        console.log(
            "Pump:",
            pumpIsOn
                ? "ON"
                : "OFF"
        );


        console.log(
            "Pump Power:",
            pumpPowerWatts,
            "W"
        );


        console.log(
            "Temperature:",
            temperature
        );


        console.log(
            "Humidity:",
            humidity
        );


        console.log(
            "Door Status:",
            doorStatus
        );


        console.log(
            "Sensor Last Updated:",
            sensorLastUpdated
        );


        console.log(
            "================================="
        );


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            success: true,


            // =============================================
            // SMART HOME
            // =============================================

            smartHome: {

                id:
                    smartHome._id,

                name:
                    smartHome.name,

                status:
                    smartHome.status,

                esp32Id:
                    smartHome.esp32Id ||
                    null,

            },


            // =============================================
            // DEVICE ANALYTICS
            // =============================================

            devices: {

                total:
                    totalDevices,

                on:
                    devicesOn,

                off:
                    devicesOff,

            },


            // =============================================
            // WATER PUMP ANALYTICS
            // =============================================

            pump: {

                relay:
                    "R8",

                isOn:
                    pumpIsOn,

                powerWatts:
                    pumpPowerWatts,

                powerKW:
                    pumpPowerKW,

                estimatedEnergyPerHour:
                    energyPerHour,

                electricityRate:
                    electricityRate,

                estimatedCostPerHour:
                    costPerHour,

            },


            // =============================================
            // SENSOR ANALYTICS
            // =============================================

            sensors: {

                temperature:
                    temperature,

                humidity:
                    humidity,

                doorStatus:
                    doorStatus,

                lastUpdated:
                    sensorLastUpdated,

            },

        });

    } catch (error) {

        console.error(
            "GET ANALYTICS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error",

        });
    }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getAnalytics,

};

