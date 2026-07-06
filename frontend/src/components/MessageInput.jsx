import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Send, X, Image, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

const MessageInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    // Voice Notes State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const durationIntervalRef = useRef(null);

    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const { sendMessage, selectedUser } = useChatStore();

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, []);

    const handleTextChange = (e) => {
        setText(e.target.value);

        const socket = useAuthStore.getState().socket;
        if (!socket || !selectedUser || selectedUser.isGroup) return;

        if (!isTyping) {
            setIsTyping(true);
            socket.emit("typing", { receiverId: selectedUser._id });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit("stopTyping", { receiverId: selectedUser._id });
        }, 1500);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(!file.type.startsWith("image/")){
            toast.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onloadend =() => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    }

    const removeImage = () => {
        setImagePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }

    // Voice Notes Actions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                
                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    
                    setIsSending(true);
                    try {
                        await sendMessage({
                            audio: base64Audio
                        });
                    } catch (err) {
                        toast.error("Failed to send voice note");
                    } finally {
                        setIsSending(false);
                    }
                };

                // Stop all tracks to release microphone
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Microphone access denied:", error);
            toast.error("Please enable microphone permissions to record a voice note.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(durationIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // Remove the onstop hook before stopping to avoid sending the audio
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            
            // Stop tracks
            const stream = mediaRecorderRef.current.stream;
            stream.getTracks().forEach((track) => track.stop());

            setIsRecording(false);
            clearInterval(durationIntervalRef.current);
            setRecordingDuration(0);
            toast.success("Recording discarded");
        }
    };

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const handleSendMessage = async(e) => {
        e.preventDefault();
        if(!text.trim() && !imagePreview) return;
        if(isSending) return; // Prevent double send

        setIsSending(true);

        // Stop typing indicator on send
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        const socket = useAuthStore.getState().socket;
        if (socket && selectedUser && !selectedUser.isGroup && isTyping) {
            socket.emit("stopTyping", { receiverId: selectedUser._id });
        }
        setIsTyping(false);

        try {
            await sendMessage({
                text: text.trim(),
                image: imagePreview,
            });

            // clear form
            setText("");
            setImagePreview(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    }

   return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center cursor-pointer"
              type="button"
              disabled={isSending}
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 items-center bg-base-200 rounded-lg p-1 border border-base-300">
          
          {/* Recording UI State */}
          {isRecording ? (
            <div className="flex items-center justify-between w-full px-3 py-1 bg-red-500/10 rounded-lg text-red-500 animate-pulse text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>Recording... {formatDuration(recordingDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1 text-zinc-500 hover:text-red-500 cursor-pointer transition-colors"
                  title="Discard recording"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-1 text-red-600 hover:text-red-500 cursor-pointer transition-colors"
                  title="Stop and Send"
                >
                  <Square size={18} />
                </button>
              </div>
            </div>
          ) : (
            /* Regular input UI State */
            <>
              <input
                type="text"
                className="w-full input input-ghost bg-transparent focus:outline-none input-sm sm:input-md border-none focus:ring-0 focus:border-none"
                placeholder="Type a message..."
                value={text}
                onChange={handleTextChange}
                disabled={isSending}
              />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />

              <button
                type="button"
                className={`btn btn-ghost btn-circle btn-sm sm:btn-md
                         ${imagePreview ? "text-emerald-500" : "text-zinc-400 hover:text-primary"}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Image size={20} />
              </button>

              {/* Microphone Trigger */}
              <button
                type="button"
                className="btn btn-ghost btn-circle text-zinc-400 hover:text-primary btn-sm sm:btn-md"
                onClick={startRecording}
                disabled={isSending}
                title="Send voice note"
              >
                <Mic size={20} />
              </button>
            </>
          )}
        </div>

        {/* Regular Send Button (hidden during recording) */}
        {!isRecording && (
          <button
            type="submit"
            className="btn btn-primary btn-circle btn-sm sm:btn-md cursor-pointer shadow-md"
            disabled={(!text.trim() && !imagePreview) || isSending}
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        )}
      </form>
    </div>
  );
}

export default MessageInput;
