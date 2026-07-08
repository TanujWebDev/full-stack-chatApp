import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

import Sidebar from './../components/Sidebar'
import NoChatSelected from './../components/NoChatSelected'
import ChatContainer from './../components/ChatContainer'

const HomePage = () => {
  const { selectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { socket } = useAuthStore();

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            {/* Sidebar Column Wrapper */}
            <div className={`h-full ${selectedUser ? "hidden md:block" : "w-full md:w-auto"}`}>
              <Sidebar />
            </div>

            {/* Chat Column Wrapper */}
            <div className={`h-full flex-1 ${!selectedUser ? "hidden md:flex" : "flex"}`}>
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage

