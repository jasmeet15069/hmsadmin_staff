import { useState, useCallback } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const CHAT_URL = `${API_URL}/ai/chat`;

export function useAIConcierge() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Connection failed' }));
        throw new Error(errData.error || 'Failed to connect');
      }

      const payload = await resp.json();
      const reply = payload.data?.reply || 'I am here to help with your stay.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Something went wrong';
      setError(errorMessage);
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
