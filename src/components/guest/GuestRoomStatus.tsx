import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bed, CheckCircle2, Clock, Loader2, Wifi, Coffee } from 'lucide-react';

interface ActiveStay {
  id: string;
  check_in_date: string;
  check_out_date: string;
  actual_check_in: string | null;
  rooms: {
    room_number: string;
    room_type: string;
    floor: number;
    amenities: string[] | null;
    status: string;
  } | null;
}

export function GuestRoomStatus() {
  const { user } = useAuth();
  const [stay, setStay] = useState<ActiveStay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStay = async () => {
      const { data } = await supabase
        .from('guest_stays')
        .select('id, check_in_date, check_out_date, actual_check_in, rooms(room_number, room_type, floor, amenities, status)')
        .eq('guest_id', user.id)
        .not('actual_check_in', 'is', null)
        .is('actual_check_out', null)
        .order('actual_check_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStay(data as any);
      setIsLoading(false);
    };

    fetchStay();

    const channel = supabase
      .channel('guest-room-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'guest_stays' }, () => {
        fetchStay();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stay) {
    return null;
  }

  const daysRemaining = Math.ceil(
    (new Date(stay.check_out_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const amenityIcons: Record<string, typeof Wifi> = {
    wifi: Wifi,
    'mini bar': Coffee,
  };

  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bed className="h-5 w-5" />
            Your Room
          </CardTitle>
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Checked In
          </Badge>
        </div>
        <CardDescription>
          Room {stay.rooms?.room_number} • Floor {stay.rooms?.floor} • {stay.rooms?.room_type}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Check-in</span>
          <span>{new Date(stay.check_in_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Check-out</span>
          <span>{new Date(stay.check_out_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Remaining</span>
          <Badge variant={daysRemaining <= 1 ? 'destructive' : 'secondary'}>
            <Clock className="mr-1 h-3 w-3" />
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </Badge>
        </div>

        {stay.rooms?.amenities && stay.rooms.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {stay.rooms.amenities.map(amenity => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
