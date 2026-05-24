import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const useWebSocket = (tripId, onMessageReceived) => {
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef(null);

  useEffect(() => {
    if (!tripId) return;

    // Establish WebSocket client
    const client = new Client({
      webSocketFactory: () => {
        const baseUrl = import.meta.env.VITE_API_URL;

      if (!baseUrl) {
         throw new Error("VITE_API_URL is missing");
}
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return new SockJS(`${cleanBaseUrl}/ws-connect`);
      },
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);

      // Subscribe to trip-specific changes
      client.subscribe(`/topic/trip/${tripId}`, (message) => {
        if (message.body) {
          try {
            const parsedData = JSON.parse(message.body);
            onMessageReceived(parsedData);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        }
      });
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('STOMP error occurred:', frame);
      setIsConnected(false);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [tripId, onMessageReceived]);

  const sendMessage = (destination, body) => {
    if (stompClientRef.current && isConnected) {
      stompClientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('Cannot send message, WebSocket not connected');
    }
  };

  return { isConnected, sendMessage };
};
