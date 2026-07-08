import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { CheckCheck, Star, Search, X, Play, Pause } from "lucide-react";
import ContactInfoModal from "./ContactInfoModal";
import CallingOverlay from "./CallingOverlay";

// Premium Custom Audio Player Component
const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-base-300/40 rounded-xl w-60 sm:w-64 text-base-content my-1 border border-base-300 shadow-inner">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
      />
      <button
        onClick={togglePlay}
        type="button"
        className="btn btn-circle btn-primary btn-xs sm:btn-sm hover:scale-105 cursor-pointer shrink-0"
      >
        {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
      </button>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const newTime = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }}
          className="range range-xs range-primary w-full cursor-pointer h-1.5"
        />
        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-bold px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    hasMoreMessages,
    typingUsers,
    toggleStarMessage,
    toggleMessageReaction,
    searchQuery,
    setSearchQuery,
    chatSettings,
    toggleBlockUser
  } = useChatStore();

  const {authUser} = useAuthStore();
  const messageEndRef = useRef(null);
  const containerRef = useRef(null);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState("audio");
  const [isSearching, setIsSearching] = useState(false);

  const lastFirstMessageId = useRef(null);
  const lastMessageId = useRef(null);
  const isFetchingRef = useRef(false);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    getMessages(selectedUser._id);

    // Reset scroll tracking and search on user change
    lastFirstMessageId.current = null;
    lastMessageId.current = null;
    prevMessagesLength.current = 0;
    setSearchQuery("");
    setIsSearching(false);
  }, [selectedUser._id, getMessages, setSearchQuery]);

  // Handle scroll to top pagination
  const handleScroll = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && hasMoreMessages && !isFetchingRef.current) {
      isFetchingRef.current = true;
      const currentScrollHeight = container.scrollHeight;

      await getMessages(selectedUser._id, true);

      // Adjust scroll position after messages are loaded to prevent jumping
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - currentScrollHeight;
        }
        isFetchingRef.current = false;
      }, 0);
    }
  };

  // Smart auto-scroll behavior
  useEffect(() => {
    if (isMessagesLoading || !messages || messages.length === 0) {
      return;
    }

    // Determine if we should scroll to bottom (e.g. initial load or new messages sent/received)
    const isNewMessage = prevMessagesLength.current === 0 || messages[messages.length - 1]?._id !== lastMessageId.current;

    if (isNewMessage) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 50);
    }

    lastFirstMessageId.current = messages[0]?._id;
    lastMessageId.current = messages[messages.length - 1]?._id;
    prevMessagesLength.current = messages.length;
  }, [messages, isMessagesLoading]);

  // Filter messages for suggestions dropdown list
  const matchingMessages = searchQuery.trim()
    ? messages.filter((m) => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleScrollToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "scale-102", "transition-all", "duration-300");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "scale-102");
      }, 2000);
    }
    setSearchQuery("");
    setIsSearching(false);
  };

  const handleStartCall = (type) => {
    setCallType(type);
    setIsCalling(true);
  };

  if(isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader onOpenInfo={() => setIsInfoOpen(true)} onStartCall={handleStartCall} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    )
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader onOpenInfo={() => setIsInfoOpen(true)} onStartCall={handleStartCall} />

      {/* Dynamic Search Bar (WhatsApp Style) */}
      {isSearching && (
        <div className="px-4 py-2 border-b border-base-300 bg-base-200/50 flex items-center gap-2 justify-between animate-fade-in relative z-20">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search size={16} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm w-full outline-none"
              autoFocus
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setIsSearching(false);
            }}
            className="btn btn-ghost btn-circle btn-xs text-zinc-500 hover:text-base-content"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Floating Suggestions Overlay Dropdown */}
      {isSearching && searchQuery.trim() && (
        <div className="absolute top-12 left-4 right-4 bg-base-100 border border-base-300 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-[99] p-2 space-y-1 animate-fade-in">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 px-2 py-1">
            Matching messages ({matchingMessages.length})
          </p>
          {matchingMessages.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No matching messages found</p>
          ) : (
            matchingMessages.map((m) => (
              <button
                key={m._id}
                onClick={() => handleScrollToMessage(m._id)}
                className="w-full text-left p-2 rounded-lg hover:bg-base-200 transition-colors flex flex-col cursor-pointer border border-transparent hover:border-base-300 text-base-content"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-primary">
                    {m.senderId?._id === authUser._id ? "You" : m.senderId?.fullName || selectedUser.fullName}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    {formatMessageTime(m.createdAt)}
                  </span>
                </div>
                <span className="text-xs truncate text-zinc-600 dark:text-zinc-300 mt-0.5 w-full">
                  {m.text}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => {
          const isMyMessage = (message.senderId?._id || message.senderId) === authUser._id;
          const senderName = message.senderId?.fullName || (isMyMessage ? authUser.fullName : selectedUser.fullName);
          const senderPic = message.senderId?.profilePic || (isMyMessage ? authUser.profilePic : selectedUser.profilePic);

          return (
            <div 
              key={message._id}
              id={`msg-${message._id}`}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"} rounded-xl transition-all duration-300`}
            >
              {/* Message Sender Avatar */}
              <div className=" chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img 
                    src={senderPic || "/avatar.png"}
                    alt={senderName} 
                  />
                </div>
              </div>

              {/* Message Header Details */}
              <div className="chat-header mb-1 flex items-center gap-1.5 justify-end">
                {selectedUser.isGroup && !isMyMessage && (
                  <span className="text-[10px] font-bold text-primary mr-1 bg-primary/10 px-1.5 py-0.5 rounded-md">
                    {senderName}
                  </span>
                )}
                {message.isStarred && (
                  <Star size={10} className="text-yellow-500 fill-yellow-500 mr-1 animate-pulse" />
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {isMyMessage && !selectedUser.isGroup && (
                  <CheckCheck 
                    size={14} 
                    className={`inline ml-1 ${message.isRead ? "text-sky-500 font-bold" : "text-zinc-500"}`} 
                  />
                )}
              </div> 

              {/* Chat Bubble Container */}
              <div className="chat-bubble flex flex-col group relative">
                {/* Emoji reactions picker bar on hover */}
                <div className="absolute -top-3 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-300 rounded-full px-2 py-0.5 shadow-sm text-zinc-500 hover:text-primary z-20 cursor-pointer flex gap-1.5 items-center border border-base-200">
                  {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggleMessageReaction(message._id, emoji)}
                      className="hover:scale-130 transition-transform text-xs"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Star Button on Hover */}
                <button
                  onClick={() => toggleStarMessage(message._id)}
                  type="button"
                  className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-300 rounded-full p-1 shadow-sm text-zinc-500 hover:text-yellow-500 z-20 cursor-pointer"
                  title="Star message"
                >
                  <Star size={10} className={message.isStarred ? "text-yellow-500 fill-yellow-500" : ""} />
                </button>

                {/* Reaction badge overlays */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 absolute -bottom-2.5 right-2 bg-base-200 text-base-content rounded-full px-2 py-0.5 shadow-md text-[9px] items-center border border-base-300 z-10 select-none font-bold">
                    {(() => {
                      const reactionMap = {};
                      message.reactions.forEach((r) => {
                        reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
                      });
                      return Object.entries(reactionMap).map(([emoji, count]) => (
                        <span key={emoji} title={`${count} reaction(s)`} className="flex items-center gap-0.5">
                          {emoji} {count > 1 && <span className="text-[8px] opacity-75">{count}</span>}
                        </span>
                      ));
                    })()}
                  </div>
                )}

                {/* Render Audio Voice note player if exists */}
                {message.audio && (
                  <AudioPlayer src={message.audio} />
                )}

                {/* Render Image attachment if exists */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="attachment"
                    className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.image, "_blank")}
                  />
                )}

                {/* Render Text content if exists */}
                {message.text && <p className="leading-relaxed">{message.text}</p>}
              </div>
            </div>
          );
        })}

        {typingUsers[selectedUser._id] && !selectedUser.isGroup && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img 
                  src={selectedUser.profilePic || "/avatar.png"} 
                  alt="profile pic" 
                />
              </div>
            </div>
            <div className="chat-bubble bg-base-200 text-base-content flex items-center gap-1 py-3 px-4">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Conditional Message Input or Block Warning */}
      {!selectedUser.isGroup && chatSettings.isBlockedByMe ? (
        <div className="p-4 w-full text-center text-sm text-zinc-500 bg-base-200 border-t border-base-300 font-medium">
          You blocked this contact.{" "}
          <button 
            onClick={() => toggleBlockUser(selectedUser._id)} 
            className="text-primary hover:underline font-bold cursor-pointer"
          >
            Unblock
          </button>
        </div>
      ) : !selectedUser.isGroup && chatSettings.isBlockedByPartner ? (
        <div className="p-4 w-full text-center text-sm text-zinc-500 bg-base-200 border-t border-base-300 font-medium">
          You cannot send messages to this contact.
        </div>
      ) : (
        <MessageInput />
      )}

      {/* Advanced Details Modal */}
      <ContactInfoModal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)} 
        onStartCall={handleStartCall}
        onStartSearch={() => setIsSearching(true)}
      />

      {/* Calling Simulation overlay */}
      <CallingOverlay 
        isOpen={isCalling} 
        type={callType} 
        contact={selectedUser} 
        onClose={() => setIsCalling(false)} 
      />
    </div>
  )
}

export default ChatContainer;
