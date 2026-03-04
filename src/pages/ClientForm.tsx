import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, Calendar, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ClientForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    birth_date: "",
    id_number: "",
    medical_conditions: "",
    allergies: "",
    medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: ""
  });

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('form_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error("קישור לא תקין או פג תוקף");
        return;
      }

      setValidToken(true);
      setInvitationData(data);

      // Update status to 'opened'
      await supabase
        .from('form_invitations')
        .update({ status: 'opened' })
        .eq('invitation_token', token);

    } catch (error) {
      console.error('Error validating token:', error);
      toast.error("שגיאה בטעינת הטופס");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validToken || !invitationData) {
        toast.error("טופס לא תקין");
        return;
      }

      // Prepare data with proper null handling for date fields
      const dataToSave = {
        ...formData,
        birth_date: formData.birth_date || null, // Convert empty string to null
      };

      // Create the client with pending status
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          ...dataToSave,
          user_id: invitationData.user_id,
          source: 'form_link',
          status: 'pending',
          invitation_token: token
        } as any);

      if (clientError) throw clientError;

      // Update invitation status to completed
      await supabase
        .from('form_invitations')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('invitation_token', token);

      setSubmitted(true);
      toast.success("הטופס נשלח בהצלחה! פרטיך ממתינים לאישור והם יאושרו בהקדם");

    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("שגיאה בשליחת הטופס");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">קישור לא תקין</h1>
            <p className="text-muted-foreground">
              הקישור שהגעת ממנו אינו תקין או פג תוקף
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-2">תודה לך!</h1>
            <p className="text-muted-foreground">
              הטופס נשלח בהצלחה. פרטיך ממתינים לאישור והם יאושרו בהקדם. נהיה בקשר בקרוב
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">בודק את הטופס...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">טופס פרטי לקוח</CardTitle>
            <CardDescription>
              אנא מלא את הפרטים הבאים כדי שנוכל להכין עבורך את השירות הטוב ביותר
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  פרטים אישיים
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-right">שם מלא *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-right">טלפון *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-right">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="text-right">תאריך לידה</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_number" className="text-right">תעודת זהות</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-right">כתובת</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  מידע רפואי
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="medical_conditions" className="text-right">מצבים רפואיים</Label>
                    <Textarea
                      id="medical_conditions"
                      value={formData.medical_conditions}
                      onChange={(e) => setFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
                      className="text-right resize-none"
                      rows={3}
                      placeholder="כגון: סוכרת, לחץ דם, בעיות עור..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allergies" className="text-right">אלרגיות</Label>
                    <Textarea
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                      className="text-right resize-none"
                      rows={3}
                      placeholder="כגון: אלרגיה לתרופות, מתכות, צבעים..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medications" className="text-right">תרופות</Label>
                    <Textarea
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                      className="text-right resize-none"
                      rows={3}
                      placeholder="תרופות שאתה לוקח כרגע..."
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  איש קשר חירום
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name" className="text-right">שם</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone" className="text-right">טלפון</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">הערות נוספות</h3>
                <div className="space-y-2">
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="text-right resize-none"
                    rows={4}
                    placeholder="כל מידע נוסף שחשוב לנו לדעת..."
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent text-lg py-6"
              >
                {loading ? "שולח..." : "שלח טופס"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientForm;