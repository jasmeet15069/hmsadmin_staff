import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Suggest similar routes based on path
  const getSuggestions = () => {
    const path = location.pathname.toLowerCase();
    const suggestions: { label: string; href: string }[] = [];

    if (path.includes('room')) {
      suggestions.push({ label: 'Rooms', href: '/rooms' });
    }
    if (path.includes('order') || path.includes('food') || path.includes('menu')) {
      suggestions.push({ label: 'Menu', href: '/menu' });
      suggestions.push({ label: 'Kitchen Queue', href: '/kitchen' });
    }
    if (path.includes('guest') || path.includes('checkin') || path.includes('checkout')) {
      suggestions.push({ label: 'Guests / Bookings', href: '/guests' });
    }
    if (path.includes('pay') || path.includes('bill')) {
      suggestions.push({ label: 'Payments', href: '/payments' });
    }
    if (path.includes('complaint') || path.includes('feedback')) {
      suggestions.push({ label: 'Complaints', href: '/complaints' });
    }
    if (path.includes('kitchen') || path.includes('cook')) {
      suggestions.push({ label: 'Kitchen Queue', href: '/kitchen' });
    }
    if (path.includes('inventory') || path.includes('stock')) {
      suggestions.push({ label: 'Inventory', href: '/inventory' });
    }
    
    return suggestions.slice(0, 3);
  };

  const suggestions = getSuggestions();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        {/* 404 Display */}
        <div className="relative mb-8">
          <div className="text-[120px] font-bold leading-none text-muted-foreground/20 sm:text-[180px]">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-4 border-primary p-4">
              <Search className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold">Page Not Found</h1>
        <p className="mb-6 text-muted-foreground">
          The page <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{location.pathname}</code> doesn't exist or has been moved.
        </p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Were you looking for:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <Link key={suggestion.href} to={suggestion.href}>
                  <Button variant="outline" size="sm">
                    {suggestion.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => window.history.back()} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="w-full gap-2 sm:w-auto">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Need help? Contact your administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
