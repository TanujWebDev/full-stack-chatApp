import { X, Phone, Video, ChevronLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = ({ onOpenInfo, onStartCall }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={() => setSelectedUser(null)}
            className="md:hidden p-1.5 mr-0.5 rounded-full hover:bg-base-200 transition-colors text-zinc-500 hover:text-base-content shrink-0 cursor-pointer"
            title="Back to chats"
          >
            <ChevronLeft size={22} />
          </button>

          <div 
            onClick={onOpenInfo}
            className="flex items-center gap-3 cursor-pointer hover:bg-base-200/50 px-2 py-1 rounded-xl transition-colors min-w-0"
          >
            {/* Avatar */}
            <div className="avatar shrink-0">
              <div className="size-10 rounded-full relative">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                />
              </div>
            </div>

            {/* User info */}
            <div className="truncate">
              <h3 className="font-medium truncate text-sm sm:text-base">{selectedUser.fullName}</h3>
              <p className="text-xs text-base-content/70">
                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Audio Call */}
          <button
            onClick={() => onStartCall("audio")}
            className="cursor-pointer p-2 rounded-full hover:bg-base-200 text-zinc-500 hover:text-primary transition-colors"
            title="Audio call"
          >
            <Phone size={18} />
          </button>

          {/* Video Call */}
          <button
            onClick={() => onStartCall("video")}
            className="cursor-pointer p-2 rounded-full hover:bg-base-200 text-zinc-500 hover:text-primary transition-colors"
            title="Video call"
          >
            <Video size={18} />
          </button>

          {/* Close button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="hidden md:block cursor-pointer p-2 rounded-full hover:bg-base-200 transition-colors text-zinc-500 hover:text-base-content"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
