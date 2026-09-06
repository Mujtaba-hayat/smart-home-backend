const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    addMember,
    getMembers,
    getMyInvitations,
    acceptInvitation,
    rejectInvitation,
    removeMember,
    updateMemberPermissions,
    leaveSmartHome,
} = require("../controllers/memberController");

// =====================================================
// SMART HOME MEMBERS
// =====================================================

// Get members of Smart Home
router.get(
    "/",
    protect,
    getMembers
);

// Add / invite member
router.post(
    "/",
    protect,
    addMember
);

// Remove member
router.delete(
    "/:memberId",
    protect,
    removeMember
);

// Update member permissions
router.patch(
    "/:memberId/permissions",
    protect,
    updateMemberPermissions
);

// =====================================================
// MEMBER INVITATIONS
// =====================================================

// Get my pending invitations
router.get(
    "/invitations",
    protect,
    getMyInvitations
);

// Accept invitation
router.post(
    "/:memberId/accept",
    protect,
    acceptInvitation
);

// Reject invitation
router.post(
    "/:memberId/reject",
    protect,
    rejectInvitation
);

// =====================================================
// LEAVE SMART HOME
// =====================================================

router.delete(
    "/leave",
    protect,
    leaveSmartHome
);

module.exports = router;