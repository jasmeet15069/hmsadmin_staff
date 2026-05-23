import { cn } from '@/lib/utils';

type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';

interface Room {
  id: string;
  room_number: string;
  status: RoomStatus;
  floor: number;
}

interface RoomStatusGridProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
}

const statusColors: Record<RoomStatus, string> = {
  available: 'border-green-600 bg-green-50 text-green-800 hover:bg-green-100',
  occupied: 'border-primary bg-primary/5 text-primary hover:bg-primary/10',
  maintenance: 'border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10',
  cleaning: 'border-amber-600 bg-amber-50 text-amber-800 hover:bg-amber-100',
};

const statusLabels: Record<RoomStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  cleaning: 'Cleaning',
};

export function RoomStatusGrid({ rooms, onRoomClick }: RoomStatusGridProps) {
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {floors.map(floor => (
        <div key={floor}>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Floor {floor}
          </h4>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {rooms
              .filter(r => r.floor === floor)
              .sort((a, b) => a.room_number.localeCompare(b.room_number))
              .map(room => (
                <button
                  key={room.id}
                  onClick={() => onRoomClick?.(room)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center border-2 p-2 text-center transition-all',
                    statusColors[room.status]
                  )}
                >
                  <span className="text-lg font-bold">{room.room_number}</span>
                  <span className="text-[10px] font-medium uppercase">{statusLabels[room.status]}</span>
                </button>
              ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 border-t-2 border-border pt-4">
        {(Object.keys(statusColors) as RoomStatus[]).map(status => (
          <div key={status} className="flex items-center gap-2">
            <span className={cn('h-4 w-4 border-2', statusColors[status])} />
            <span className="text-sm font-medium">{statusLabels[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
