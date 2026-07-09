import React from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';

interface VideoCallProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    endCall: () => void;
    onToggleScreenShare: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    toggleMic: () => void;
    toggleVideo: () => void;
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
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl animate-fade-in font-sans">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                
                {/* Remote Video Box */}
                <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
                    <video ref={remoteVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
                    {!remoteStream && <div className="absolute text-slate-500 font-medium">Waiting for peer...</div>}
                    <div className="absolute bottom-4 left-4 bg-slate-950/70 border border-slate-800 text-xs px-3 py-1.5 rounded-lg font-semibold tracking-wide text-slate-200 backdrop-blur-sm">Remote User</div>
                </div>

                {/* Local Video Box */}
                <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        // Do not flip the display (remove scale-x-[-1]) when sharing screen 
                        // so text, code lines, and terminals read naturally from left to right on own mirror!
                        className={`w-full h-full object-cover ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`} 
                    />
                    <div className="absolute bottom-4 left-4 bg-slate-950/70 border border-slate-800 text-xs px-3 py-1.5 rounded-lg font-semibold tracking-wide text-indigo-400 backdrop-blur-sm">
                        You (Local) {isScreenSharing && '💻 (Sharing Screen)'}
                    </div>
                    
                    {/* Only render the dark mask block if camera is off AND screenshare is inactive! */}
                    {isVideoOff && !isScreenSharing && (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-2">
                            <VideoOff size={32} className="text-slate-600" />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Camera turned off</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Call Controls HUD Panel */}
            <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-center space-x-6 bg-gradient-to-t from-slate-950/50 to-slate-900/10">
                <button onClick={toggleMic} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition cursor-pointer active:scale-95 shadow-lg">
                    {isMuted ? <MicOff size={24} className="text-rose-500" /> : <Mic size={24} className="text-slate-200" />}
                </button>

                <button onClick={endCall} className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer active:scale-95 shadow-xl shadow-rose-600/10">
                    <PhoneOff size={24} />
                </button>
                
                <button onClick={onToggleScreenShare} className={`p-4 rounded-full border transition cursor-pointer active:scale-95 shadow-lg ${isScreenSharing ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/20' : 'bg-slate-800 border-slate-700/60 text-slate-200'}`}>
                    <Monitor size={24} />
                </button>
                
                <button onClick={toggleVideo} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition cursor-pointer active:scale-95 shadow-lg">
                    {isVideoOff ? <VideoOff size={24} className="text-rose-500" /> : <Video size={24} className="text-slate-200" />}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
