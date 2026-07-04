import React from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';

interface VideoCallProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    endCall: () => void;
    onToggleScreenShare: () => void;
    isMuted: boolean,
    isVideoOff: boolean,
    isScreenSharing: boolean,
    toggleMic: () => void,
    toggleVideo: () => void
}

const VideoCall: React.FC<VideoCallProps> = ({
    localStream,
    remoteStream,
    endCall,
    onToggleScreenShare,
    isMuted,
    isVideoOff,
    isScreenSharing,
    toggleMic,
    toggleVideo
}) => {
    const localVideoRef = React.useRef<HTMLVideoElement>(null);
    const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    // React.useEffect(() => {
    //     if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    // }, [remoteStream]);

    React.useEffect(() => {
        const playRemote = async () => {
            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
                try {
                    // Force play to overcome Safari/Chrome autoplay restrictions
                    await remoteVideoRef.current.play();
                    console.log("[APP-TELEMETRY] ▶️ Remote stream playing");
                } catch (err) {
                    console.warn("⚠️ Autoplay blocked, waiting for interaction:", err);
                }
            }
        };
        playRemote();
    }, [remoteStream]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {/* Remote Video */}
                <div className="relative bg-discord-dark rounded-xl overflow-hidden flex items-center justify-center">
                    <video ref={remoteVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
                    {!remoteStream && <div className="absolute text-discord-gray">Waiting for peer...</div>}
                    <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm">Remote User</div>
                </div>

                {/* Local Video */}
                <div className="relative bg-discord-dark rounded-xl overflow-hidden flex items-center justify-center">
                    <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-sm">You (Local)</div>
                </div>
            </div>

            {/* Call Controls */}
            <div className="h-24 bg-discord-black flex items-center justify-center space-x-6">
                <button onClick={toggleMic} className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                    {isMuted ? <MicOff size={24} className="text-red-500" /> : <Mic size={24} />}
                </button>

                <button onClick={endCall} className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition text-white">
                    <PhoneOff size={24} />
                </button>
                <button onClick={onToggleScreenShare} className={`p-4 rounded-full transition ${isScreenSharing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <Monitor size={24} />
                </button>
                <button onClick={toggleVideo} className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                    {isVideoOff ? <VideoOff size={24} className="text-red-500" /> : <Video size={24} />}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
