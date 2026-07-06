import mongoose from 'mongoose';
import User from './../models/user.model.js'
import Message from './../models/message.model.js'
import Group from './../models/group.model.js'
import cloudinary from '../lib/cloudinary.js';

import { getUserSocketIds, io } from './../lib/socket.js'


export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: {$ne: loggedInUserId}}).select('-password').lean();

        // Count unread messages received from each user
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    receiverId: new mongoose.Types.ObjectId(loggedInUserId.toString()),
                    isRead: false
                }
            },
            {
                $group: {
                    _id: "$senderId",
                    count: { $sum: 1 }
                }
            }
        ]);

        const unreadMap = {};
        unreadCounts.forEach(item => {
            unreadMap[item._id.toString()] = item.count;
        });

        // Find the latest message timestamp for each conversation involving the logged-in user
        const lastMessages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: new mongoose.Types.ObjectId(loggedInUserId.toString()) },
                        { receiverId: new mongoose.Types.ObjectId(loggedInUserId.toString()) }
                    ]
                }
            },
            {
                $project: {
                    partnerId: {
                        $cond: [
                            { $eq: ["$senderId", new mongoose.Types.ObjectId(loggedInUserId.toString())] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    createdAt: 1
                }
            },
            {
                $group: {
                    _id: "$partnerId",
                    lastMessageTime: { $max: "$createdAt" }
                }
            }
        ]);

        const lastMessageTimeMap = {};
        lastMessages.forEach(item => {
            lastMessageTimeMap[item._id.toString()] = item.lastMessageTime;
        });

        const filteredUsersWithMessages = filteredUsers.filter(
            (user) => lastMessageTimeMap[user._id.toString()] !== undefined
        );

        const usersWithUnread = filteredUsersWithMessages.map(user => ({
            ...user,
            unreadCount: unreadMap[user._id.toString()] || 0
        }));

        // Sort contacts by latest message timestamp descending (fallback to user createdAt)
        usersWithUnread.sort((a, b) => {
            const timeA = lastMessageTimeMap[a._id.toString()] ? new Date(lastMessageTimeMap[a._id.toString()]) : new Date(0);
            const timeB = lastMessageTimeMap[b._id.toString()] ? new Date(lastMessageTimeMap[b._id.toString()]) : new Date(0);
            return timeB - timeA;
        });

        res.status(200).json(usersWithUnread);
    } catch (error){
        console.error('Error in getUserForSidebar:', error);
        res.status(500).json({ message: 'Internal Server error' });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const skip = parseInt(req.query.skip) || 0;

        const me = req.user;
        const partner = await User.findById(userToChatId);

        const mySetting = me.disappearingSettings?.get(userToChatId.toString()) || "off";
        const partnerSetting = partner?.disappearingSettings?.get(myId.toString()) || "off";

        const isBlockedByMe = me.blockedUsers?.includes(userToChatId);
        const isBlockedByPartner = partner?.blockedUsers?.includes(myId);
        const isMutedByMe = me.mutedUsers?.includes(userToChatId);

        let disappearingMode = "off";
        if (mySetting !== "off") disappearingMode = mySetting;
        else if (partnerSetting !== "off") disappearingMode = partnerSetting;

        let timeLimit = null;
        if (disappearingMode === "24h") {
            timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (disappearingMode === "7d") {
            timeLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }

        const query = {
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        };

        if (timeLimit) {
            query.createdAt = { $gte: timeLimit };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            messages: messages.reverse(),
            settings: {
                myDisappearing: mySetting,
                partnerDisappearing: partnerSetting,
                isBlockedByMe: !!isBlockedByMe,
                isBlockedByPartner: !!isBlockedByPartner,
                isMutedByMe: !!isMutedByMe
            }
        });
    } catch (error) {
        console.log('Error in getMessages controller:', error.message);
        res.status(500).json({ message: 'Internal Server error' });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image, audio } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const receiver = await User.findById(receiverId);
        if (receiver && receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
            return res.status(403).json({ message: "You are blocked by this user" });
        }

        const sender = await User.findById(senderId);
        if (sender && sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
            return res.status(400).json({ message: "Unblock this contact to send messages" });
        }

        let imageUrl; 
        if(image) {
            // upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        let audioUrl;
        if(audio) {
            // upload base64 audio note to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(audio, {
                resource_type: "video",
                folder: "chat-app/voice-notes"
            });
            audioUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            audio: audioUrl
        })

        await newMessage.save();

        const receiverSocketIds = getUserSocketIds(receiverId);
        receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("newMessage", newMessage);
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.log('Error in sendMessage controller:', error.message);
        res.status(500).json({ message: 'Internal Server error' });
    }
}

export const markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const myId = req.user._id;

        await Message.updateMany(
            { senderId: senderId, receiverId: myId, isRead: false },
            { $set: { isRead: true } }
        );

        // Notify the sender that their messages were read
        const senderSocketIds = getUserSocketIds(senderId);
        senderSocketIds.forEach((socketId) => {
            io.to(socketId).emit("messagesRead", { readerId: myId });
        });

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Error in markMessagesAsRead:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const toggleStarMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        message.isStarred = !message.isStarred;
        await message.save();
        res.status(200).json(message);
    } catch (error) {
        console.error("Error in toggleStarMessage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const clearChat = async (req, res) => {
    try {
        const { id: partnerId } = req.params;
        const myId = req.user._id;

        await Message.deleteMany({
            $or: [
                { senderId: myId, receiverId: partnerId },
                { senderId: partnerId, receiverId: myId }
            ]
        });

        res.status(200).json({ message: "Chat cleared successfully" });
    } catch (error) {
        console.error("Error in clearChat:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const toggleBlockUser = async (req, res) => {
    try {
        const { id: targetUserId } = req.params;
        const me = await User.findById(req.user._id);

        const index = me.blockedUsers.indexOf(targetUserId);
        let isBlocked = false;
        if (index > -1) {
            me.blockedUsers.splice(index, 1);
        } else {
            me.blockedUsers.push(targetUserId);
            isBlocked = true;
        }
        await me.save();

        res.status(200).json({ blockedUsers: me.blockedUsers, isBlocked });
    } catch (error) {
        console.error("Error in toggleBlockUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const toggleMuteUser = async (req, res) => {
    try {
        const { id: targetUserId } = req.params;
        const me = await User.findById(req.user._id);

        const index = me.mutedUsers.indexOf(targetUserId);
        let isMuted = false;
        if (index > -1) {
            me.mutedUsers.splice(index, 1);
        } else {
            me.mutedUsers.push(targetUserId);
            isMuted = true;
        }
        await me.save();

        res.status(200).json({ mutedUsers: me.mutedUsers, isMuted });
    } catch (error) {
        console.error("Error in toggleMuteUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const setDisappearingSetting = async (req, res) => {
    try {
        const { id: partnerId } = req.params;
        const { value } = req.body; // "off", "24h", "7d"
        const me = await User.findById(req.user._id);

        if (!me.disappearingSettings) {
            me.disappearingSettings = new Map();
        }
        
        me.disappearingSettings.set(partnerId, value);
        me.markModified('disappearingSettings');
        await me.save();

        res.status(200).json({ disappearingSettings: me.disappearingSettings });
    } catch (error) {
        console.error("Error in setDisappearingSetting:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const myId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.userId.toString() === myId.toString()
        );

        if (existingReactionIndex > -1) {
            if (message.reactions[existingReactionIndex].emoji === emoji) {
                // Remove reaction if it's the same emoji
                message.reactions.splice(existingReactionIndex, 1);
            } else {
                // Update to new emoji
                message.reactions[existingReactionIndex].emoji = emoji;
            }
        } else {
            // Add new reaction
            message.reactions.push({ userId: myId, emoji });
        }

        await message.save();

        // Notify other user(s) via socket
        const recipientId = message.groupId ? null : (message.senderId.toString() === myId.toString() ? message.receiverId : message.senderId);
        if (message.groupId) {
            const group = await Group.findById(message.groupId);
            if (group) {
                group.members.forEach((memberId) => {
                    if (memberId.toString() === myId.toString()) return;
                    const socketIds = getUserSocketIds(memberId);
                    socketIds.forEach((sid) => {
                        io.to(sid).emit("messageReactionUpdated", { messageId, reactions: message.reactions });
                    });
                });
            }
        } else if (recipientId) {
            const socketIds = getUserSocketIds(recipientId);
            socketIds.forEach((sid) => {
                io.to(sid).emit("messageReactionUpdated", { messageId, reactions: message.reactions });
            });
        }

        res.status(200).json(message);
    } catch (error) {
        console.error("Error in toggleReaction:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createGroup = async (req, res) => {
    try {
        const { name, description, members } = req.body;
        const creator = req.user._id;

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // Include creator in the members list
        const groupMembers = [creator];
        if (members && Array.isArray(members)) {
            members.forEach((m) => {
                if (m && !groupMembers.includes(m)) {
                    groupMembers.push(m);
                }
            });
        }

        const newGroup = new Group({
            name,
            description,
            creator,
            members: groupMembers
        });

        await newGroup.save();

        // Notify online group members about the new group
        groupMembers.forEach((memberId) => {
            if (memberId.toString() === creator.toString()) return;
            const socketIds = getUserSocketIds(memberId);
            socketIds.forEach((sid) => {
                io.to(sid).emit("newGroupCreated", newGroup);
            });
        });

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error in createGroup:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGroups = async (req, res) => {
    try {
        const myId = req.user._id;
        const groups = await Group.find({ members: myId }).sort({ updatedAt: -1 });
        res.status(200).json(groups);
    } catch (error) {
        console.error("Error in getGroups:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const myId = req.user._id;

        // Ensure requester is a member of the group
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(myId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const messages = await Message.find({ groupId })
            .populate('senderId', 'fullName profilePic')
            .sort({ createdAt: 1 });

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error in getGroupMessages:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { text, image, audio } = req.body;
        const senderId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(senderId)) {
            return res.status(403).json({ message: "Access denied" });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        let audioUrl;
        if (audio) {
            const uploadResponse = await cloudinary.uploader.upload(audio, {
                resource_type: "video",
                folder: "chat-app/voice-notes"
            });
            audioUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            groupId,
            text,
            image: imageUrl,
            audio: audioUrl
        });

        await newMessage.save();
        await newMessage.populate('senderId', 'fullName profilePic');

        // Notify members
        group.members.forEach((memberId) => {
            if (memberId.toString() === senderId.toString()) return;
            const socketIds = getUserSocketIds(memberId);
            socketIds.forEach((sid) => {
                io.to(sid).emit("newGroupMessage", newMessage);
            });
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sendGroupMessage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const { query } = req.query;

        const findQuery = { _id: { $ne: loggedInUserId } };
        if (query) {
            findQuery.$or = [
                { fullName: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ];
        }

        const users = await User.find(findQuery).select('-password').limit(10);
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchUsers:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
