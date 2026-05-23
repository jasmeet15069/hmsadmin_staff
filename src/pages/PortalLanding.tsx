import { Link } from 'react-router-dom';
import { Hotel, UserRound, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PortalLanding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center border-b-2 border-border px-6">
        <div className="flex items-center gap-3">
          <div className="border-2 border-primary p-2">
            <Hotel className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">HotelOps</h1>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-2">
        <section className="border-2 border-border p-6">
          <UserRound className="h-8 w-8" />
          <h2 className="mt-4 text-2xl font-bold">Client / Guest</h2>
          <p className="mt-2 text-muted-foreground">
            Book rooms, order food, view services, track orders, and manage guest requests.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/client-login">Client Login</Link>
          </Button>
        </section>

        <section className="border-2 border-border p-6">
          <UsersRound className="h-8 w-8" />
          <h2 className="mt-4 text-2xl font-bold">Staff</h2>
          <p className="mt-2 text-muted-foreground">
            Reception, room operations, kitchen workflows, payments, complaints, and service handling.
          </p>
          <Button asChild className="mt-6 w-full" variant="outline">
            <Link to="/staff-login">Staff Login</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
