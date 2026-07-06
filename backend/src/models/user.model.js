import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
        profilePic: {
        type: String,
        default: ""
    },
    phoneNumber: {
        type: String,
        default: ""
    },
    about: {
        type: String,
        default: "Hey there! I am using ChatApp."
    },
    blockedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    mutedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    disappearingSettings: {
        type: Map,
        of: String,
        default: {}
    }
},
   { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;