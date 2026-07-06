import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Video, Volume2, VolumeX } from "lucide-react";

const CallingOverlay = ({ isOpen, type, contact, onClose }) => {
  const [callStatus, setCallStatus] = useState("Calling...");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Simulate connection status change
    const statusTimer = setTimeout(() => {
      setCallStatus("Ringing...");
    }, 2000);

    const connectTimer = setTimeout(() => {
      setCallStatus("Connected");
    }, 5000);

    return () => {
      clearTimeout(statusTimer);
      clearTimeout(connectTimer);
      setCallStatus("Calling...");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-zinc-950/95 text-white p-12 transition-all duration-300">
      {/* Top Section */}
      <div className="text-center mt-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Pulsing rings for calling indicator */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <img
              src={contact.profilePic || "/avatar.png"}
              alt={contact.fullName}
              className="w-32 h-32 rounded-full object-cover border-4 border-zinc-700 relative z-10"
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">{contact.fullName}</h2>
        <p className="text-zinc-400 font-medium tracking-wide animate-pulse">
          {callStatus}
        </p>
      </div>

      {/* Center Video Simulation if type is video */}
      {type === "video" && callStatus === "Connected" && (
        <div className="w-full max-w-md h-64 bg-zinc-800 rounded-lg overflow-hidden relative border border-zinc-700 shadow-2xl flex items-center justify-center my-4 animate-fade-in">
          <img
            src={contact.profilePic || "/avatar.png"}
            alt="video feed"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 w-24 h-32 bg-zinc-900 border border-zinc-600 rounded-md overflow-hidden shadow-md flex items-center justify-center text-xs text-zinc-400">
            Your Video
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs mb-8">
        <div className="flex items-center justify-around w-full">
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all cursor-pointer ${
              isMuted ? "bg-zinc-700 text-red-400" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>

          {/* Decline / Hang-up button */}
          <button
            onClick={onClose}
            className="p-5 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg cursor-pointer transition-all hover:scale-105"
          >
            <PhoneOff size={28} />
          </button>

          {/* Extra calling feature placeholder */}
          <div className="p-4 rounded-full bg-zinc-800 text-zinc-300">
            {type === "video" ? <Video size={24} /> : <Phone size={24} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallingOverlay;
