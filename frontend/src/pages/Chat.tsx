import { useChat } from '../hooks/useChat';
import VideoCall from '../components/VideoCall';
import { MainChat } from '../components/MainChat';
import { useEffect } from 'react';

const Chat = () => {
    const {
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

    // Pull down securely mapped identity fields from local memory pools
    const currentUsername = localStorage.getItem('username') || 'AnonymousUser';
    const currentUserId = Number(localStorage.getItem('userId')) || 1;

    // CUSTOM EVENT LISTENER: Bridges header clicks smoothly to WebRTC hook loops
    useEffect(() => {
        const handleTriggerCall = (e: Event) => {
            const customEvent = e as CustomEvent;
            startCall(customEvent.detail.target);
        };

        window.addEventListener('initiate-call', handleTriggerCall);
        return () => window.removeEventListener('initiate-call', handleTriggerCall);
    }, [startCall]);

    return (
        <div className="relative h-screen w-screen bg-[var(--theme-bg)] text-white overflow-hidden">
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

            {/* Renders pristine full-width layout panels directly */}
            <div className="h-full w-full flex flex-col">
                <MainChat username={currentUsername} userId={currentUserId} />
            </div>
        </div>
    );
};

export default Chat;