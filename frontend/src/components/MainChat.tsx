import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { Sidebar } from './Sidebar';
import { useChannels } from '../hooks/useChannels';
import { type Channel, channelService, type ChatMessagePayload } from '../services/channelService'; // Clean, unified imports
import api from '../api/axios';

interface MainChatProps {
  username: string;
  userId: number; // Synchronized user identity primary key
}

export const MainChat: React.FC<MainChatProps> = ({ username, userId }) => {
  // 1. STATE CONFIGURATION: Uses the single, global schema definition natively
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hooking our automated multi-channel controllers
  const {
    channels,
    userChannels,
    activeChannel,
    setActiveChannel,
    createNewChannel,
    joinTargetChannel,
    removeChannel
  } = useChannels(userId);

  const stompClientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll message board smoothly on new arrivals
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. REAL-TIME ROUTING TUNNEL: Reboots WebSocket subscriptions on channel switching
  useEffect(() => {
    if (!activeChannel) return;

    let isMounted = true;
    setMessages([]); // Reset message board view state when navigating into a new room space

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    const token = localStorage.getItem('token');
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      debug: (str) => {
        // Only log protocol noise if running in local developer mode
        if (import.meta.env.NODE_ENV === 'development') {
          console.log(`[STOMP-PROTOCOL] ${str}`);
        }
      },
    });

    // Step A: Execute asynchronous historical extraction out of PostgreSQL
    const loadRoomHistoryAndConnect = async () => {
      try {
        console.log(`Extracting chat logs for channel ID: ${activeChannel.id}`);
        const historyData: ChatMessagePayload[] = await channelService.getChannelHistory(activeChannel.id, userId);

        if (isMounted) {
          // ✅ Optimized: Direct assignment with zero mapping conversion runtime overhead!
          setMessages(historyData);
        }
      } catch (err) {
        console.error('Failed to pre-load channel messaging history arrays:', err);
      }

      // Step B: Once records populate your UI view state, open the live network bridge tunnel
      if (!isMounted) return;

      client.onConnect = () => {
        if (!isMounted) {
          client.deactivate();
          return;
        }
        setConnected(true);
        console.log(`STOMP node synchronized securely. Subscribing to channel path: ${activeChannel.id}`);

        // Subscribe to the channel-isolated message pipeline we built in the ChatController
        client.subscribe(`/topic/channels/${activeChannel.id}`, (frame) => {
          const payload: ChatMessagePayload = JSON.parse(frame.body);
          if (isMounted) {
            setMessages((prev) => [...prev, payload]);
          }
        });

        // Signal arrival context frame into the channel space network loop
        client.publish({
          destination: `/app/chat.addUser/${activeChannel.id}`,
          body: JSON.stringify({
            channelId: activeChannel.id,
            sender: username,
            content: '',
            type: 'JOIN',
          }),
        });
      };

      client.onDisconnect = () => {
        if (isMounted) setConnected(false);
      };

      client.activate();
      stompClientRef.current = client;
    };

    // Trigger the unified loading pipeline execution loop
    loadRoomHistoryAndConnect();

    // Clean up hook: Tears down active tunnel subscriptions before mapping user into next room selection
    return () => {
      isMounted = false;
      if (client.active) {
        client.deactivate();
      }
    };
  }, [activeChannel, username, userId]);

  // 3. SUBMIT CHAT FRAME OPERATION
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !stompClientRef.current?.connected || !activeChannel) return;

    const chatFrame: ChatMessagePayload = {
      channelId: activeChannel.id,
      sender: username,
      content: typedMessage.trim(),
      type: 'CHAT',
    };

    stompClientRef.current.publish({
      destination: `/app/chat.sendMessage/${activeChannel.id}`,
      body: JSON.stringify(chatFrame),
    });

    setTypedMessage('');
  };

  // 🚀 ASYNCHRONOUS MULTIPART FILE UPLOAD ENGINE (REST -> WEBSOCKET ATTACHMENT)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeChannel || !stompClientRef.current?.connected) return;
    
    const targetFile = files[0];
    const formData = new FormData();
    formData.append('file', targetFile);

    try {
      setUploading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

      // 1. Fire the file over a standard HTTP REST Multipart POST request directly into AttachmentController
      const response = await api.post(`${API_URL}/api/attachments/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const { attachmentPath, attachmentType } = response.data;

      // 2. Wrap the resulting S3 unique keys inside an instant STOMP message frame notice payload
      const chatFrame: ChatMessagePayload = {
        channelId: activeChannel.id,
        sender: username,
        content: `Sent an attachment: ${targetFile.name}`,
        type: 'CHAT',
        attachmentPath: attachmentPath,
        attachmentType: attachmentType
      };

      // 3. Broadcast the completion notice out across your channel WebSocket broker
      stompClientRef.current.publish({
        destination: `/app/chat.sendMessage/${activeChannel.id}`,
        body: JSON.stringify(chatFrame),
      });

    } catch (err) {
      console.error("Multimedia stream ingress failed entirely:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input element track
    }
  };

  // 4. SECURITY INTERCEPTOR: Automatically registers user onto roster if they click an unjoined room
  const handleChannelSelection = async (targetChannel: Channel) => {
    const alreadyMember = userChannels.some((c) => c.id === targetChannel.id);
    if (!alreadyMember) {
      await joinTargetChannel(targetChannel.id);
    }
    setActiveChannel(targetChannel);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Left Column Component: Docked Navigation Sidebar Workspace */}
      <Sidebar
        channels={channels}
        userChannels={userChannels}
        activeChannel={activeChannel}
        onSelectChannel={handleChannelSelection}
        onCreateChannel={createNewChannel}
        currentUsername={username}
        onDeleteChannel={removeChannel}
      />

      {/* Right Column Component: Main Chat Window Layout */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-slate-900 px-6 flex items-center justify-between bg-slate-900/40">

          {/* Left Side: Room Name + Integrated Connection Status Light */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-mono text-xl">#</span>
              <span className="font-bold text-slate-200">{activeChannel?.name || 'loading...'}</span>
            </div>

            <div className="h-4 w-px bg-slate-800"></div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{connected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          {/* Right Side: Unified call/logout control dock. */}
          <div className="bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-xl shadow-2xl flex items-center space-x-4 backdrop-blur-md">
            <button
              onClick={() => {
                // Fires custom window event to bridge call commands directly to useChat hooks inside pages/Chat.tsx
                window.dispatchEvent(new CustomEvent('initiate-call', { detail: { target: 'target-user' } }));
              }}
              className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
              title="Initiate Real-Time Video Call Stream"
            >
              {/* Lucide Video Icon */}
              <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
              <span>Call Host</span>
            </button>

            <div className="h-4 w-px bg-slate-800"></div>

            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-rose-400 font-semibold transition-colors cursor-pointer"
              title="Sign Out of Session"
            >
              {/* Lucide LogOut */}
              <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </button>
          </div>
        </div>


        {/* Scrolling Chat Timeline Log Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20">
          {messages.map((msg, index) => {
            if (msg.type === 'JOIN') {
              return (
                <p key={index} className="text-xs text-emerald-400/80 italic text-center py-1 bg-emerald-500/5 rounded-md border border-emerald-500/10">
                  👋 {msg.sender} synchronized into the channel space.
                </p>
              );
            }
            const isMe = msg.sender === username;
            return (
              <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full max-w-full`}>
                <span className="text-[10px] text-slate-500 font-medium px-1 mb-0.5">{msg.sender}</span>

                {/* Explicit width control blocks horizontal textBox leaks */}
                <div className={`w-auto max-w-[85%] md:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-md break-all flex flex-col space-y-1.5 ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/80'
                  }`}>
                  <span>{msg.content}</span>

                  {/* MULTIMEDIA ATTACHMENT PREVIEW COMPONENT */}
                  {msg.attachmentUrl && (
                    <div className="mt-1 p-1 bg-slate-950/40 rounded-lg border border-slate-800/60 overflow-hidden w-full max-w-full">
                      {msg.attachmentType?.startsWith('image/') ? (
                        <img
                          src={msg.attachmentUrl}
                          alt="Attachment Preview"
                          className="rounded-md max-h-40 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.attachmentUrl, '_blank')}
                        />
                      ) : (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-xs text-indigo-400 hover:text-indigo-300 font-mono p-1 break-all max-w-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
                          <span className="underline truncate flex-1">Download Attachment</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* CHAT INPUT FOOTER WITH INTEGRATED ATTACHMENT CLIP TRAY */}
        <div className="p-4 bg-slate-900/20 border-t border-slate-900 w-full">
          <form onSubmit={handleSendMessage} className="w-full flex space-x-2 items-center">
            
            {/* Hidden native input lane */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,application/pdf,text/plain"
            />

            {/* Paperclip upload trigger button */}
            <button
              type="button"
              disabled={!connected || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[44px] h-[44px]"
              title="Attach File Attachment (Images, PDFs)"
            >
              {uploading ? (
                <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              )}
            </button>

            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder={uploading ? "Processing asset allocation..." : `Message #${activeChannel?.name || ''}`}
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
              disabled={!connected || uploading}
            />
            
            <button
              type="submit"
              disabled={!connected || !typedMessage.trim() || uploading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all cursor-pointer whitespace-nowrap font-medium h-[44px]"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
