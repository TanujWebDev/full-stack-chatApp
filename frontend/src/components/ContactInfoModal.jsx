import React, { useState } from "react";
import { 
  Info, 
  Image, 
  Star, 
  Phone, 
  Video, 
  Search, 
  VolumeX, 
  Trash2, 
  Slash, 
  Clock, 
  X 
} from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const ContactInfoModal = ({ isOpen, onClose, onStartCall, onStartSearch }) => {
  const { 
    selectedUser, 
    messages, 
    chatSettings,
    toggleBlockUser,
    toggleMuteUser,
    setDisappearingSetting,
    clearChat,
    searchQuery,
    setSearchQuery
  } = useChatStore();

  const [activeTab, setActiveTab] = useState("info");

  if (!isOpen || !selectedUser) return null;

  // Filter messages for Media and Starred tabs
  const mediaMessages = messages.filter((m) => m.image);
  const starredMessages = messages.filter((m) => m.isStarred);

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      clearChat(selectedUser._id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl border border-base-300 w-full max-w-3xl h-[550px] shadow-2xl flex overflow-hidden animate-fade-in text-base-content">
        
        {/* Left Tabs Navigation */}
        <aside className="w-1/3 border-r border-base-300 bg-base-200/50 flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Contact</h3>
            <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm md:hidden">
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-1.5 flex-1">
            <button
              onClick={() => setActiveTab("info")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                activeTab === "info" ? "bg-primary text-primary-content" : "hover:bg-base-300"
              }`}
            >
              <Info size={18} />
              <span>Info</span>
            </button>

            <button
              onClick={() => setActiveTab("media")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                activeTab === "media" ? "bg-primary text-primary-content" : "hover:bg-base-300"
              }`}
            >
              <Image size={18} />
              <span className="truncate">Media, links and docs</span>
            </button>

            <button
              onClick={() => setActiveTab("starred")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                activeTab === "starred" ? "bg-primary text-primary-content" : "hover:bg-base-300"
              }`}
            >
              <Star size={18} />
              <span>Starred</span>
            </button>
          </div>
        </aside>

        {/* Right Tab Contents */}
        <main className="w-2/3 flex flex-col h-full bg-base-100 p-6 overflow-hidden relative">
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 btn btn-sm btn-ghost btn-circle"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === "info" && (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="text-center pt-4">
                  <img
                    src={selectedUser.profilePic || "/avatar.png"}
                    alt={selectedUser.fullName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-base-300 mx-auto mb-3 shadow-md"
                  />
                  <h4 className="font-bold text-xl">{selectedUser.fullName}</h4>
                  {selectedUser.phoneNumber && (
                    <p className="text-xs text-zinc-400 mt-0.5">{selectedUser.phoneNumber}</p>
                  )}
                  <p className="text-xs text-zinc-500 italic mt-1 px-4 truncate max-w-xs mx-auto">
                    {selectedUser.about || "Hey there! I am using ChatApp."}
                  </p>
                </div>

                {/* Grid Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => onStartCall("audio")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <Phone size={18} className="text-primary" />
                    <span>Audio</span>
                  </button>
                  <button 
                    onClick={() => onStartCall("video")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <Video size={18} className="text-primary" />
                    <span>Video</span>
                  </button>
                  <button 
                    onClick={() => {
                      onStartSearch();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <Search size={18} className="text-primary" />
                    <span>Search</span>
                  </button>
                </div>

                {/* Advanced Configuration Options */}
                <div className="space-y-2 border-t border-base-300 pt-4">
                  {/* Mute toggle */}
                  <div className="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <VolumeX size={18} className="text-zinc-500" />
                      <span className="font-medium text-sm">Mute notifications</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="toggle toggle-primary toggle-sm"
                      checked={!!chatSettings.isMutedByMe}
                      onChange={() => toggleMuteUser(selectedUser._id)}
                    />
                  </div>

                  {/* Disappearing messages */}
                  <div className="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock size={18} className="text-zinc-500" />
                      <span className="font-medium text-sm">Disappearing messages</span>
                    </div>
                    <select
                      className="select select-bordered select-xs rounded-lg font-medium"
                      value={chatSettings.myDisappearing || "off"}
                      onChange={(e) => setDisappearingSetting(selectedUser._id, e.target.value)}
                    >
                      <option value="off">Off</option>
                      <option value="24h">24 Hours</option>
                      <option value="7d">7 Days</option>
                    </select>
                  </div>

                  {/* Clear chat */}
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center gap-3 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-left transition-colors font-medium text-sm text-zinc-600"
                  >
                    <Trash2 size={18} className="text-red-500" />
                    <span>Clear chat history</span>
                  </button>

                  {/* Block contact toggle */}
                  <button
                    onClick={() => toggleBlockUser(selectedUser._id)}
                    className={`w-full flex items-center gap-3 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-left transition-colors font-medium text-sm ${
                      chatSettings.isBlockedByMe ? "text-red-500" : "text-zinc-600"
                    }`}
                  >
                    <Slash size={18} className="text-red-500" />
                    <span>{chatSettings.isBlockedByMe ? "Unblock contact" : "Block contact"}</span>
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button onClick={onClose} className="btn btn-primary btn-sm px-6 rounded-lg">Done</button>
                </div>
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-lg mb-3">Shared Media ({mediaMessages.length})</h4>
                {mediaMessages.length === 0 ? (
                  <div className="text-center text-zinc-500 py-12 text-sm">
                    No media files shared in this chat yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {mediaMessages.map((m) => (
                      <div key={m._id} className="relative aspect-square rounded-xl overflow-hidden border border-base-300 shadow-sm hover:scale-102 transition-transform cursor-pointer">
                        <img
                          src={m.image}
                          alt="shared attachment"
                          className="w-full h-full object-cover"
                          onClick={() => window.open(m.image, "_blank")}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "starred" && (
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-lg mb-3">Starred Messages ({starredMessages.length})</h4>
                {starredMessages.length === 0 ? (
                  <div className="text-center text-zinc-500 py-12 text-sm">
                    No starred messages in this chat.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {starredMessages.map((m) => (
                      <div 
                        key={m._id} 
                        className={`p-3 rounded-xl border border-base-300 bg-base-200/30 flex flex-col text-sm max-w-full`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-primary">
                            {m.senderId === selectedUser._id ? selectedUser.fullName : "You"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {m.image && (
                          <img 
                            src={m.image} 
                            alt="starred media" 
                            className="max-h-24 rounded-lg object-contain bg-black mb-2 self-start"
                          />
                        )}
                        {m.text && <p className="text-base-content leading-relaxed">{m.text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContactInfoModal;
