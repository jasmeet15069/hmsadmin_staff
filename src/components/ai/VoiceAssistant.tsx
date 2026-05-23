import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2, X, Sparkles, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceAssistant({ isOpen, onClose }: VoiceAssistantProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const conversation = useConversation({
    onConnect: () => {
      toast({
        title: "Connected",
        description: "Voice assistant is ready to help you",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from voice assistant");
    },
    onError: (error) => {
      console.error("Voice assistant error:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to voice assistant. Please try again.",
      });
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('voice-assistant-token');

      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get voice token');
      }

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });
    } catch (error) {
      console.error('Failed to start voice conversation:', error);
      toast({
        variant: "destructive",
        title: "Microphone Access Required",
        description: "Please enable microphone access to use voice features.",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  if (!isOpen) return null;

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] border-2 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          Voice Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Status indicator */}
          <div className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full border-4 transition-all",
            isConnected 
              ? isSpeaking 
                ? "border-primary bg-primary/20 animate-pulse" 
                : "border-primary bg-primary/10"
              : "border-muted bg-muted/20"
          )}>
            {isConnecting ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              isSpeaking ? (
                <Volume2 className="h-10 w-10 text-primary animate-pulse" />
              ) : (
                <Mic className="h-10 w-10 text-primary" />
              )
            ) : (
              <MicOff className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          {/* Status text */}
          <div className="text-center">
            <p className="font-medium">
              {isConnecting ? 'Connecting...' : 
               isConnected ? (isSpeaking ? 'Assistant Speaking...' : 'Listening...') : 
               'Ready to Connect'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? 'Ask about rooms, menu, services, or anything else!'
                : 'Click to start voice chat with your AI concierge'}
            </p>
          </div>

          {/* Action button */}
          {!isConnected ? (
            <Button 
              onClick={startConversation} 
              disabled={isConnecting}
              className="w-full gap-2"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5" />
                  Start Voice Chat
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={stopConversation}
              variant="destructive"
              className="w-full gap-2"
              size="lg"
            >
              <PhoneOff className="h-5 w-5" />
              End Conversation
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            "Hey, what's on the menu?" • "Book a spa appointment" • "Room service hours?"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
