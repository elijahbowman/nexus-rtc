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
        // Request camera and microphone.
        console.log("[APP-TELEMETRY] 🎙️ Requested local hardware media access via navigator.mediaDevices.getUserMedia...");

        // getUserMedia only exists in secure contexts (HTTPS or localhost).
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            throw new Error(
                "SECURITY BLOCK: Browser has stripped 'navigator.mediaDevices' because the app is running over insecure HTTP/WS (*.local domains)."
            );
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // Start with mic and camera disabled.
        stream.getAudioTracks().forEach(track => {
            track.enabled = false
            console.log("[APP-TELEMETRY] ⚠️ Privacy Guard Triggered: Disabling local audio tracks locally (track.enabled = false).");
        });
        stream.getVideoTracks().forEach(track => {
            track.enabled = false
            console.log("[APP-TELEMETRY] ⚠️ Privacy Guard Triggered: Disabling local video tracks locally (track.enabled = false).");
        });

        // Expose the stream for the local preview.
        console.log("[APP-TELEMETRY] 🎬 Local media stream initialized and safely zeroed out at the hardware boundary.");
        setLocalStream(stream);
        localStreamRef.current = stream;

        return stream;
    }, [])

    // KNOWN ISSUE (C1, C6): no ring/accept step, and a rejected getUserMedia leaves isCalling stuck true.
    // KNOWN ISSUE (S9, C7): TURN credentials are static and compiled into the client bundle.
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

        // Send local audio and video tracks.
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        // Remote media.
        peerConnection.ontrack = (event) => {
            console.log("[APP-TELEMETRY] 🎥 Remote track received!", event.streams[0]);
            setRemoteStream(event.streams[0]);
            remoteStreamRef.current = event.streams[0];
        };

        // Send our ICE candidates to the peer.
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalingMessage("CANDIDATE", event.candidate, receiver);
            }
        };

        // Create and send the offer.
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

            // 2. Reset screen-share UI state.
            setIsScreenSharing(false);

            // 3. Reacquire the camera. KNOWN ISSUE (C5): this also opens a new audio track that is never used
            // or stopped, while the audio sender still holds the track that was stopped when sharing began.
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = cameraStream.getVideoTracks()[0];

            // 4. Restore the camera on/off state. KNOWN ISSUE (C5): isVideoOff is captured by the onended
            // closure and is always true here, because starting a share sets it to true.
            if (isVideoOff) {
                videoTrack.enabled = false;
                console.log("[APP-TELEMETRY] 🔒 Privacy Guard Preserved: Fallback camera track initialized as DISABLED");
            } else {
                videoTrack.enabled = true;
                console.log("[APP-TELEMETRY] 📸 Fallback camera track initialized as ENABLED");
            }

            // 5. Swap the camera track back in (no renegotiation needed).
            const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }

            // 6. Update the local preview.
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

                // 2. Update UI state.
                setIsVideoOff(true);
                setIsScreenSharing(true);

                // 3. Swap the screen track in with replaceTrack (no SDP renegotiation needed).
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');

                if (sender) {
                    sender.replaceTrack(videoTrack);
                }

                // 4. Restore the camera if the user stops sharing from the browser's own UI.
                videoTrack.onended = () => stopScreenShare();

                setLocalStream(prevStream => {
                    if (prevStream) prevStream.getTracks().forEach(track => track.stop());  // KNOWN ISSUE (C5): also stops the audio track, so the peer loses your audio
                    return screenStream;  // Show the screen in the local preview
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

        // 1. Send HANGUP via /app/call.hangup. KNOWN ISSUE (C3): it is broadcast to everyone with no call
        // id, so every client in a call ends theirs.
        const stompClient = stompClientRef.current;
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: "/app/call.hangup",
                body: JSON.stringify({
                    type: "HANGUP",
                    sender: currentUser, // Ignored: the server sets sender from the Principal
                    receiver: "peer",
                    data: JSON.stringify({ status: "ended" })
                })
            });
        }

        // 2. Close the peer connection.
        const peerConnection = peerConnectionRef.current
        if (peerConnection) {
            peerConnection.close();
            peerConnectionRef.current = null;
        }

        // 3. Stop local and remote tracks (turns the camera off).
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
        // Turning the camera on stops any active screen share first.
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

        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => {
                // KNOWN ISSUE: import.meta.env.NODE_ENV is undefined in Vite, so this never logs. Use import.meta.env.DEV.
                if (import.meta.env.NODE_ENV === 'development') {
                    console.log(`[STOMP-PROTOCOL] ${str}`);
                }
            },
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('[APP-TELEMETRY] 🔑 JWT Token verified via LocalStorage. Injecting Authorization Headers...');
                console.log(`[APP-TELEMETRY] 🔌 Attempting full-duplex WebSocket connection to: ${WS_URL}`);
                console.log('[APP-TELEMETRY] ✅ STOMP connection successfully established with Principal Identity.');
                console.log('[APP-TELEMETRY] 📡 Subscribed to global broadcast signaling hub: /topic/public');
                // KNOWN ISSUE (C1): every client receives every signal here. Any OFFER from another user starts
                // the camera and auto-answers; `receiver` is never checked.
                client.subscribe('/topic/public', async (message) => {
                    const payload = JSON.parse(message.body);
                    const freshToken = localStorage.getItem('token');
                    const myId = freshToken ? (jwtDecode(freshToken) as any).sub : null;

                    // Debug logging.
                    if (payload.type) {
                        console.log(`[APP-TELEMETRY] 🔍 RAW SIGNAL: ${payload.type} from ${payload.sender} (Me: ${currentUser})`);
                    }

                    // Messages without a type are chat messages.
                    if (!payload.type) {
                        setMessages((prev) => [...prev, payload]);
                        return;
                    }

                    // Ignore our own signals.
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

                        // Apply ICE candidates that arrived before the remote description.
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

                // Notifications for this user. KNOWN ISSUE (S4): the destination is keyed by username and isn't
                // access-checked, so any client can subscribe to another user's notifications.
                if (currentUser) {
                    console.log(`[NOTIF-CLIENT] Registering incoming push alert channel listener for: ${currentUser}`);
                    client.subscribe(`/queue/notifications/${currentUser}`, (message) => {
                        const pushNotification = JSON.parse(message.body);
                        console.log('[NOTIF-CLIENT] 🔔 Background push notification event intercepted:', pushNotification);

                        // MainChat listens for this event to show the snackbar.
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
