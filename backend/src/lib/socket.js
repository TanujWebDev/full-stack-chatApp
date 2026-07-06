import {Server} from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: [CLIENT_URL],
        credentials: true
    }
})

// userId -> socket ids. A user can have multiple tabs/dev connections open.
const userSocketMap = new Map();

const getOnlineUserIds = () => Array.from(userSocketMap.keys());
const getUserSocketIds = (userId) =>
    Array.from(userSocketMap.get(userId?.toString()) || []);

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (!userId) return;

    const userSockets = userSocketMap.get(userId) || new Set();
    userSockets.add(socket.id);
    userSocketMap.set(userId, userSockets);

    io.emit("getOnlineUsers", getOnlineUserIds());

    socket.on("typing", ({ receiverId }) => {
        const receiverSocketIds = getUserSocketIds(receiverId);
        receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("userTyping", { senderId: userId });
        });
    });

    socket.on("stopTyping", ({ receiverId }) => {
        const receiverSocketIds = getUserSocketIds(receiverId);
        receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("userStoppedTyping", { senderId: userId });
        });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
        const userSockets = userSocketMap.get(userId);

        if (userSockets) {
            userSockets.delete(socket.id);

            if (userSockets.size === 0) {
                userSocketMap.delete(userId);
            }
        }

        io.emit("getOnlineUsers", getOnlineUserIds());
    })
})

export {io, app, server, getUserSocketIds};
