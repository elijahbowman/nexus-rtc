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

    // Identity from localStorage. KNOWN ISSUE (S2): silently falls back to user id 1 if userId is missing.
    // KNOWN ISSUE (S10): there is no route guard, so /chat renders without a token.
    const currentUsername = localStorage.getItem('username') || 'AnonymousUser';
    const currentUserId = Number(localStorage.getItem('userId')) || 1;

    // The header's call button dispatches 'initiate-call'; start the call here.
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

            <div className="h-full w-full flex flex-col">
                <MainChat username={currentUsername} userId={currentUserId} />
            </div>
        </div>
    );
};

export default Chat;