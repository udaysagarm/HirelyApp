// src/pages/Messages.jsx
import { useState, useEffect, useRef } from "react";
import { Phone, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";
import { Link, useLocation } from "react-router-dom";

const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function Messages() {
  const { currentUser, token, isLoggedIn } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const messagesEndRef = useRef(null);
  const location = useLocation();

  // --- FEATURE UNDER DEVELOPMENT FLAG ---
  const isUnderDevelopment = true; // Set to TRUE to show "Under Development" message
                                  // Change to false when ready to enable full messaging
  // ------------------------------------

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [apiError, setApiError] = useState("");

  // --- Helper to scroll to bottom of messages ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Function to find and set active chat from participantId in URL ---
  const findAndSetActiveChat = (participantId, convs) => {
    const targetConv = convs.find(conv => conv.participant_id === Number(participantId));
    if (targetConv) {
        setActiveChat(targetConv);
    } else {
        const fetchNewParticipant = async () => {
            try {
                showLoading("Finding user to chat with...");
                const response = await fetch(`/api/users/id/${participantId}`); // Fetch user by ID
                const userData = await response.json();
                if (response.ok) {
                    setActiveChat({
                        participant_id: userData.id,
                        participant_name: userData.name,
                        participant_avatar: userData.avatar_url,
                        last_message_content: "New chat initiated.", // Placeholder
                        last_message_sent_at: new Date().toISOString(),
                        unread_count: 0
                    });
                    setConversations(prev => [...prev, {
                        participant_id: userData.id,
                        participant_name: userData.name,
                        participant_avatar: userData.avatar_url,
                        last_message_content: "New chat initiated.",
                        last_message_sent_at: new Date().toISOString(),
                        unread_count: 0
                    }]);
                } else {
                    setApiError(userData.message || "Failed to find user for new chat.");
                }
            } catch (err) {
                setApiError("Network error finding user for chat.");
            } finally {
                hideLoading();
            }
        };
        fetchNewParticipant();
    }
  };


  // --- Effect to fetch conversations list (will only run if NOT under development) ---
  useEffect(() => {
    if (isUnderDevelopment) {
      setConversations([]);
      setApiError("Messaging feature is currently under development.");
      hideLoading();
      return;
    }
    
    if (!isLoggedIn || !token || !currentUser) {
        setConversations([]);
        return;
    }

    const fetchConversations = async () => {
      setApiError("");
      showLoading("Loading conversations...");
      try {
        const response = await fetch('/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();

        if (response.ok) {
          setConversations(data);
          const queryParams = new URLSearchParams(location.search);
          const participantIdFromUrl = queryParams.get('participantId');
          if (participantIdFromUrl && !activeChat) {
              findAndSetActiveChat(participantIdFromUrl, data);
          }
        } else {
          setApiError(data.message || "Failed to load conversations.");
        }
      } catch (error) {
        console.error("Network error fetching conversations:", error);
        setApiError("Network error. Could not load conversations.");
      } finally {
        hideLoading();
      }
    };

    fetchConversations();
    const pollInterval = setInterval(fetchConversations, 15000);
    return () => clearInterval(pollInterval);
  }, [isUnderDevelopment, isLoggedIn, token, currentUser, showLoading, hideLoading, location.search, activeChat]);

  // --- Effect to fetch active chat messages (will only run if NOT under development) ---
  useEffect(() => {
    if (isUnderDevelopment) {
      setMessages([]);
      return;
    }

    if (activeChat?.participant_id && isLoggedIn && token && currentUser) {
      const fetchChatHistory = async () => {
        setApiError("");
        showLoading(`Loading chat with ${activeChat.participant_name}...`);
        try {
          const response = await fetch(`/api/messages/conversation/user/${activeChat.participant_id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();

          if (response.ok) {
            setMessages(data);
            scrollToBottom();
          } else {
            setApiError(data.message || "Failed to load chat history.");
          }
        } catch (error) {
          console.error("Network error fetching chat history:", error);
          setApiError("Network error. Could not load chat history.");
        } finally {
          hideLoading();
        }
      };
      fetchChatHistory();
      const pollInterval = setInterval(fetchChatHistory, 5000);
      return () => clearInterval(pollInterval);
    } else {
      setMessages([]);
    }
  }, [isUnderDevelopment, activeChat, token, isLoggedIn, currentUser, showLoading, hideLoading]);

  // --- Effect for scrolling to bottom on new message ---
  useEffect(() => {
    if (!isUnderDevelopment) {
      scrollToBottom();
    }
  }, [messages, isUnderDevelopment]);


  const handleSend = async () => {
    if (isUnderDevelopment) {
      setApiError("Messaging is under development. Cannot send messages.");
      return;
    }

    if (!messageInput.trim() || !activeChat) return;

    setApiError("");
    showLoading("Sending message...");
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: activeChat.participant_id,
          content: messageInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          sender_id: currentUser.id,
          receiver_id: activeChat.participant_id,
          content: messageInput,
          sent_at: new Date().toISOString(),
          is_read: false,
        }]);
        setMessageInput("");
      } else {
        setApiError(data.message || "Failed to send message.");
      }
    } catch (error) {
      console.error("Network error sending message:", error);
      setApiError("Network error. Could not send message.");
    } finally {
      hideLoading();
    }
  };

  // Conditional rendering based on login and development status
  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view your messages.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  // --- Render "Under Development" message if the flag is true ---
  if (isUnderDevelopment) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400 mb-4">
            Messages Feature
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
            <span role="img" aria-label="Under Construction">🚧</span> This feature is currently under development.
          </p>
          <p className="text-md text-gray-600 dark:text-gray-400">
            We're working hard to bring you a seamless messaging experience!
          </p>
          {apiError && (
              <p className="text-red-500 text-sm mt-4">{apiError}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Original Messages UI (will render if isUnderDevelopment is false) ---
  return (
    <div className="pt-20 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Messages</h2>

        {apiError && <p className="text-red-500 text-sm mb-4 text-center">{apiError}</p>}

        {!activeChat ? (
          <div className="space-y-4">
            {conversations.length === 0 && !apiError ? (
                <p className="text-gray-500 dark:text-gray-400 text-center">No conversations yet.</p>
            ) : (
                conversations.map((conv) => (
                <div
                    key={conv.participant_id}
                    onClick={() => setActiveChat(conv)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow cursor-pointer hover:shadow-md transition dark:border dark:border-gray-700"
                >
                    <div className="flex items-center gap-4">
                    <img src={conv.participant_avatar || DEFAULT_AVATAR_URL} className="w-12 h-12 rounded-full object-cover" alt="avatar" />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{conv.participant_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message_content}</p>
                        {conv.unread_count > 0 && (
                            <span className="text-xs bg-blue-500 text-white rounded-full px-2 py-0.5 ml-2">
                                {conv.unread_count} New
                            </span>
                        )}
                    </div>
                    </div>
                </div>
                ))
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col h-[70vh] text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveChat(null)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Back
              </button>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{activeChat.participant_name}</h3>
              <Phone className="text-blue-600 dark:text-blue-400 w-5 h-5" />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto mb-4 p-2 custom-scrollbar" ref={messagesEndRef}>
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`p-2 px-4 rounded-xl max-w-xs ${
                    msg.sender_id === currentUser.id
                      ? "bg-blue-100 text-blue-800 self-end ml-auto dark:bg-blue-900 dark:text-blue-200"
                      : "bg-gray-100 text-gray-800 self-start dark:bg-gray-700 dark:text-gray-100"
                  }`}
                >
                  {msg.content}
                  <span className="block text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                className="flex-1 p-2 px-4 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-ring-blue-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-300"
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}