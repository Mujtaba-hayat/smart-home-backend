const express = require("express");

const router = express.Router();

const {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} = require("../controllers/notificationController");

const protect =
    require("../middleware/authMiddleware");

// =====================================================
// GET USER NOTIFICATIONS
//
// GET /user/notifications
// =====================================================

router.get(
    "/notifications",
    protect,
    getNotifications
);

// =====================================================
// MARK ONE NOTIFICATION AS READ
//
// PUT /user/notifications/:notificationId/read
// =====================================================

router.put(
    "/notifications/:notificationId/read",
    protect,
    markNotificationRead
);

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
//
// PUT /user/notifications/read-all
// =====================================================

router.put(
    "/notifications/read-all",
    protect,
    markAllNotificationsRead
);

// =====================================================
// DELETE NOTIFICATION
//
// DELETE /user/notifications/:notificationId
// =====================================================

router.delete(
    "/notifications/:notificationId",
    protect,
    deleteNotification
);

module.exports = router;
