import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, MessageSquare, X, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    getGroups, 
    groups, 
    createGroup, 
    selectedUser, 
    setSelectedUser, 
    isUserLoading,
    searchDirectory,
    searchUsersInDirectory
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "groups"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchContact, setSearchContact] = useState("");
  
  // Create Group Modal State
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  useEffect(() => {
    if (activeTab === "chats") {
      searchUsersInDirectory(searchContact);
    }
  }, [searchContact, activeTab, searchUsersInDirectory]);

  const handleMemberToggle = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    
    const newGroup = await createGroup({
      name: groupName,
      description: groupDesc,
      members: selectedMembers
    });

    if (newGroup) {
      setIsModalOpen(false);
      setGroupName("");
      setGroupDesc("");
      setSelectedMembers([]);
    }
  };

  if (isUserLoading) return <SidebarSkeleton />;

  // Decide which contact list to render (active inbox or search directory)
  const isSearchingDirectory = searchContact.trim() !== "";
  const displayContacts = isSearchingDirectory ? searchDirectory : users;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100 relative">
      {/* Sidebar Header */}
      <div className="border-b border-base-300 w-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-6 text-primary" />
          <span className="font-bold text-md hidden lg:block">Chats</span>
        </div>
        {activeTab === "groups" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-circle btn-primary btn-xs hover:scale-105 transition-transform"
            title="Create new group"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Sidebar Tabs */}
      <div className="flex border-b border-base-300 p-2 gap-1 justify-center lg:justify-start">
        <button
          onClick={() => {
            setActiveTab("chats");
            setSearchContact("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "chats" 
              ? "bg-primary text-primary-content shadow-md" 
              : "hover:bg-base-200 text-zinc-500"
          }`}
        >
          <span className="hidden lg:inline">Contacts</span>
          <Users size={16} className="inline lg:hidden mx-auto" />
        </button>
        <button
          onClick={() => {
            setActiveTab("groups");
            setSearchContact("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "groups" 
              ? "bg-primary text-primary-content shadow-md" 
              : "hover:bg-base-200 text-zinc-500"
          }`}
        >
          <span className="hidden lg:inline">Groups ({groups.length})</span>
          <Plus size={16} className="inline lg:hidden mx-auto" />
        </button>
      </div>

      {/* Directory Search Box (WhatsApp style search/discover contact trigger) */}
      {activeTab === "chats" && (
        <div className="p-3 border-b border-base-300 hidden lg:block relative animate-fade-in">
          <div className="relative flex items-center bg-base-200 rounded-lg px-2.5 py-1.5 border border-base-300">
            <Search size={14} className="text-zinc-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search or start new chat..."
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              className="bg-transparent text-xs w-full outline-none pr-5 text-base-content"
            />
            {searchContact && (
              <button 
                onClick={() => setSearchContact("")}
                className="absolute right-2 text-zinc-500 hover:text-base-content"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="overflow-y-auto w-full py-2 flex-1">
        {activeTab === "chats" ? (
          /* Contacts List (Active History / Directory) */
          <>
            {isSearchingDirectory && (
              <div className="px-4 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Directory Matches ({displayContacts.length})
              </div>
            )}
            {displayContacts.map((user) => (
              <button
                key={user._id}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchContact(""); // Reset search after select
                }}
                className={`
                  w-full p-3 flex items-center gap-3
                  cursor-pointer
                  hover:bg-base-200 transition-all
                  ${selectedUser && !selectedUser.isGroup && selectedUser._id === user._id ? "bg-base-200 ring-1 ring-base-200 font-semibold" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-12 rounded-full object-cover border"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-base-100" />
                  )}
                  {user.unreadCount > 0 && !isSearchingDirectory && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-base-100 animate-pulse">
                      {user.unreadCount}
                    </span>
                  )}
                </div>

                <div className="hidden lg:flex flex-1 items-center justify-between min-w-0">
                  <div className="text-left min-w-0">
                    <div className="font-medium truncate text-sm">{user.fullName}</div>
                    <div className="text-xs text-zinc-400">
                      {user.about ? (
                        <span className="truncate block max-w-[150px]">{user.about}</span>
                      ) : onlineUsers.includes(user._id) ? (
                        "Online"
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                  {user.unreadCount > 0 && !isSearchingDirectory && (
                    <span className="bg-primary text-primary-content text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {user.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {/* Empty States */}
            {!isSearchingDirectory && users.length === 0 && (
              <div className="text-center text-zinc-500 py-12 px-5 text-xs space-y-2">
                <p className="font-bold text-zinc-400">No active chats yet</p>
                <p className="text-[10px] text-zinc-500 font-normal leading-relaxed">
                  Type in the search bar above to search by name/email and start chatting!
                </p>
              </div>
            )}
            {isSearchingDirectory && displayContacts.length === 0 && (
              <div className="text-center text-zinc-500 py-12 px-5 text-xs">
                No users match "{searchContact}"
              </div>
            )}
          </>
        ) : (
          /* Groups List */
          groups.map((group) => (
            <button
              key={group._id}
              onClick={() => setSelectedUser({ ...group, isGroup: true })}
              className={`
                w-full p-3 flex items-center gap-3
                cursor-pointer
                hover:bg-base-200 transition-all
                ${selectedUser && selectedUser.isGroup && selectedUser._id === group._id ? "bg-base-200 ring-1 ring-base-200 font-semibold" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 font-bold text-lg">
                  {group.name.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="hidden lg:flex flex-1 flex-col items-start min-w-0">
                <div className="font-medium truncate w-full text-left">{group.name}</div>
                <div className="text-xs text-zinc-400 truncate w-full text-left">
                  {group.members?.length || 0} members
                </div>
              </div>
            </button>
          ))
        )}

        {activeTab === "groups" && groups.length === 0 && (
          <div className="text-center text-zinc-500 py-12 px-5 text-xs leading-relaxed">
            No groups found. Click the "+" button in the top right header to create one!
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-base-content">
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 btn btn-ghost btn-circle btn-sm"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Users className="text-primary" /> Create New Group
            </h3>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div className="form-control w-full">
                <label className="label text-xs font-bold text-zinc-500">Group Name</label>
                <input
                  type="text"
                  placeholder="Developers Group"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input input-bordered input-sm w-full"
                  required
                />
              </div>

              <div className="form-control w-full">
                <label className="label text-xs font-bold text-zinc-500">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="A group for discussing project milestones"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
              </div>

              {/* Members Selection Checklist */}
              <div className="form-control w-full">
                <label className="label text-xs font-bold text-zinc-500">Select Group Members</label>
                <div className="border border-base-300 rounded-lg max-h-40 overflow-y-auto p-2 space-y-1.5 bg-base-200/55">
                  {users.map((u) => (
                    <label key={u._id} className="flex items-center gap-3 p-1.5 hover:bg-base-200 rounded-lg cursor-pointer transition-colors text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u._id)}
                        onChange={() => handleMemberToggle(u._id)}
                        className="checkbox checkbox-primary checkbox-xs"
                      />
                      <img src={u.profilePic || "/avatar.png"} alt={u.fullName} className="size-6 rounded-full object-cover border" />
                      <span>{u.fullName}</span>
                    </label>
                  ))}
                  {users.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">No contacts available to add</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex-1"
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
