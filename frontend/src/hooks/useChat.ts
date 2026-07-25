import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { jwtDecode } from 'jwt-decode';

const getInitialUser = () => {
    const token = localStorage.getItem('token');
    try {
        return token ? (jwtDecode(token) as any).sub : null;
    } catch {
        return null;
    }
};

export const useChat = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const stompClientRef = useRef<Client | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const currentUserRef = useRef<string | null>(getInitialUser());
    const currentUser = currentUserRef.current;
    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);

    const sendMessage = useCallback((content: string) => {
        const stompClient = stompClientRef.current;
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({ content })
            });
        }
    }, [])

    const sendSignalingMessage = useCallback((type: string, data: any, receiver: string) => {
        const stompClient = stompClientRef.current;
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: `/app/call.${type.toLowerCase()}`,
                body: JSON.stringify({ type, data: JSON.stringify(data), receiver })
            });
        }
    }, [])

    const initializeLocalHardwareStream = useCallback(async (): Promise<MediaStream> => {
        // 1. Get local media streams (audio, video)
        console.log("[APP-TELEMETRY] 🎙️ Requested local hardware media access via navigator.mediaDevices.getUserMedia...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // 2. Disable each audio and video track
        // START MUTED: Disable tracks immediately
        stream.getAudioTracks().forEach(track => {
            track.enabled = false
            console.log("[APP-TELEMETRY] ⚠️ Privacy Guard Triggered: Disabling local audio tracks locally (track.enabled = false).");
        });
        stream.getVideoTracks().forEach(track => {
            track.enabled = false
            console.log("[APP-TELEMETRY] ⚠️ Privacy Guard Triggered: Disabling local video tracks locally (track.enabled = false).");
        });

        // 3. Assign stream to local DOM element.
        console.log("[APP-TELEMETRY] 🎬 Local media stream initialized and safely zeroed out at the hardware boundary.");
        setLocalStream(stream);
        localStreamRef.current = stream;

        return stream;
    }, [])

    const startCall = useCallback(async (receiver: string) => {
        setIsCalling(true);

        const stream = await initializeLocalHardwareStream();

        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: import.meta.env.VITE_STUN_SERVER_URL || 'stun:stun.l.google.com:19302'
                },
                {
                    urls: import.meta.env.VITE_TURN_SERVER_URL || 'turn:localhost:3478',
                    username: import.meta.env.VITE_TURN_USERNAME || 'devuser',
                    credential: import.meta.env.VITE_TURN_SECRET || 'devpassword'
                }
            ]
        });

        peerConnectionRef.current = peerConnection;

        // Add tracks to the connections
        // The stream is passed the source of the media for each track to be synced with each other.
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        // Listen for the other person's video
        peerConnection.ontrack = (event) => {
            console.log("[APP-TELEMETRY] 🎥 Remote track received!", event.streams[0]);
            setRemoteStream(event.streams[0]);
            remoteStreamRef.current = event.streams[0];
        };

        // Listen for network candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalingMessage("CANDIDATE", event.candidate, receiver);
            }
        };

        // Create the Offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        sendSignalingMessage("OFFER", offer, receiver);
        // }, [initializeLocalHardwareStream, sendSignalingMessage])
    }, [])

    const stopScreenShare = useCallback(async () => {
        const screenStream = screenStreamRef.current;
        if (screenStream) {
            // 1. Stop screen capture
            console.log("[APP-TELEMETRY] 🧼 Terminating screen capture stream. Restoring camera track context...");
            screenStream.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;

            // 2. Update state engine to signal UI iconography to reset
            setIsScreenSharing(false);

            // 3. Fetch native fallback user media tracks
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = cameraStream.getVideoTracks()[0];

            // 4. CRITICAL STATE GUARD: Enforce the pre-existing privacy boundary context
            // If the video was explicitly off, zero out the track to prevent accidental leaks
            if (isVideoOff) {
                videoTrack.enabled = false;
                console.log("[APP-TELEMETRY] 🔒 Privacy Guard Preserved: Fallback camera track initialized as DISABLED");
            } else {
                videoTrack.enabled = true;
                console.log("[APP-TELEMETRY] 📸 Fallback camera track initialized as ENABLED");
            }

            // 5. Hot-swap the media context over the active WebRTC peer connection mid-flight
            const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }

            // 6. Update the local rendering stream layer with our privacy-aware stream
            setLocalStream(cameraStream);
            localStreamRef.current = cameraStream;
        }
    }, [localStream, isVideoOff])

    const toggleScreenShare = useCallback(async () => {
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection || !localStream) return;

        try {
            const screenStream = screenStreamRef.current;
            if (!screenStream) {
                // 1. Capture Screen
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;

                // 2. Signal to the UI that presentation mode (UI button) is active
                setIsVideoOff(true);
                setIsScreenSharing(true);

                // 3. Replace Track (Senior Flex: replaceTrack is seamless)
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');

                if (sender) {
                    sender.replaceTrack(videoTrack);
                }

                // 4. Handle user stopping share via browser UI
                videoTrack.onended = () => stopScreenShare();

                setLocalStream(prevStream => {
                    if (prevStream) prevStream.getTracks().forEach(track => track.stop());  // Stop camera stream first
                    return screenStream;  // Then update UI to show screen in small box
                });
                localStreamRef.current = screenStream;

            } else {
                stopScreenShare();
            }

        } catch (err) {
            console.error("Screen share failed", err);
        }
    }, [localStream, isVideoOff, isScreenSharing, stopScreenShare])

    const endCall = useCallback(() => {
        console.log("[APP-TELEMETRY] 🧼 Initiating local call teardown and broadcasting HANGUP...");

        // 1. Publish straight to the topic queue, completely bypassing the /app controller mapping prefix
        const stompClient = stompClientRef.current;
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: "/topic/public",
                body: JSON.stringify({
                    type: "HANGUP",
                    sender: currentUser, // Ensure your tracking variable passes the sender name
                    data: { status: "ended" }
                })
            });
        }

        // 2. Clear out the localized networking instance
        const peerConnection = peerConnectionRef.current
        if (peerConnection) {
            peerConnection.close();
            peerConnectionRef.current = null;
        }

        // 3. Clear out media tracking pointers to turn off webcams
        setLocalStream(prevStream => {
            if (prevStream) prevStream.getTracks().forEach(track => track.stop());
            return null;
        });
        localStreamRef.current = null;

        setRemoteStream(prevStream => {
            if (prevStream) prevStream.getTracks().forEach(track => track.stop());
            return null;
        });
        remoteStreamRef.current = null;

        const screenStream = screenStreamRef.current;
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        setIsCalling(false);
        setIsMuted(true);
        setIsVideoOff(true);
    }, [currentUser])

    const toggleMic = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = isMuted);
            setIsMuted(!isMuted);
        }
    }, [localStream, isMuted])

    const toggleVideo = useCallback(async () => {
        // 🛡️ MUTUAL EXCLUSION: If actively screen-sharing, stop it first before activating the camera
        if (isScreenSharing) {
            console.log("[APP-TELEMETRY] 💻 Screen-share active. Executing automated shutdown loop prior to webcam takeover...");
            await stopScreenShare();
        }

        const localStreamRef_current = localStreamRef.current;
        if (localStreamRef_current) {
            localStreamRef_current.getVideoTracks().forEach(track => track.enabled = isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    }, [localStream, isVideoOff, isScreenSharing, stopScreenShare])

    useEffect(() => {
        const token = localStorage.getItem('token');

        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'; // Standard WebSocket URL (localhost:8080)

        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => {
                // Only log protocol noise if running in local developer mode
                if (import.meta.env.NODE_ENV === 'development') {
                    console.log(`[STOMP-PROTOCOL] ${str}`);
                }
            },
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('[APP-TELEMETRY] 🔑 JWT Token verified via LocalStorage. Injecting Authorization Headers...');
                console.log('[APP-TELEMETRY] 🔌 Attempting full-duplex WebSocket connection to: ws://localhost:8080/ws');
                console.log('[APP-TELEMETRY] ✅ STOMP connection successfully established with Principal Identity.');
                console.log('[APP-TELEMETRY] 📡 Subscribed to global broadcast signaling hub: /topic/public');
                client.subscribe('/topic/public', async (message) => {
                    const payload = JSON.parse(message.body);
                    const freshToken = localStorage.getItem('token');  // Get a FRESH identity for the comparison
                    const myId = freshToken ? (jwtDecode(freshToken) as any).sub : null;

                    // Log EVERY signaling packet before any 'if' statements
                    if (payload.type) {
                        console.log(`[APP-TELEMETRY] 🔍 RAW SIGNAL: ${payload.type} from ${payload.sender} (Me: ${currentUser})`);
                    }

                    // CHAT
                    if (!payload.type) {
                        setMessages((prev) => [...prev, payload]);
                        return;
                    }

                    // Use the fresh ID to filter
                    if (payload.sender === myId) {
                        console.log(`[APP-TELEMETRY] 🔍 Ignoring self-broadcast: ${payload.type} from ${myId}`);
                        return;
                    }

                    console.log(`[APP-TELEMETRY] 📡 incoming: [${payload.type}] from ${payload.sender} (I am ${myId})`);

                    if (payload.type === "OFFER") {
                        console.log("[APP-TELEMETRY] 📥 OFFER detected. Initializing Answerer...");
                        setIsCalling(true);

                        const stream = await initializeLocalHardwareStream();

                        const peerConnection = new RTCPeerConnection({
                            iceServers: [
                                {
                                    urls: import.meta.env.VITE_STUN_SERVER_URL || 'stun:stun.l.google.com:19302'
                                },
                                {
                                    urls: import.meta.env.VITE_TURN_SERVER_URL || 'turn:localhost:3478',
                                    username: import.meta.env.VITE_TURN_USERNAME || 'devuser',
                                    credential: import.meta.env.VITE_TURN_SECRET || 'devpassword'
                                }
                            ]
                        });
                        peerConnectionRef.current = peerConnection;

                        peerConnection.ontrack = (e) => {
                            console.log("[APP-TELEMETRY] 🎥 REMOTE TRACK RECEIVED!");
                            setRemoteStream(e.streams[0]);
                            remoteStreamRef.current = e.streams[0];
                        };

                        peerConnection.onicecandidate = (e) => {
                            if (e.candidate) {
                                console.log("[APP-TELEMETRY] 📤 Sending CANDIDATE to", payload.sender);
                                sendSignalingMessage("CANDIDATE", e.candidate, payload.sender);
                            }
                        };

                        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

                        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));

                        // Process queue
                        while (iceCandidateQueue.current.length > 0) {
                            const cand = iceCandidateQueue.current.shift();
                            if (cand) await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                        }

                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        console.log("[APP-TELEMETRY] 📤 Sending ANSWER back to", payload.sender, ". Answer: ", answer);
                        sendSignalingMessage("ANSWER", answer, payload.sender);
                    }

                    else if (payload.type === "ANSWER") {
                        const peerConnection = peerConnectionRef.current;
                        if (!peerConnection) {
                            console.error("❌ Received ANSWER but pc.current is NULL!");
                            return;
                        }
                        console.log("[APP-TELEMETRY] 📥 ANSWER detected. Current PC state:", peerConnection.signalingState);

                        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
                        console.log("[APP-TELEMETRY] 🔗 Handshake STABLE");

                        while (iceCandidateQueue.current.length > 0) {
                            const cand = iceCandidateQueue.current.shift();
                            if (cand) await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                        }
                    }

                    else if (payload.type === "CANDIDATE") {
                        console.log("[APP-TELEMETRY] 📥 CANDIDATE detected.");
                        const candidateData = JSON.parse(payload.data);

                        const peerConnection = peerConnectionRef.current;
                        if (!peerConnection || !peerConnection.remoteDescription) {
                            console.log("[APP-TELEMETRY] 🕒 Queueing candidate...");
                            iceCandidateQueue.current.push(candidateData);
                            return;
                        }

                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
                            console.log("[APP-TELEMETRY] ✅ Candidate added to existing connection");
                        } catch (e) {
                            console.error("❌ Error adding ICE candidate", e);
                        }
                    }

                    else if (payload.type === "HANGUP") {
                        console.log(`[APP-TELEMETRY] 🛑 Remote peer [${payload.sender}] hung up. Executing local teardown.`);

                        const peerConnection = peerConnectionRef.current;

                        if (peerConnection) {
                            peerConnection.close();
                            peerConnectionRef.current = null;
                        }

                        setLocalStream(prevStream => {
                            if (prevStream) prevStream.getTracks().forEach(track => track.stop());
                            return null;
                        });
                        localStreamRef.current = null;

                        setRemoteStream(prevStream => {
                            if (prevStream) prevStream.getTracks().forEach(track => track.stop());
                            return null;
                        });
                        remoteStreamRef.current = null;

                        const screenStream = screenStreamRef.current;
                        if (screenStream) {
                            screenStream.getTracks().forEach(track => track.stop());
                            screenStreamRef.current = null;
                        }

                        setIsCalling(false);
                    }
                });

                // PUSH NOTIFICATION CLIENT TRACKER
                // Connects natively to the private user-isolated destination queue engineered in Spring Boot
                if (currentUser) {
                    console.log(`[NOTIF-CLIENT] Registering incoming push alert channel listener for: ${currentUser}`);
                    client.subscribe(`/queue/notifications/${currentUser}`, (message) => {
                        const pushNotification = JSON.parse(message.body);
                        console.log('[NOTIF-CLIENT] 🔔 Background push notification event intercepted:', pushNotification);

                        // Fires a global custom DOM event to dispatch snackbar warnings onto MainChat view layers
                        window.dispatchEvent(new CustomEvent('app-push-notification', { detail: pushNotification }));
                    });
                }
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            },
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
        };
        // }, [initializeLocalHardwareStream, sendSignalingMessage]);
    }, [currentUser]);

    return {
        messages,
        sendMessage,
        sendSignalingMessage,
        startCall,      // The function to trigger a call
        endCall,        // The function to end a call
        localStream,    // Your camera feed
        remoteStream,   // Their camera feed
        isCalling,      // Boolean to show/hide the UI
        setIsCalling,    // To close the UI on hangup
        toggleScreenShare,
        stopScreenShare,
        isMuted,
        isVideoOff,
        isScreenSharing,
        toggleMic,
        toggleVideo
    };
};
