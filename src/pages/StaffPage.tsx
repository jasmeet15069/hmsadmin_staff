import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStaff } from '@/hooks/useStaff';
import { useStaffShifts } from '@/hooks/useStaffShifts';
import { ROLE_LABELS } from '@/types/auth';
import { Users, Clock, Search, Loader2, LogIn, LogOut, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StaffPage() {
  const { staff, isLoading, onDutyCount } = useStaff();
  const { shifts, clockIn, clockOut, myActiveShift } = useStaffShifts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<typeof staff[0] | null>(null);

  const filteredStaff = staff.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStaffShifts = (userId: string) => {
    return shifts.filter(s => s.user_id === userId).slice(0, 10);
  };

  const formatDuration = (clockIn: string, clockOut?: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
            <p className="text-muted-foreground">
              {staff.length} staff members • {onDutyCount} on duty
            </p>
          </div>
          {/* Clock In/Out for current user */}
          <div>
            {myActiveShift ? (
              <Button
                variant="outline"
                onClick={() => clockOut(myActiveShift.id)}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Clock Out ({formatDuration(myActiveShift.clock_in)})
              </Button>
            ) : (
              <Button onClick={clockIn}>
                <LogIn className="mr-2 h-4 w-4" />
                Clock In
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{staff.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-600 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-800">Currently On Duty</p>
                  <p className="text-2xl font-bold text-green-800">{onDutyCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Shifts</p>
                  <p className="text-2xl font-bold">
                    {shifts.filter(s =>
                      new Date(s.clock_in).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-2 pl-9"
          />
        </div>

        {/* Staff Table */}
        <div className="border-2 border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead>Staff Member</TableHead>
                <TableHead>Role(s)</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map(member => (
                <TableRow key={member.id} className="border-b">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.map(r => (
                        <Badge key={r.id} variant="secondary" className="text-xs">
                          {ROLE_LABELS[r.role]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.phone || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {member.currentShift ? (
                      <Badge className="bg-green-600">
                        On Duty ({formatDuration(member.currentShift.clock_in)})
                      </Badge>
                    ) : (
                      <Badge variant="outline">Off Duty</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStaff(member)}
                        >
                          View Shifts
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-2 max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{member.full_name}'s Shifts</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Clock In</TableHead>
                                <TableHead>Clock Out</TableHead>
                                <TableHead>Duration</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStaffShifts(member.user_id).map(shift => (
                                <TableRow key={shift.id}>
                                  <TableCell>
                                    {new Date(shift.clock_in).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(shift.clock_in).toLocaleTimeString()}
                                  </TableCell>
                                  <TableCell>
                                    {shift.clock_out
                                      ? new Date(shift.clock_out).toLocaleTimeString()
                                      : <Badge variant="secondary">Active</Badge>
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {formatDuration(shift.clock_in, shift.clock_out)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {getStaffShifts(member.user_id).length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No shifts recorded
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStaff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No staff members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
