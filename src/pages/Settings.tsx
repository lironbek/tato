import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, Building, Globe, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CompanySettings {
  id?: string;
  company_name: string;
  company_logo_url?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  company_description?: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: "InkFlow CRM",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    company_description: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          company_name: data.company_name || "InkFlow CRM",
          company_logo_url: data.company_logo_url || "",
          company_address: data.company_address || "",
          company_phone: data.company_phone || "",
          company_email: data.company_email || "",
          company_website: data.company_website || "",
          company_description: data.company_description || ""
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error("שגיאה בטעינת ההגדרות");
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("נא להעלות קובץ תמונה בלבד");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל הקובץ לא יכול לעלות על 5MB");
      return;
    }

    setUploadingLogo(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Remove old logo if exists
      if (settings.company_logo_url) {
        const oldFileName = settings.company_logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('company-logos')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, company_logo_url: publicUrl }));
      toast.success("הלוגו הועלה בהצלחה");
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error("שגיאה בהעלאת הלוגו");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;
      
      if (settings.company_logo_url) {
        const fileName = settings.company_logo_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('company-logos')
            .remove([`${user.id}/${fileName}`]);
        }
      }

      setSettings(prev => ({ ...prev, company_logo_url: "" }));
      toast.success("הלוגו הוסר בהצלחה");
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error("שגיאה בהסרת הלוגו");
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }
      
      const settingsData = {
        user_id: user.id,
        company_name: settings.company_name,
        company_logo_url: settings.company_logo_url,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_website: settings.company_website,
        company_description: settings.company_description,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('company_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('company_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success("ההגדרות נשמרו בהצלחה");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("שגיאה בשמירת ההגדרות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-3 sm:p-6" dir="ltr" style={{ backgroundColor: '#1a1625' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="w-fit"
          style={{ color: '#fff' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#fff' }}>הגדרות המערכת</h1>
          <p className="text-sm sm:text-base text-muted-foreground" style={{ color: '#aaa' }}>נהל את פרטי החברה והמערכת שלך</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Company Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left flex items-center">
              <Building className="h-5 w-5 mr-2" />
              לוגו החברה
            </CardTitle>
            <CardDescription className="text-left">
              העלה לוגו שיוצג במערכת ובמסמכים
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.company_logo_url ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <img
                  src={settings.company_logo_url}
                  alt="לוגו החברה"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain border rounded-lg mx-auto sm:mx-0"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploadingLogo}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    החלף לוגו
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    הסר לוגו
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center">
                <Upload className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground mb-4">לא נבחר לוגו</p>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={uploadingLogo}
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? "מעלה..." : "בחר קובץ"}
                </Button>
              </div>
            )}
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left">פרטי החברה</CardTitle>
            <CardDescription className="text-left">
              הזן את פרטי החברה שיוצגו במערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-left block">שם החברה *</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email" className="text-left block flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  אימייל החברה
                </Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                  className="text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_phone" className="text-left block flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  טלפון החברה
                </Label>
                <Input
                  id="company_phone"
                  value={settings.company_phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website" className="text-left block flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  אתר החברה
                </Label>
                <Input
                  id="company_website"
                  value={settings.company_website}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_website: e.target.value }))}
                  className="text-left"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address" className="text-left block flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                כתובת החברה
              </Label>
              <Textarea
                id="company_address"
                value={settings.company_address}
                onChange={(e) => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
                className="text-left resize-none"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_description" className="text-left block">תיאור החברה</Label>
              <Textarea
                id="company_description"
                value={settings.company_description}
                onChange={(e) => setSettings(prev => ({ ...prev, company_description: e.target.value }))}
                className="text-left resize-none"
                rows={4}
                placeholder="תיאור קצר על החברה, השירותים והמומחיות..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-start">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-gradient-to-r from-primary to-accent w-full sm:w-auto"
          >
            {loading ? "שומר..." : "שמור הגדרות"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;