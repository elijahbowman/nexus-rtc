import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';

export const useChat = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [stompClient, setStompClient] = useState<Client | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws', // Standard WebSocket URL
            connectHeaders: {
                Authorization: `Bearer ${token}` // This fixes the 401
            },
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('Connected to WebSocket');;
                client.subscribe('/topic/public', (message) => {
                    const payload = JSON.parse(message.body);
                    if (["OFFER", "ANSWER", "CANDIDATE"].includes(payload.type)) {
                        console.log(`📡 Signaling Received [${payload.type}] from ${payload.sender}:`, JSON.parse(payload.data));
                    }
                    else {
                        setMessages((prev) => [...prev, payload]);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, []);

    const sendMessage = (content: string) => {
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({ content })
            });
        }
    };

    const sendSignalingMessage = (type: string, data: any, receiver: string) => {
        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: `/app/call.${type.toLowerCase()}`,
                body: JSON.stringify({ type, data: JSON.stringify(data), receiver })
            });
        }
    };

    return { messages, sendMessage, sendSignalingMessage };
};
