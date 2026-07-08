import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "./../lib/axios";
import { useAuthStore } from "./useAuthStore";

const moveUserToTop = (users, userId) => {
  const userIndex = users.findIndex((u) => String(u._id) === String(userId));
  if (userIndex === -1) return users;
  const updatedUsers = [...users];
  const [user] = updatedUsers.splice(userIndex, 1);
  updatedUsers.unshift(user);
  return updatedUsers;
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  searchDirectory: [],
  selectedUser: null, // can be a user or a group
  isUserLoading: false,
  isMessagesLoading: false,
  hasMoreMessages: true,
  typingUsers: {},
  searchQuery: "",
  chatSettings: {
    myDisappearing: "off",
    partnerDisappearing: "off",
    isBlockedByMe: false,
    isBlockedByPartner: false,
    isMutedByMe: false
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  searchUsersInDirectory: async (query) => {
    try {
      const res = await axiosInstance.get(`/messages/search-directory?query=${query}`);
      set({ searchDirectory: res.data });
    } catch (error) {
      console.error("Failed to search users in directory:", error);
    }
  },

  getUsers: async (showLoading = true) => {
    if (showLoading) set({ isUserLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      if (showLoading) set({ isUserLoading: false });
    }
  },

  getGroups: async () => {
    try {
      const res = await axiosInstance.get("/messages/groups/all");
      set({ groups: res.data });
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/messages/groups", groupData);
      set((state) => ({
        groups: [res.data, ...state.groups]
      }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  getMessages: async (chatId, isLoadMore = false) => {
    const selectedUser = get().selectedUser;
    if (!selectedUser) return;

    if (!isLoadMore) {
      set({ isMessagesLoading: true });
    }
    try {
      if (selectedUser.isGroup) {
        // Group messages
        const res = await axiosInstance.get(`/messages/groups/${chatId}`);
        set({
          messages: res.data.messages,
          hasMoreMessages: false,
          chatSettings: {
            myDisappearing: "off",
            partnerDisappearing: "off",
            isBlockedByMe: false,
            isBlockedByPartner: false,
            isMutedByMe: false
          }
        });
      } else {
        // One-to-one messages
        const skip = isLoadMore ? get().messages.length : 0;
        const res = await axiosInstance.get(`/messages/${chatId}?limit=20&skip=${skip}`);
        const { messages, settings } = res.data;
        
        if (isLoadMore) {
          set({
            messages: [...messages, ...get().messages],
            hasMoreMessages: messages.length === 20
          });
        } else {
          set({
            messages: messages,
            hasMoreMessages: messages.length === 20,
            chatSettings: settings || {
              myDisappearing: "off",
              partnerDisappearing: "off",
              isBlockedByMe: false,
              isBlockedByPartner: false,
              isMutedByMe: false
            }
          });
          // Mark messages as read on load
          await get().markMessagesAsRead(chatId);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to get messages");
    } finally {
      if (!isLoadMore) {
        set({ isMessagesLoading: false });
      }
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, users } = get();
    try {
      let res;
      if (selectedUser.isGroup) {
        res = await axiosInstance.post(
          `/messages/groups/send/${selectedUser._id}`,
          messageData
        );
        set({
          messages: [...messages, res.data]
        });
      } else {
        res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`,
          messageData,
        );
        set({ 
          messages: [...messages, res.data],
          users: moveUserToTop(users, selectedUser._id)
        });
        get().getUsers(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  toggleMessageReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        )
      }));
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.put(`/messages/read/${userId}`);
      // Reset unread count locally for this user
      const { users } = get();
      const updatedUsers = users.map((user) => 
        String(user._id) === String(userId) ? { ...user, unreadCount: 0 } : user
      );
      set({ users: updatedUsers });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  toggleStarMessage: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/star/${messageId}`);
      set((state) => ({
        messages: state.messages.map((m) => 
          m._id === messageId ? { ...m, isStarred: res.data.isStarred } : m
        )
      }));
      toast.success(res.data.isStarred ? "Message starred" : "Message unstarred");
    } catch (error) {
      console.error("Error starring message:", error);
    }
  },

  clearChat: async (partnerId) => {
    try {
      await axiosInstance.delete(`/messages/clear/${partnerId}`);
      set({ messages: [] });
      toast.success("Chat history cleared");
    } catch (error) {
      toast.error("Failed to clear chat");
    }
  },

  toggleBlockUser: async (partnerId) => {
    try {
      const res = await axiosInstance.post(`/messages/block/${partnerId}`);
      set((state) => ({
        chatSettings: { ...state.chatSettings, isBlockedByMe: res.data.isBlocked }
      }));
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        useAuthStore.setState({
          authUser: { ...authUser, blockedUsers: res.data.blockedUsers }
        });
      }
      toast.success(res.data.isBlocked ? "Contact blocked" : "Contact unblocked");
    } catch (error) {
      toast.error("Failed to update block status");
    }
  },

  toggleMuteUser: async (partnerId) => {
    try {
      const res = await axiosInstance.post(`/messages/mute/${partnerId}`);
      set((state) => ({
        chatSettings: { ...state.chatSettings, isMutedByMe: res.data.isMuted }
      }));
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        useAuthStore.setState({
          authUser: { ...authUser, mutedUsers: res.data.mutedUsers }
        });
      }
      toast.success(res.data.isMuted ? "Notifications muted" : "Notifications unmuted");
    } catch (error) {
      toast.error("Failed to mute notifications");
    }
  },

  setDisappearingSetting: async (partnerId, value) => {
    try {
      const res = await axiosInstance.post(`/messages/disappearing/${partnerId}`, { value });
      set((state) => ({
        chatSettings: { ...state.chatSettings, myDisappearing: value }
      }));
      const authUser = useAuthStore.getState().authUser;
      if (authUser) {
        useAuthStore.setState({
          authUser: { ...authUser, disappearingSettings: res.data.disappearingSettings }
        });
      }
      toast.success(`Disappearing messages set to ${value}`);
    } catch (error) {
      toast.error("Failed to update disappearing settings");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", async (newMessage) => {
      const { selectedUser } = get();

      // If the message is part of the current active conversation
      if (selectedUser && !selectedUser.isGroup && String(newMessage.senderId) === String(selectedUser._id)) {
        set((state) => {
          if (state.messages.some((message) => String(message._id) === String(newMessage._id))) {
            return state;
          }
          return { 
            messages: [...state.messages, newMessage],
            users: moveUserToTop(state.users, selectedUser._id)
          };
        });

        // Instantly mark as read
        try {
          await axiosInstance.put(`/messages/read/${selectedUser._id}`);
        } catch (e) {
          console.error("Failed to read message in real-time:", e);
        }
      } else if (!newMessage.groupId) {
        // Refresh contacts to pull in any new first-time sender
        await get().getUsers(false);
        // Increment unread count for that user in the list
        set((state) => {
          const updatedUsers = state.users.map((user) => {
            if (String(user._id) === String(newMessage.senderId)) {
              return { ...user, unreadCount: (user.unreadCount || 0) + 1 };
            }
            return user;
          });
          return { users: moveUserToTop(updatedUsers, newMessage.senderId) };
        });
      }
    });

    socket.off("newGroupMessage");
    socket.on("newGroupMessage", (newMessage) => {
      const { selectedUser } = get();
      if (selectedUser && selectedUser.isGroup && String(newMessage.groupId) === String(selectedUser._id)) {
        set((state) => {
          if (state.messages.some((m) => String(m._id) === String(newMessage._id))) {
            return state;
          }
          return { messages: [...state.messages, newMessage] };
        });
      }
    });

    socket.off("newGroupCreated");
    socket.on("newGroupCreated", (newGroup) => {
      set((state) => ({
        groups: [newGroup, ...state.groups]
      }));
    });

    socket.off("messageReactionUpdated");
    socket.on("messageReactionUpdated", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        )
      }));
    });

    socket.off("userTyping");
    socket.on("userTyping", ({ senderId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: true }
      }));
    });

    socket.off("userStoppedTyping");
    socket.on("userStoppedTyping", ({ senderId }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: false }
      }));
    });

    socket.off("messagesRead");
    socket.on("messagesRead", ({ readerId }) => {
      const { selectedUser, messages } = get();
      if (selectedUser && !selectedUser.isGroup && String(selectedUser._id) === String(readerId)) {
        const updatedMessages = messages.map((msg) => 
          String(msg.receiverId) === String(readerId) ? { ...msg, isRead: true } : msg
        );
        set({ messages: updatedMessages });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newGroupCreated");
    socket.off("messageReactionUpdated");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
    socket.off("messagesRead");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
