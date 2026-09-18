const Notification = require("../models/Notification");
const SmartHome = require("../models/SmartHome");

// =====================================================
// GET USER NOTIFICATIONS
//
// GET /user/notifications
//
// Returns notifications for the logged-in user.
// =====================================================

async function getNotifications(req, res) {

    try {

        const userId =
            req.user.userId;

        console.log();
        console.log("=================================");
        console.log("GET USER NOTIFICATIONS");
        console.log("=================================");
        console.log("User:", userId);

        const notifications =
            await Notification.find({
                user: userId,
            })
            .sort({
                createdAt: -1,
            })
            .limit(50);

        const unreadCount =
            await Notification.countDocuments({
                user: userId,
                isRead: false,
            });

        console.log(
            "Notifications:",
            notifications.length
        );

        console.log(
            "Unread:",
            unreadCount
        );

        console.log("=================================");

        return res.json({

            success: true,

            notifications,

            unreadCount,

        });

    } catch (error) {

        console.error(
            "GET NOTIFICATIONS ERROR:",
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
// MARK NOTIFICATION AS READ
//
// PUT /user/notifications/:notificationId/read
// =====================================================

async function markNotificationRead(
    req,
    res
) {

    try {

        const userId =
            req.user.userId;

        const {
            notificationId,
        } = req.params;

        console.log();
        console.log("=================================");
        console.log("MARK NOTIFICATION AS READ");
        console.log("=================================");
        console.log("User:", userId);
        console.log(
            "Notification:",
            notificationId
        );

        const notification =
            await Notification.findOne({

                _id:
                    notificationId,

                user:
                    userId,

            });

        if (!notification) {

            return res.status(404).json({

                success: false,

                message:
                    "Notification not found",

            });
        }

        notification.isRead =
            true;

        await notification.save();

        console.log(
            "Notification marked as read."
        );

        console.log("=================================");

        return res.json({

            success: true,

            message:
                "Notification marked as read",

            notification,

        });

    } catch (error) {

        console.error(
            "MARK NOTIFICATION READ ERROR:",
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
// MARK ALL NOTIFICATIONS AS READ
//
// PUT /user/notifications/read-all
// =====================================================

async function markAllNotificationsRead(
    req,
    res
) {

    try {

        const userId =
            req.user.userId;

        console.log();
        console.log("=================================");
        console.log("MARK ALL NOTIFICATIONS AS READ");
        console.log("=================================");
        console.log("User:", userId);

        const result =
            await Notification.updateMany(

                {
                    user:
                        userId,

                    isRead:
                        false,
                },

                {
                    $set: {

                        isRead:
                            true,

                    },
                }

            );

        console.log(
            "Notifications updated:",
            result.modifiedCount
        );

        console.log("=================================");

        return res.json({

            success: true,

            message:
                "All notifications marked as read",

            updated:
                result.modifiedCount,

        });

    } catch (error) {

        console.error(
            "MARK ALL NOTIFICATIONS READ ERROR:",
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
// DELETE NOTIFICATION
//
// DELETE /user/notifications/:notificationId
// =====================================================

async function deleteNotification(
    req,
    res
) {

    try {

        const userId =
            req.user.userId;

        const {
            notificationId,
        } = req.params;

        const notification =
            await Notification.findOne({

                _id:
                    notificationId,

                user:
                    userId,

            });

        if (!notification) {

            return res.status(404).json({

                success: false,

                message:
                    "Notification not found",

            });
        }

        await notification.deleteOne();

        console.log(
            "Notification deleted:",
            notificationId
        );

        return res.json({

            success: true,

            message:
                "Notification deleted",

        });

    } catch (error) {

        console.error(
            "DELETE NOTIFICATION ERROR:",
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
// CREATE NOTIFICATION
//
// INTERNAL FUNCTION
//
// Used by other backend controllers.
//
// =====================================================

async function createNotification({
    userId,
    smartHomeId,
    type,
    title,
    message,
}) {

    try {

        if (
            !userId ||
            !smartHomeId ||
            !type ||
            !title ||
            !message
        ) {

            console.error(
                "CREATE NOTIFICATION: Missing required data"
            );

            return null;
        }

        const notification =
            await Notification.create({

                user:
                    userId,

                smartHome:
                    smartHomeId,

                type:
                    type,

                title:
                    title,

                message:
                    message,

                isRead:
                    false,

            });

        console.log();
        console.log(
            "NOTIFICATION CREATED:",
            notification._id.toString()
        );

        console.log(
            "Type:",
            type
        );

        console.log(
            "Title:",
            title
        );

        console.log(
            "Message:",
            message
        );

        console.log();

        return notification;

    } catch (error) {

        console.error(
            "CREATE NOTIFICATION ERROR:",
            error
        );

        return null;
    }
}


// =====================================================
// CREATE DEVICE NOTIFICATION
//
// INTERNAL FUNCTION
//
// Called when a normal device R1-R6 is turned ON/OFF.
//
// =====================================================

async function createDeviceNotification({
    userId,
    smartHome,
    device,
    state,
}) {

    try {

        if (!smartHome) {

            console.error(
                "DEVICE NOTIFICATION: SmartHome missing"
            );

            return null;
        }

        if (!device) {

            console.error(
                "DEVICE NOTIFICATION: Device missing"
            );

            return null;
        }

        if (
            !["ON", "OFF"].includes(state)
        ) {

            console.error(
                "DEVICE NOTIFICATION: Invalid state:",
                state
            );

            return null;
        }

        const notification =
            await createNotification({

               userId:
    userId,

                smartHomeId:
                    smartHome._id,

                type:
                    "device",

                title:
                    "Device State Changed",

                message:
                    `${device.name} turned ${state}.`,

            });

        return notification;

    } catch (error) {

        console.error(
            "CREATE DEVICE NOTIFICATION ERROR:",
            error
        );

        return null;
    }
}


// =====================================================
// CREATE DOOR ALARM NOTIFICATION
//
// INTERNAL FUNCTION
//
// Called when:
//
// Door opens
// +
// Alarm is armed
// +
// Alarm was previously not triggered
//
// =====================================================

async function createDoorAlarmNotification({
    smartHome,
}) {

    try {

        if (!smartHome) {

            console.error(
                "DOOR ALARM NOTIFICATION: SmartHome missing"
            );

            return null;
        }

        if (
            smartHome.alarmEnabled !== true
        ) {

            console.log(
                "DOOR ALARM NOTIFICATION: Alarm is not armed."
            );

            return null;
        }

        const notification =
            await createNotification({

                userId:
                    smartHome.owner,

                smartHomeId:
                    smartHome._id,

                type:
                    "door_alarm",

                title:
                    "Security Alert",

                message:
                    "Door opened while the alarm was armed.",

            });

        return notification;

    } catch (error) {

        console.error(
            "CREATE DOOR ALARM NOTIFICATION ERROR:",
            error
        );

        return null;
    }
}


// =====================================================
// CREATE PUMP NOTIFICATION
//
// INTERNAL FUNCTION
//
// Called when:
//
// Water Pump R8 changes state.
//
// =====================================================

async function createPumpNotification({
    smartHome,
    state,
}) {

    try {

        if (!smartHome) {

            console.error(
                "PUMP NOTIFICATION: SmartHome missing"
            );

            return null;
        }

        if (
            !["ON", "OFF"].includes(state)
        ) {

            console.error(
                "PUMP NOTIFICATION: Invalid state:",
                state
            );

            return null;
        }

        const notification =
            await createNotification({

                userId:
                    smartHome.owner,

                smartHomeId:
                    smartHome._id,

                type:
                    "pump",

                title:
                    "Water Pump",

                message:
                    `Water pump turned ${state}.`,

            });

        return notification;

    } catch (error) {

        console.error(
            "CREATE PUMP NOTIFICATION ERROR:",
            error
        );

        return null;
    }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getNotifications,

    markNotificationRead,

    markAllNotificationsRead,

    deleteNotification,

    createNotification,

    createDeviceNotification,

    createDoorAlarmNotification,

    createPumpNotification,

};

