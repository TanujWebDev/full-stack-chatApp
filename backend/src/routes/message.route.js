import express from 'express';
import { protectRoute } from './../middleware/auth.middleware.js'
import { 
    getMessages, 
    getUserForSidebar, 
    sendMessage, 
    markMessagesAsRead,
    toggleStarMessage,
    clearChat,
    toggleBlockUser,
    toggleMuteUser,
    setDisappearingSetting,
    toggleReaction,
    createGroup,
    getGroups,
    getGroupMessages,
    sendGroupMessage,
    searchUsers
} from '../controllers/message.controller.js';

const router = express.Router();

router.get('/users', protectRoute, getUserForSidebar);
router.get('/search-directory', protectRoute, searchUsers);
router.get('/:id', protectRoute, getMessages);

router.post('/send/:id', protectRoute, sendMessage)
router.put('/read/:id', protectRoute, markMessagesAsRead)

router.put('/star/:messageId', protectRoute, toggleStarMessage)
router.delete('/clear/:id', protectRoute, clearChat)
router.post('/block/:id', protectRoute, toggleBlockUser)
router.post('/mute/:id', protectRoute, toggleMuteUser)
router.post('/disappearing/:id', protectRoute, setDisappearingSetting)

// Group & Reaction Routes
router.post('/groups', protectRoute, createGroup)
router.get('/groups/all', protectRoute, getGroups)
router.get('/groups/:groupId', protectRoute, getGroupMessages)
router.post('/groups/send/:groupId', protectRoute, sendGroupMessage)
router.put('/react/:messageId', protectRoute, toggleReaction)

export default router;