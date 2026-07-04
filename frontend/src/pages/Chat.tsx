import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { Hash, Mic, Video, Settings, PlusCircle, LogOut } from 'lucide-react';
import VideoCall from '../components/VideoCall';

const Chat = () => {
    const [input, setInput] = useState('');
    const {
        messages,
        sendMessage,
        startCall,
        endCall,
        localStream,
        remoteStream,
        isCalling,
        toggleScreenShare,
        isMuted,
        isVideoOff,
        isScreenSharing,
        toggleMic,
        toggleVideo
    } = useChat();

    const handleSend = (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen bg-discord-dark overflow-hidden">
            {/* Add the Conditional Video Overlay */}
            {isCalling && (
                <VideoCall
                    localStream={localStream}
                    remoteStream={remoteStream}
                    endCall={endCall}
                    onToggleScreenShare={toggleScreenShare}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={isScreenSharing}
                    toggleMic={toggleMic}
                    toggleVideo={toggleVideo}
                />
            )}

            {/* Sidebar - Channels */}
            <div className="w-64 bg-discord-black flex flex-col">
                <div className="p-4 shadow-md font-bold border-b border-black">
                    Discord Clone
                    <Video
                        className="cursor-pointer text-gray-400 hover:text-white"
                        size={20}
                        onClick={() => startCall("target-user")}
                    />
                </div>
                <div className="flex-1 p-2 space-y-1">
                    <div className="flex items-center p-2 rounded bg-gray-700 text-white cursor-pointer">
                        <Hash size={20} className="mr-2 text-gray-400" /> general
                    </div>
                </div>
                {/* User Status Area */}
                <div className="bg-[#232428] p-2 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-discord-blue mr-2" />
                        <div className="text-xs font-bold truncate w-20">You</div>
                    </div>
                    <div className="flex space-x-2 text-gray-400">
                        <Mic size={16} className="cursor-pointer hover:text-white" />
                        <Video size={16} className="cursor-pointer hover:text-white" onClick={() => startCall("target")} />
                        <Settings size={16} className="cursor-pointer hover:text-white" />
                        <LogOut size={16} className="cursor-pointer hover:text-red-500" onClick={handleLogout} />
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 shadow-sm border-b border-black flex items-center font-bold">
                    <Hash size={20} className="mr-2 text-gray-400" /> general
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className="group flex items-start hover:bg-[#2e3035] -mx-4 px-4 py-1">
                            <div className="w-10 h-10 rounded-full bg-gray-600 mt-1 mr-4 shrink-0" />
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold text-sm hover:underline cursor-pointer">{msg.sender}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-tight">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSend} className="p-4">
                    <div className="bg-[#383a40] rounded-lg flex items-center p-2">
                        <PlusCircle className="text-gray-400 mx-2 cursor-pointer hover:text-white" />
                        <input
                            name="message"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message #general"
                            className="bg-transparent w-full focus:outline-none text-sm p-1"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Chat;

