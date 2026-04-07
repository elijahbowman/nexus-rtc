import { useEffect, useRef, useState } from 'react';
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
    const pc = useRef<RTCPeerConnection | null>(null);
    const currentUserRef = useRef<string | null>(getInitialUser());
    const currentUser = currentUserRef.current;
    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
    const screenStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws', // Standard WebSocket URL
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('Connected to WebSocket');;
                client.subscribe('/topic/public', async (message) => {
                    const payload = JSON.parse(message.body);
                    const freshToken = localStorage.getItem('token');  // Get a FRESH identity for the comparison
                    const myId = freshToken ? (jwtDecode(freshToken) as any).sub : null;

                    // Log EVERY signaling packet before any 'if' statements
                    if (payload.type) {
                        console.log(`🔍 RAW SIGNAL: ${payload.type} from ${payload.sender} (Me: ${currentUser})`);
                    }

                    // CHAT
                    if (!payload.type) {
                        setMessages((prev) => [...prev, payload]);
                        return;
                    }

                    // Use the fresh ID to filter
                    if (payload.sender === myId) {
                        console.log(`🔍 Ignoring self-broadcast: ${payload.type} from ${myId}`);
                        return;
                    }

                    console.log(`📡 incoming: [${payload.type}] from ${payload.sender} (I am ${myId})`);

                    if (payload.type === "OFFER") {
                        console.log("📥 OFFER detected. Initializing Answerer...");
                        setIsCalling(true);
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                        stream.getAudioTracks().forEach(track => track.enabled = false);
                        stream.getVideoTracks().forEach(track => track.enabled = false);


                        setLocalStream(stream);

                        const peer = new RTCPeerConnection({
                            iceServers: [
                                { urls: 'stun:stun.l.google.com:19302' },
                                {
                                    urls: 'turn:localhost:3478',
                                    username: 'devuser',
                                    credential: 'devpassword'
                                }
                            ]
                        });
                        pc.current = peer;

                        peer.ontrack = (e) => {
                            console.log("🎥 REMOTE TRACK RECEIVED!");
                            setRemoteStream(e.streams[0]);
                        };

                        peer.onicecandidate = (e) => {
                            if (e.candidate) {
                                console.log("📤 Sending CANDIDATE to", payload.sender);
                                sendSignalingMessage("CANDIDATE", e.candidate, payload.sender);
                            }
                        };

                        stream.getTracks().forEach(track => peer.addTrack(track, stream));

                        await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));

                        // Process queue
                        while (iceCandidateQueue.current.length > 0) {
                            const cand = iceCandidateQueue.current.shift();
                            if (cand) await peer.addIceCandidate(new RTCIceCandidate(cand));
                        }

                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        console.log("📤 Sending ANSWER back to", payload.sender, ". Answer: ", answer);
                        sendSignalingMessage("ANSWER", answer, payload.sender);
                    }

                    else if (payload.type === "ANSWER") {
                        console.log("📥 ANSWER detected. Current PC state:", pc.current?.signalingState);
                        if (pc.current) {
                            await pc.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
                            console.log("🔗 Handshake STABLE");

                            while (iceCandidateQueue.current.length > 0) {
                                const cand = iceCandidateQueue.current.shift();
                                if (cand) await pc.current.addIceCandidate(new RTCIceCandidate(cand));
                            }
                        } else {
                            console.error("❌ Received ANSWER but pc.current is NULL!");
                        }
                    }

                    else if (payload.type === "CANDIDATE") {
                        console.log("📥 CANDIDATE detected.");
                        const candidateData = JSON.parse(payload.data);
                        if (pc.current && pc.current.remoteDescription) {
                            try {
                                await pc.current.addIceCandidate(new RTCIceCandidate(candidateData));
                                console.log("✅ Candidate added to existing connection");
                            } catch (e) {
                                console.error("❌ Error adding ICE candidate", e);
                            }
                        } else {
                            console.log("🕒 Queueing candidate...");
                            iceCandidateQueue.current.push(candidateData);
                        }
                    }
                });
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
    }, []);

    const sendMessage = (content: string) => {
        if (stompClientRef.current?.connected) {
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({ content })
            });
        }
    };

    const sendSignalingMessage = (type: string, data: any, receiver: string) => {
        if (stompClientRef.current?.connected) {
            stompClientRef.current.publish({
                destination: `/app/call.${type.toLowerCase()}`,
                body: JSON.stringify({ type, data: JSON.stringify(data), receiver })
            });
        }
    };

    const startCall = async (receiver: string) => {
        setIsCalling(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // START MUTED: Disable tracks immediately
        stream.getAudioTracks().forEach(track => track.enabled = false);
        stream.getVideoTracks().forEach(track => track.enabled = false);

        setLocalStream(stream);

        pc.current = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302'
                },
                {
                    urls: 'turn:localhost:3478',
                    username: 'devuser',
                    credential: 'devpassword'
                }
            ]
        });

        // Add tracks to the connection
        stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

        // Listen for the other person's video
        pc.current.ontrack = (event) => {
            console.log("🎥 Remote track received!", event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        // Listen for network candidates
        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalingMessage("CANDIDATE", event.candidate, receiver);
            }
        };

        // Create the Offer
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        sendSignalingMessage("OFFER", offer, receiver);
    };

    const toggleScreenShare = async () => {
        if (!pc.current || !localStream) return;

        try {
            if (!screenStreamRef.current) {
                // 1. Capture Screen
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;

                // 2. Replace Track (Senior Flex: replaceTrack is seamless)
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');

                if (sender) {
                    sender.replaceTrack(videoTrack);
                }

                // 3. Handle user stopping share via browser UI
                videoTrack.onended = () => stopScreenShare();
                setLocalStream(screenStream); // Update UI to show screen in small box
            } else {
                stopScreenShare();
            }

        } catch (err) {
            console.error("Screen share failed", err);
        }
    };

    const stopScreenShare = async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;

            // Switch back to camera
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = cameraStream.getVideoTracks()[0];
            const sender = pc.current?.getSenders().find(s => s.track?.kind === 'video');

            if (sender) sender.replaceTrack(videoTrack);
            setLocalStream(cameraStream);
        }
    };

    return {
        messages,
        sendMessage,
        sendSignalingMessage,
        startCall,      // The function to trigger a call
        localStream,    // Your camera feed
        remoteStream,   // Their camera feed
        isCalling,      // Boolean to show/hide the UI
        setIsCalling,    // To close the UI on hangup
        toggleScreenShare,
        stopScreenShare
    };
};
