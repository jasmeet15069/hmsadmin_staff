import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGuestPreferences } from '@/hooks/useGuestPreferences';
import { Settings, Loader2, Heart, AlertTriangle, Utensils } from 'lucide-react';

export function GuestPreferencesDialog() {
  const {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
    DIETARY_OPTIONS,
    ALLERGY_OPTIONS,
    CATEGORY_OPTIONS,
  } = useGuestPreferences();

  const [isOpen, setIsOpen] = useState(false);
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (preferences) {
      setDietary(preferences.dietary_restrictions || []);
      setAllergies(preferences.allergies || []);
      setFavorites(preferences.favorite_categories || []);
      setNotes(preferences.notes || '');
    }
  }, [preferences]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = async () => {
    const success = await savePreferences({
      dietary_restrictions: dietary,
      allergies: allergies,
      favorite_categories: favorites,
      notes: notes || null,
    });
    if (success) setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dining Preferences
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dietary Restrictions */}
            <div>
              <Label className="mb-3 flex items-center gap-2 text-base font-bold">
                <Utensils className="h-4 w-4" />
                Dietary Restrictions
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map(option => (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`diet-${option}`}
                      checked={dietary.includes(option)}
                      onCheckedChange={() => toggleItem(dietary, setDietary, option)}
                    />
                    <Label htmlFor={`diet-${option}`} className="text-sm font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <Label className="mb-3 flex items-center gap-2 text-base font-bold">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Allergies
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ALLERGY_OPTIONS.map(option => (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`allergy-${option}`}
                      checked={allergies.includes(option)}
                      onCheckedChange={() => toggleItem(allergies, setAllergies, option)}
                    />
                    <Label htmlFor={`allergy-${option}`} className="text-sm font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
              {allergies.length > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  ⚠️ Kitchen staff will be notified of your allergies with every order.
                </p>
              )}
            </div>

            {/* Favorite Categories */}
            <div>
              <Label className="mb-3 flex items-center gap-2 text-base font-bold">
                <Heart className="h-4 w-4 text-primary" />
                Favorite Categories
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <div key={option} className="flex items-center gap-2">
                    <Checkbox
                      id={`fav-${option}`}
                      checked={favorites.includes(option)}
                      onCheckedChange={() => toggleItem(favorites, setFavorites, option)}
                    />
                    <Label htmlFor={`fav-${option}`} className="text-sm font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="notes" className="mb-2 block text-base font-bold">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other preferences or special requests..."
                className="border-2"
              />
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
