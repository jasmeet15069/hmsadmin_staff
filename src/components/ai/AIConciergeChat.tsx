import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIConcierge } from '@/hooks/useAIConcierge';
import { Bot, Send, User, Loader2, X, Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIConciergeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIConciergeChat({ isOpen, onClose }: AIConciergeProps) {
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage, clearChat } = useAIConcierge();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const quickPrompts = [
    "What's on the menu?",
    "Spa hours?",
    "Room service help",
    "Local recommendations"
  ];

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] border-2 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI Concierge
        </CardTitle>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    Hello! I'm your AI concierge. How can I help you today?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="border-2 px-2 py-1 text-xs hover:bg-muted transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center border-2",
                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] border-2 p-3 text-sm",
                    msg.role === 'user' ? "border-primary bg-primary/5" : "border-border"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="border-2 p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-4 border-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t-2 p-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="border-2"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
