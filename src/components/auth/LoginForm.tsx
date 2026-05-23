import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onToggleMode: () => void;
  portal: 'client' | 'staff';
}

export function LoginForm({ onToggleMode, portal }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md border-2 shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          {portal === 'client' ? 'Guest Login' : 'Staff Login'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {portal === 'client'
            ? 'Sign in as a guest to book rooms, order food, and view services'
            : 'Sign in as hotel staff to manage daily operations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">
            {portal === 'client' ? "Don't have a guest account? " : 'Staff accounts are created by hotel management. '}
          </span>
          {portal === 'client' && (
            <button
              onClick={onToggleMode}
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
