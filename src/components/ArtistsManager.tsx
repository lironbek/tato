import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Plus, Edit, Palette, Star, Phone, Mail, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Artist {
  id: string;
  full_name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  specialties?: string[];
  experience_years?: number;
  portfolio_url?: string;
  bio?: string;
  is_active: boolean;
  hourly_rate?: number;
  created_at: string;
}

const ArtistsManager = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    phone: "",
    email: "",
    specialties: [] as string[],
    experience_years: "",
    portfolio_url: "",
    bio: "",
    is_active: true,
    hourly_rate: ""
  });

  const [specialtyInput, setSpecialtyInput] = useState("");

  const commonSpecialties = [
    "קעקועים",
    "פירסינג",
    "קעקועי כיתוב",
    "קעקועי ריאליזם",
    "קעקועי אקוורל",
    "קעקועי גיאומטריה",
    "קעקועי יפניים",
    "פירסינג אוזן",
    "פירסינג גוף",
    "עיצוב וציור"
  ];

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast.error("לא ניתן לטעון את רשימת האמנים");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר כדי להוסיף אמן");
        return;
      }

      const artistData = {
        ...formData,
        user_id: user.id,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null
      };

      if (editingArtist) {
        const { error } = await supabase
          .from('artists')
          .update(artistData)
          .eq('id', editingArtist.id);

        if (error) throw error;
        
        toast.success("פרטי האמן עודכנו בהצלחה");
      } else {
        const { error } = await supabase
          .from('artists')
          .insert([artistData]);

        if (error) throw error;
        
        toast.success("אמן חדש נוסף בהצלחה");
      }

      resetForm();
      fetchArtists();
    } catch (error) {
      console.error('Error saving artist:', error);
      toast.error("לא ניתן לשמור את פרטי האמן");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      nickname: "",
      phone: "",
      email: "",
      specialties: [],
      experience_years: "",
      portfolio_url: "",
      bio: "",
      is_active: true,
      hourly_rate: ""
    });
    setSpecialtyInput("");
    setEditingArtist(null);
    setIsAddDialogOpen(false);
  };

  const startEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({
      full_name: artist.full_name || "",
      nickname: artist.nickname || "",
      phone: artist.phone || "",
      email: artist.email || "",
      specialties: artist.specialties || [],
      experience_years: artist.experience_years?.toString() || "",
      portfolio_url: artist.portfolio_url || "",
      bio: artist.bio || "",
      is_active: artist.is_active,
      hourly_rate: artist.hourly_rate?.toString() || ""
    });
    setIsAddDialogOpen(true);
  };

  const addSpecialty = (specialty: string) => {
    if (specialty && !formData.specialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialty]
      });
    }
    setSpecialtyInput("");
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty)
    });
  };

  const filteredArtists = artists.filter(artist =>
    artist.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (artist.nickname && artist.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (artist.phone && artist.phone.includes(searchTerm)) ||
    (artist.specialties && artist.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) {
    return <div className="p-6">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">ניהול אמנים</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="ml-2 h-4 w-4" />
              הוסף אמן חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingArtist ? "עריכת אמן" : "הוספת אמן חדש"}
              </DialogTitle>
              <DialogDescription className="text-right">
                מלא את הפרטים הנדרשים להוספת אמן חדש למערכת
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nickname">כינוי/שם מקצועי</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience_years">שנות ניסיון</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">תעריף לשעה (₪)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="portfolio_url">קישור לפורטפוליו</Label>
                <Input
                  id="portfolio_url"
                  type="url"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
                />
              </div>
              
              {/* Specialties */}
              <div className="space-y-2">
                <Label>התמחויות</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="הוסף התמחות..."
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSpecialty(specialtyInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSpecialty(specialtyInput)}
                  >
                    הוסף
                  </Button>
                </div>
                
                {/* Common specialties */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {commonSpecialties.map((specialty) => (
                    <Button
                      key={specialty}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => addSpecialty(specialty)}
                      disabled={formData.specialties.includes(specialty)}
                    >
                      {specialty}
                    </Button>
                  ))}
                </div>
                
                {/* Selected specialties */}
                <div className="flex flex-wrap gap-1">
                  {formData.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      {specialty}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSpecialty(specialty)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">ביוגרפיה</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">פעיל במערכת</Label>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  ביטול
                </Button>
                <Button type="submit">
                  {editingArtist ? "עדכן" : "הוסף"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש אמנים..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-right"
        />
      </div>

      {/* Artists Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredArtists.map((artist) => (
          <Card key={artist.id} className="bg-gradient-card border-border/50 backdrop-blur-sm hover:shadow-card transition-all duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {artist.full_name}
                  </CardTitle>
                  {artist.nickname && (
                    <p className="text-sm text-muted-foreground">"{artist.nickname}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={artist.is_active ? "default" : "secondary"}>
                    {artist.is_active ? "פעיל" : "לא פעיל"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(artist)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {artist.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{artist.phone}</span>
                </div>
              )}
              
              {artist.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{artist.email}</span>
                </div>
              )}

              {artist.experience_years && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{artist.experience_years} שנות ניסיון</span>
                </div>
              )}

              {artist.hourly_rate && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">₪{artist.hourly_rate}/שעה</span>
                </div>
              )}
              
              {/* Specialties */}
              {artist.specialties && artist.specialties.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">התמחויות:</div>
                  <div className="flex flex-wrap gap-1">
                    {artist.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {artist.bio && (
                <div className="text-sm text-muted-foreground">
                  {artist.bio.length > 100 ? `${artist.bio.substring(0, 100)}...` : artist.bio}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                נוסף: {new Date(artist.created_at).toLocaleDateString('he-IL')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredArtists.length === 0 && (
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Palette className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchTerm ? "לא נמצאו אמנים התואמים לחיפוש" : "עדיין לא נוספו אמנים"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ArtistsManager;