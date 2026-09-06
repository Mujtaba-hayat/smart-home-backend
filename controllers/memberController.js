const Member = require("../models/Member");
const User = require("../models/User");
const SmartHome = require("../models/SmartHome");

// =====================================================
// FIND OWNER SMART HOME
// =====================================================

async function findOwnerHome(userId) {
    return SmartHome.findOne({
        owner: userId,
    });
}

// =====================================================
// FIND ACCEPTED MEMBER RECORD
// =====================================================

async function findAcceptedMembership(userId) {
    return Member.findOne({
        user: userId,
        status: "accepted",
    }).populate("smartHome");
}

// =====================================================
// FIND SMART HOME ACCESS
// =====================================================

async function findUserSmartHome(userId) {
    // -------------------------------------------------
    // FIRST: CHECK ACCEPTED MEMBERSHIP
    // -------------------------------------------------

    const membership =
        await findAcceptedMembership(userId);

    if (
        membership &&
        membership.smartHome
    ) {
        const smartHome =
            membership.smartHome;

        return {
            smartHome,

            isOwner:
                smartHome.owner.toString() ===
                userId.toString(),

            membership,
        };
    }

    // -------------------------------------------------
    // SECOND: CHECK IF USER OWNS A SMART HOME
    // -------------------------------------------------

    const ownedHome =
        await findOwnerHome(userId);

    if (ownedHome) {
        return {
            smartHome: ownedHome,
            isOwner: true,
            membership: null,
        };
    }

    // -------------------------------------------------
    // NO SMART HOME FOUND
    // -------------------------------------------------

    return null;
}

// =====================================================
// CHECK MEMBER MANAGEMENT PERMISSION
// =====================================================

async function checkMemberManagementPermission(
    userId,
    smartHome
) {
    // -------------------------------------------------
    // OWNER ALWAYS HAS PERMISSION
    // -------------------------------------------------

    if (
        smartHome.owner.toString() ===
        userId.toString()
    ) {
        return true;
    }

    // -------------------------------------------------
    // CHECK ACCEPTED MEMBER PERMISSION
    // -------------------------------------------------

    const membership =
        await Member.findOne({
            smartHome: smartHome._id,
            user: userId,
            status: "accepted",
        });

    return (
        membership?.canManageMembers === true
    );
}

// =====================================================
// GET MEMBERS
// =====================================================

async function getMembers(req, res) {
    try {
        const userId =
            req.user.userId;

        console.log("=================================");
        console.log("GET MEMBERS REQUEST");
        console.log("User ID:", userId);
        console.log("=================================");

        // -------------------------------------------------
        // FIND USER SMART HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(userId);

        if (!access) {
            return res.status(404).json({
                success: false,
                message:
                    "Smart home not found",
            });
        }

        const {
            smartHome,
            isOwner,
        } = access;

        console.log(
            "Smart Home ID:",
            smartHome._id.toString()
        );

        console.log(
            "Smart Home Name:",
            smartHome.name
        );

        console.log(
            "Is Owner:",
            isOwner
        );

        // -------------------------------------------------
        // CHECK MEMBER MANAGEMENT PERMISSION
        // -------------------------------------------------

        const allowed =
            await checkMemberManagementPermission(
                userId,
                smartHome
            );

        if (!allowed) {
            console.log(
                "GET MEMBERS ACCESS DENIED:",
                userId
            );

            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage members",
            });
        }

        // -------------------------------------------------
        // GET OWNER
        // -------------------------------------------------

        const owner =
            await User.findById(
                smartHome.owner
            ).select(
                "name fullName email"
            );

        // -------------------------------------------------
        // GET ACCEPTED MEMBERS
        // -------------------------------------------------

        const members =
            await Member.find({
                smartHome:
                    smartHome._id,

                status:
                    "accepted",
            })
                .populate(
                    "user",
                    "name fullName email"
                )
                .populate(
                    "invitedBy",
                    "name fullName email"
                );

        // -------------------------------------------------
        // CURRENT USER MEMBERSHIP
        // -------------------------------------------------

        let currentMembership = null;

        if (!isOwner) {
            currentMembership =
                await Member.findOne({
                    smartHome:
                        smartHome._id,

                    user:
                        userId,

                    status:
                        "accepted",
                });
        }

        // -------------------------------------------------
        // CURRENT USER PERMISSIONS
        // -------------------------------------------------

        const currentUserPermissions =
            isOwner
                ? {
                    canControlDevices: true,
                    canControlPump: true,
                    canManageDevices: true,
                    canManageMembers: true,
                }
                : {
                    canControlDevices:
                        currentMembership
                            ?.canControlDevices === true,

                    canControlPump:
                        currentMembership
                            ?.canControlPump === true,

                    canManageDevices:
                        currentMembership
                            ?.canManageDevices === true,

                    canManageMembers:
                        currentMembership
                            ?.canManageMembers === true,
                };

        // -------------------------------------------------
        // SMART HOME RESPONSE
        // -------------------------------------------------

        const smartHomeResponse = {
            id:
                smartHome._id,

            name:
                smartHome.name,

            esp32Id:
                smartHome.esp32Id ||
                null,

            status:
                smartHome.status ||
                "disconnected",

            pumpRelay:
                smartHome.pumpRelay ||
                "R8",

            pumpIsOn:
                smartHome.pumpIsOn === true,
        };

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        console.log(
            "GET MEMBERS SUCCESS"
        );

        console.log(
            "Member count:",
            members.length
        );

        console.log("=================================");

        return res.status(200).json({
            success: true,

            smartHome:
                smartHomeResponse,

            isOwner,

            owner,

            currentUserPermissions,

            members,

            memberCount:
                members.length,
        });

    } catch (error) {
        console.error(
            "================================="
        );

        console.error(
            "GET MEMBERS ERROR"
        );

        console.error(
            "Error name:",
            error.name
        );

        console.error(
            "Error message:",
            error.message
        );

        console.error(
            "Error stack:",
            error.stack
        );

        console.error(
            "================================="
        );

        return res.status(500).json({
            success: false,
            message:
                "Server error",
            error:
                process.env.NODE_ENV ===
                "development"
                    ? error.message
                    : undefined,
        });
    }
}

// =====================================================
// ADD / INVITE MEMBER
// =====================================================

async function addMember(req, res) {
    try {
        const userId =
            req.user.userId;

        const {
            email,
            controlDevices = true,
            controlPump = false,
            manageDevices = false,
            manageMembers = false,
        } = req.body;

        // -------------------------------------------------
        // FIND USER SMART HOME
        // -------------------------------------------------

        const access =
            await findUserSmartHome(
                userId
            );

        if (!access) {
            return res.status(404).json({
                success: false,
                message:
                    "Smart home not found",
            });
        }

        const {
            smartHome,
        } = access;

        // -------------------------------------------------
        // CHECK MEMBER MANAGEMENT PERMISSION
        // -------------------------------------------------

        const allowed =
            await checkMemberManagementPermission(
                userId,
                smartHome
            );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage members",
            });
        }

        // -------------------------------------------------
        // VALIDATE EMAIL
        // -------------------------------------------------

        if (
            !email ||
            !email.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Member email is required",
            });
        }

        const memberEmail =
            email.trim().toLowerCase();

        // -------------------------------------------------
        // FIND USER
        // -------------------------------------------------

        const memberUser =
            await User.findOne({
                email:
                    memberEmail,
            });

        if (!memberUser) {
            return res.status(404).json({
                success: false,
                message:
                    "No user found with this email",
            });
        }

        // -------------------------------------------------
        // OWNER CANNOT INVITE HIMSELF
        // -------------------------------------------------

        if (
            memberUser._id.toString() ===
            smartHome.owner.toString()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Smart Home owner cannot be invited",
            });
        }

        // -------------------------------------------------
        // CHECK EXISTING MEMBERSHIP
        // -------------------------------------------------

        const existingMember =
            await Member.findOne({
                smartHome:
                    smartHome._id,

                user:
                    memberUser._id,
            });

        if (existingMember) {
            // -------------------------------------------------
            // PENDING
            // -------------------------------------------------

            if (
                existingMember.status ===
                "pending"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This user already has a pending invitation",
                });
            }

            // -------------------------------------------------
            // ACCEPTED
            // -------------------------------------------------

            if (
                existingMember.status ===
                "accepted"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This user is already a member",
                });
            }

            // -------------------------------------------------
            // REJECTED
            // -------------------------------------------------

            existingMember.status =
                "pending";

            existingMember.role =
                "member";

            existingMember.canControlDevices =
                controlDevices === true;

            existingMember.canControlPump =
                controlPump === true;

            existingMember.canManageDevices =
                manageDevices === true;

            existingMember.canManageMembers =
                manageMembers === true;

            existingMember.invitedBy =
                userId;

            await existingMember.save();

            return res.status(201).json({
                success: true,

                message:
                    "Member invitation sent successfully",

                member: {
                    id:
                        existingMember._id,

                    userId:
                        memberUser._id,

                    name:
                        memberUser.name ||
                        memberUser.fullName,

                    email:
                        memberUser.email,

                    role:
                        existingMember.role,

                    status:
                        existingMember.status,

                    canControlDevices:
                        existingMember.canControlDevices,

                    canControlPump:
                        existingMember.canControlPump,

                    canManageDevices:
                        existingMember.canManageDevices,

                    canManageMembers:
                        existingMember.canManageMembers,
                },
            });
        }

        // -------------------------------------------------
        // CREATE NEW MEMBER INVITATION
        // -------------------------------------------------

        const member =
            await Member.create({
                smartHome:
                    smartHome._id,

                user:
                    memberUser._id,

                role:
                    "member",

                canControlDevices:
                    controlDevices === true,

                canControlPump:
                    controlPump === true,

                canManageDevices:
                    manageDevices === true,

                canManageMembers:
                    manageMembers === true,

                status:
                    "pending",

                invitedBy:
                    userId,
            });

        console.log("=================================");
        console.log(
            "SMART HOME MEMBER INVITED"
        );
        console.log(
            "Smart Home:",
            smartHome.name
        );
        console.log(
            "Invited User:",
            memberUser.email
        );
        console.log(
            "Invited By:",
            userId
        );
        console.log(
            "Status:",
            member.status
        );
        console.log("=================================");

        return res.status(201).json({
            success: true,

            message:
                "Member invitation sent successfully",

            member: {
                id:
                    member._id,

                userId:
                    memberUser._id,

                name:
                    memberUser.name ||
                    memberUser.fullName,

                email:
                    memberUser.email,

                role:
                    member.role,

                status:
                    member.status,

                canControlDevices:
                    member.canControlDevices,

                canControlPump:
                    member.canControlPump,

                canManageDevices:
                    member.canManageDevices,

                canManageMembers:
                    member.canManageMembers,
            },
        });

    } catch (error) {
        console.error(
            "ADD MEMBER ERROR:",
            error
        );

        if (
            error.code === 11000
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This user is already a member or has a pending invitation",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Server error",
        });
    }
}

// =====================================================
// GET MY INVITATIONS
// =====================================================

async function getMyInvitations(req, res) {
    try {
        const userId =
            req.user.userId;

        const invitations =
            await Member.find({
                user:
                    userId,

                status:
                    "pending",
            })
                .populate(
                    "smartHome",
                    "name esp32Id status pumpRelay pumpIsOn owner"
                )
                .populate(
                    "invitedBy",
                    "name fullName email"
                );

        return res.json({
            success: true,

            invitations,

            invitationCount:
                invitations.length,
        });

    } catch (error) {
        console.error(
            "GET MY INVITATIONS ERROR:",
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
// ACCEPT INVITATION
// =====================================================

async function acceptInvitation(req, res) {
    try {
        const userId =
            req.user.userId;

        const member =
            await Member.findOne({
                _id:
                    req.params.memberId,

                user:
                    userId,

                status:
                    "pending",
            });

        if (!member) {
            return res.status(404).json({
                success: false,
                message:
                    "Invitation not found",
            });
        }

        member.status =
            "accepted";

        await member.save();

        const smartHome =
            await SmartHome.findById(
                member.smartHome
            );

        return res.json({
            success: true,

            message:
                "Invitation accepted successfully",

            member,

            smartHome:
                smartHome
                    ? {
                        id:
                            smartHome._id,

                        name:
                            smartHome.name,

                        esp32Id:
                            smartHome.esp32Id,

                        status:
                            smartHome.status,

                        pumpRelay:
                            smartHome.pumpRelay ||
                            "R8",

                        pumpIsOn:
                            smartHome.pumpIsOn ===
                            true,
                    }
                    : null,
        });

    } catch (error) {
        console.error(
            "ACCEPT INVITATION ERROR:",
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
// REJECT INVITATION
// =====================================================

async function rejectInvitation(req, res) {
    try {
        const userId =
            req.user.userId;

        const member =
            await Member.findOne({
                _id:
                    req.params.memberId,

                user:
                    userId,

                status:
                    "pending",
            });

        if (!member) {
            return res.status(404).json({
                success: false,
                message:
                    "Invitation not found",
            });
        }

        member.status =
            "rejected";

        await member.save();

        return res.json({
            success: true,

            message:
                "Invitation rejected successfully",
        });

    } catch (error) {
        console.error(
            "REJECT INVITATION ERROR:",
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
// REMOVE MEMBER
// =====================================================

async function removeMember(req, res) {
    try {
        const userId =
            req.user.userId;

        const access =
            await findUserSmartHome(
                userId
            );

        if (!access) {
            return res.status(404).json({
                success: false,
                message:
                    "Smart home not found",
            });
        }

        const {
            smartHome,
        } = access;

        // -------------------------------------------------
        // CHECK PERMISSION
        // -------------------------------------------------

        const allowed =
            await checkMemberManagementPermission(
                userId,
                smartHome
            );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage members",
            });
        }

        // -------------------------------------------------
        // FIND MEMBER
        // -------------------------------------------------

        const member =
            await Member.findOne({
                _id:
                    req.params.memberId,

                smartHome:
                    smartHome._id,
            });

        if (!member) {
            return res.status(404).json({
                success: false,
                message:
                    "Member not found",
            });
        }

        // -------------------------------------------------
        // OWNER CANNOT BE REMOVED
        // -------------------------------------------------

        if (
            member.user.toString() ===
            smartHome.owner.toString()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Smart Home owner cannot be removed",
            });
        }

        await member.deleteOne();

        return res.json({
            success: true,

            message:
                "Member removed successfully",
        });

    } catch (error) {
        console.error(
            "REMOVE MEMBER ERROR:",
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
// UPDATE MEMBER PERMISSIONS
// =====================================================

async function updateMemberPermissions(
    req,
    res
) {
    try {
        const userId =
            req.user.userId;

        const access =
            await findUserSmartHome(
                userId
            );

        if (!access) {
            return res.status(404).json({
                success: false,
                message:
                    "Smart home not found",
            });
        }

        const {
            smartHome,
        } = access;

        // -------------------------------------------------
        // CHECK PERMISSION
        // -------------------------------------------------

        const allowed =
            await checkMemberManagementPermission(
                userId,
                smartHome
            );

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have permission to manage members",
            });
        }

        // -------------------------------------------------
        // FIND MEMBER
        // -------------------------------------------------

        const member =
            await Member.findOne({
                _id:
                    req.params.memberId,

                smartHome:
                    smartHome._id,

                status:
                    "accepted",
            });

        if (!member) {
            return res.status(404).json({
                success: false,
                message:
                    "Member not found",
            });
        }

        // -------------------------------------------------
        // OWNER PERMISSIONS CANNOT BE CHANGED
        // -------------------------------------------------

        if (
            member.user.toString() ===
            smartHome.owner.toString()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Owner permissions cannot be changed",
            });
        }

        // -------------------------------------------------
        // PREVENT SELF-PERMISSION ESCALATION
        // -------------------------------------------------

        if (
            member.user.toString() ===
            userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot change your own permissions",
            });
        }

        // -------------------------------------------------
        // REQUEST DATA
        // -------------------------------------------------

        const {
            controlDevices,
            controlPump,
            manageDevices,
            manageMembers,
        } = req.body;

        // -------------------------------------------------
        // UPDATE PERMISSIONS
        // -------------------------------------------------

        if (
            typeof controlDevices ===
            "boolean"
        ) {
            member.canControlDevices =
                controlDevices;
        }

        if (
            typeof controlPump ===
            "boolean"
        ) {
            member.canControlPump =
                controlPump;
        }

        if (
            typeof manageDevices ===
            "boolean"
        ) {
            member.canManageDevices =
                manageDevices;
        }

        if (
            typeof manageMembers ===
            "boolean"
        ) {
            member.canManageMembers =
                manageMembers;
        }

        await member.save();

        return res.json({
            success: true,

            message:
                "Member permissions updated successfully",

            member,
        });

    } catch (error) {
        console.error(
            "UPDATE MEMBER PERMISSIONS ERROR:",
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
// LEAVE SMART HOME
// =====================================================

async function leaveSmartHome(req, res) {
    try {
        const userId =
            req.user.userId;

        const membership =
            await Member.findOne({
                user:
                    userId,

                status:
                    "accepted",
            });

        if (!membership) {
            return res.status(404).json({
                success: false,
                message:
                    "You are not a member of any Smart Home",
            });
        }

        await membership.deleteOne();

        console.log(
            "USER LEFT SMART HOME:",
            userId
        );

        return res.json({
            success: true,

            message:
                "You left the Smart Home successfully",
        });

    } catch (error) {
        console.error(
            "LEAVE SMART HOME ERROR:",
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
    getMembers,
    addMember,
    getMyInvitations,
    acceptInvitation,
    rejectInvitation,
    removeMember,
    updateMemberPermissions,
    leaveSmartHome,
};