import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: false,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        audio: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isStarred: {
            type: Boolean,
            default: false,
        },
        reactions: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                emoji: {
                    type: String
                }
            }
        ]
    },
    { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

export default Message;