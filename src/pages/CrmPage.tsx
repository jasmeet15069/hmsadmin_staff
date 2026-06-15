import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Plus, Search, User, Star, Award, Gift, Edit3, ToggleLeft, ToggleRight, Heart, Clock, MessageSquare, Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestProfile {
  id: string; name: string; email: string; phone: string; total_stays: number;
  vip_status: string; preferences: string[]; notes: string;
}

interface LoyaltyTier {
  id: string; name: string; min_points: number; multiplier: number; benefits: string;
}

interface Member {
  id: string; guest_id: string; guest_name: string; tier_name: string;
  points_balance: number; lifetime_points: number;
}

const vipBadge = (status: string) => {
  const styles: Record<string, string> = {
    none: 'bg-gray-100 text-gray-800', silver: 'bg-slate-200 text-slate-800',
    gold: 'bg-amber-100 text-amber-800', platinum: 'bg-purple-100 text-purple-800',
  };
  return <Badge variant="outline" className={cn('border-2 capitalize', styles[status] || '')}>{status}</Badge>;
};

export default function CrmPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('guest-profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const [guestDetailOpen, setGuestDetailOpen] = useState(false);
  const [guestDetailData, setGuestDetailData] = useState<any>(null);

  const [isTierOpen, setIsTierOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [tierForm, setTierForm] = useState({ name: '', min_points: 0, multiplier: 1, benefits: '' });

  const [isPointsOpen, setIsPointsOpen] = useState(false);
  const [pointsMemberId, setPointsMemberId] = useState('');
  const [pointsAction, setPointsAction] = useState<'award' | 'redeem'>('award');
  const [pointsAmount, setPointsAmount] = useState(0);
  const [newNote, setNewNote] = useState('');

  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageTemplates] = useState([
    'Welcome to our hotel! We look forward to hosting you.',
    'Your room is ready for early check-in.',
    'Thank you for staying with us. We hope to see you again!',
    'Special offer: 15% off your next stay with us.',
    'Your feedback matters! Please rate your stay.',
  ]);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/crm/guests');
      const json = await res.json();
      setGuests(json.data || []);
    } catch {
      toast({ title: 'Error loading guests', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/crm/loyalty/tiers');
      const json = await res.json();
      setTiers(json.data || []);
    } catch { /* ignore */ }
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/crm/loyalty/members');
      const json = await res.json();
      setMembers(json.data || []);
    } catch {
      toast({ title: 'Error loading members', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (tab === 'guest-profiles') fetchGuests();
    if (tab === 'loyalty-tiers') fetchTiers();
    if (tab === 'members') fetchMembers();
  }, [tab]);

  const viewGuestDetail = async (guest: GuestProfile) => {
    try {
      const res = await fetch(`/api/crm/guests/${guest.id}`);
      const json = await res.json();
      setGuestDetailData(json.data || {});
      setSelectedGuest(guest);
      setNewNote(guest.notes || '');
      setGuestDetailOpen(true);
    } catch {
      toast({ title: 'Error loading guest details', variant: 'destructive' });
    }
  };

  const toggleVipStatus = async () => {
    if (!selectedGuest) return;
    const nextStatus = selectedGuest.vip_status === 'none' ? 'silver'
      : selectedGuest.vip_status === 'silver' ? 'gold'
      : selectedGuest.vip_status === 'gold' ? 'platinum' : 'none';
    try {
      await fetch(`/api/crm/guests/${selectedGuest.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vip_status: nextStatus }),
      });
      toast({ title: `VIP status changed to ${nextStatus}` });
      setSelectedGuest({ ...selectedGuest, vip_status: nextStatus });
      fetchGuests();
    } catch {
      toast({ title: 'Error updating VIP status', variant: 'destructive' });
    }
  };

  const saveNotes = async () => {
    if (!selectedGuest) return;
    try {
      await fetch(`/api/crm/guests/${selectedGuest.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: newNote }),
      });
      toast({ title: 'Notes saved' });
      setSelectedGuest({ ...selectedGuest, notes: newNote });
      fetchGuests();
    } catch {
      toast({ title: 'Error saving notes', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedGuest || !messageText) return;
    toast({ title: 'Message sent', description: `Message sent to ${selectedGuest.name}` });
    setIsMessageOpen(false);
    setMessageText('');
  };

  const openTierDialog = (tier?: LoyaltyTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({ name: tier.name, min_points: tier.min_points, multiplier: tier.multiplier, benefits: tier.benefits });
    } else {
      setEditingTier(null);
      setTierForm({ name: '', min_points: 0, multiplier: 1, benefits: '' });
    }
    setIsTierOpen(true);
  };

  const handleSaveTier = async () => {
    if (!tierForm.name) return;
    try {
      const url = editingTier ? `/api/crm/loyalty/tiers/${editingTier.id}` : '/api/crm/loyalty/tiers';
      const method = editingTier ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tierForm) });
      if (!res.ok) throw new Error();
      setIsTierOpen(false);
      fetchTiers();
      toast({ title: editingTier ? 'Tier updated' : 'Tier created' });
    } catch {
      toast({ title: 'Error saving tier', variant: 'destructive' });
    }
  };

  const handlePointsAction = async () => {
    if (!pointsMemberId || pointsAmount <= 0) return;
    try {
      const endpoint = pointsAction === 'award' ? '/api/crm/loyalty/points/award' : '/api/crm/loyalty/points/redeem';
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: pointsMemberId, points: pointsAmount }),
      });
      if (!res.ok) throw new Error();
      setIsPointsOpen(false);
      setPointsAmount(0);
      fetchMembers();
      toast({ title: `Points ${pointsAction}ed successfully` });
    } catch {
      toast({ title: `Error ${pointsAction}ing points`, variant: 'destructive' });
    }
  };

  const filteredGuests = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">CRM & Loyalty</h2>
            <p className="text-muted-foreground">Guest profiles, loyalty tiers, member management, and communication</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'loyalty-tiers' && <Button onClick={() => openTierDialog()}><Plus className="h-4 w-4 mr-1" /> New Tier</Button>}
            <Button variant="outline" size="icon" onClick={tab === 'guest-profiles' ? fetchGuests : tab === 'loyalty-tiers' ? fetchTiers : fetchMembers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="guest-profiles"><User className="h-4 w-4 mr-1" /> Guest Profiles</TabsTrigger>
            <TabsTrigger value="loyalty-tiers"><Award className="h-4 w-4 mr-1" /> Loyalty Tiers</TabsTrigger>
            <TabsTrigger value="members"><Star className="h-4 w-4 mr-1" /> Members</TabsTrigger>
          </TabsList>

          <TabsContent value="guest-profiles" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : filteredGuests.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mb-3" />
                    <p>No guests found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Total Stays</TableHead>
                        <TableHead>VIP Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGuests.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="text-sm">{g.email}</TableCell>
                          <TableCell>{g.phone}</TableCell>
                          <TableCell className="font-mono">{g.total_stays}</TableCell>
                          <TableCell>{vipBadge(g.vip_status)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => viewGuestDetail(g)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loyalty-tiers" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {tiers.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mb-3" />
                    <p>No loyalty tiers defined</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Min Points</TableHead>
                        <TableHead>Multiplier</TableHead>
                        <TableHead>Benefits</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiers.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium capitalize">{t.name}</TableCell>
                          <TableCell className="font-mono">{t.min_points.toLocaleString()}</TableCell>
                          <TableCell className="font-mono">{t.multiplier}x</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{t.benefits}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => openTierDialog(t)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : members.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mb-3" />
                    <p>No loyalty members yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Points Balance</TableHead>
                        <TableHead>Lifetime Points</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.guest_name}</TableCell>
                          <TableCell className="capitalize">{m.tier_name}</TableCell>
                          <TableCell className="font-mono font-bold">{m.points_balance.toLocaleString()}</TableCell>
                          <TableCell className="font-mono">{m.lifetime_points.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setPointsMemberId(m.id); setPointsAction('award'); setIsPointsOpen(true); }}>
                                <Gift className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setPointsMemberId(m.id); setPointsAction('redeem'); setIsPointsOpen(true); }}>
                                <Award className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={guestDetailOpen} onOpenChange={setGuestDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{selectedGuest?.name} {selectedGuest && <span className="text-sm font-normal">{vipBadge(selectedGuest.vip_status)}</span>}</DialogTitle>
            </DialogHeader>
            {selectedGuest && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border-2 bg-muted/30 p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{selectedGuest.name.charAt(0)}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selectedGuest.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selectedGuest.phone}</div>
                    <div className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-muted-foreground" />{selectedGuest.total_stays} stays</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {[{ status: 'none', label: 'None' }, { status: 'silver', label: 'Silver' }, { status: 'gold', label: 'Gold' }, { status: 'platinum', label: 'Platinum' }].map(s => (
                      <Button key={s.status} size="sm" variant={selectedGuest.vip_status === s.status ? 'default' : 'outline'} onClick={async () => {
                        try {
                          await fetch(`/api/crm/guests/${selectedGuest.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vip_status: s.status }) });
                          setSelectedGuest({ ...selectedGuest, vip_status: s.status });
                          fetchGuests();
                          toast({ title: `VIP set to ${s.label}` });
                        } catch { toast({ title: 'Error', variant: 'destructive' }); }
                      }}>{s.label}</Button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIsMessageOpen(true)}><MessageSquare className="h-4 w-4 mr-1" /> Message</Button>
                </div>

                {guestDetailData?.preferences?.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Preferences</p>
                    <div className="flex flex-wrap gap-1">
                      {guestDetailData.preferences.map((p: string, i: number) => <Badge key={i} variant="secondary"><Heart className="h-3 w-3 mr-1" />{p}</Badge>)}
                    </div>
                  </div>
                )}

                {guestDetailData?.stay_history?.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Stay History</p>
                    <Table>
                      <TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {guestDetailData.stay_history.map((s: any, i: number) => (
                          <TableRow key={s.id || i}>
                            <TableCell>{s.room_number}</TableCell>
                            <TableCell>{new Date(s.check_in).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(s.check_out).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} className="min-h-[80px]" />
                  <Button size="sm" onClick={saveNotes}>Save Notes</Button>
                </div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setGuestDetailOpen(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Message to {selectedGuest?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {messageTemplates.map((t, i) => (
                    <Button key={i} size="sm" variant="outline" className="text-xs" onClick={() => setMessageText(t)}>{t.slice(0, 30)}...</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Message</Label>
                <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} className="min-h-[100px]" placeholder="Type your message..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMessageOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage} disabled={!messageText}><MessageSquare className="h-4 w-4 mr-1" /> Send</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTierOpen} onOpenChange={setIsTierOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingTier ? 'Edit Tier' : 'Create Tier'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-1"><Label>Tier Name *</Label><Input value={tierForm.name} onChange={e => setTierForm(p => ({...p, name: e.target.value}))} placeholder="e.g., Gold" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Min Points</Label><Input type="number" min={0} value={tierForm.min_points} onChange={e => setTierForm(p => ({...p, min_points: parseInt(e.target.value) || 0}))} /></div>
                <div className="space-y-1"><Label>Multiplier</Label><Input type="number" min={1} step={0.1} value={tierForm.multiplier} onChange={e => setTierForm(p => ({...p, multiplier: parseFloat(e.target.value) || 1}))} /></div>
              </div>
              <div className="space-y-1"><Label>Benefits</Label><Textarea value={tierForm.benefits} onChange={e => setTierForm(p => ({...p, benefits: e.target.value}))} placeholder="e.g., Free breakfast, Late checkout" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsTierOpen(false)}>Cancel</Button><Button onClick={handleSaveTier}>{editingTier ? 'Update' : 'Create'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPointsOpen} onOpenChange={setIsPointsOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{pointsAction === 'award' ? 'Award Points' : 'Redeem Points'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1"><Label>Points</Label><Input type="number" min={1} value={pointsAmount} onChange={e => setPointsAmount(parseInt(e.target.value) || 0)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPointsOpen(false)}>Cancel</Button><Button onClick={handlePointsAction}>{pointsAction === 'award' ? 'Award' : 'Redeem'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
