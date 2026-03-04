import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Send, MessageSquare, Smartphone, Copy, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SendFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SendFormDialog = ({ open, onOpenChange }: SendFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [platform, setPlatform] = useState<"whatsapp" | "sms">("whatsapp");
  const [generatedLink, setGeneratedLink] = useState<string>("");

  const generateFormLink = async (requirePhone = true) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("Generate form link - user:", user);
      
      if (!user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      // Generate unique token - using different method as fallback
      let token;
      try {
        token = crypto.randomUUID();
      } catch (e) {
        // Fallback token generation
        token = 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      console.log("Generated token:", token);
      
      const insertData = {
        user_id: user.id,
        phone_number: requirePhone && phoneNumber.trim() ? phoneNumber.trim() : null,
        invitation_token: token,
        platform: platform,
        status: 'sent'
      };
      
      console.log("Data to insert:", insertData);
      
      // Save invitation to database
      const { data, error } = await supabase
        .from('form_invitations')
        .insert(insertData)
        .select();

      console.log("Insert result:", { data, error });

      if (error) {
        console.error("Insert error details:", JSON.stringify(error, null, 2));
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        throw error;
      }

      // Create the form URL
      const formUrl = `${window.location.origin}/client-form?token=${token}`;
      console.log("Generated form URL:", formUrl);
      
      return { token, formUrl };
    } catch (error) {
      console.error('Error generating form link:', error);
      throw error;
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const result = await generateFormLink(false);
      if (!result) return;

      const { formUrl } = result;
      setGeneratedLink(formUrl);
      toast.success("הלינק נוצר בהצלחה");
    } catch (error) {
      toast.error("שגיאה ביצירת הקישור");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success("הלינק הועתק ללוח");
    } catch (error) {
      toast.error("שגיאה בהעתקת הלינק");
    }
  };

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      toast.error("יש להזין מספר טלפון");
      return;
    }

    setLoading(true);

    try {
      const result = await generateFormLink();
      if (!result) return;

      const { formUrl } = result;
      const message = `שלום! אנא מלא את הטופס הבא כדי שנוכל להכין עבורך את השירות הטוב ביותר: ${formUrl}`;

      if (platform === "whatsapp") {
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        console.log("Generated WhatsApp URL:", whatsappUrl);
        
        // Copy to clipboard and show the link to user
        try {
          await navigator.clipboard.writeText(whatsappUrl);
          toast.success(`קישור ווצאפ הועתק ללוח! פתח את הקישור בדפדפן או העתק אותו ידנית: ${whatsappUrl}`);
        } catch (error) {
          console.error("Error copying to clipboard:", error);
          toast.success(`קישור ווצאפ: ${whatsappUrl}`);
        }
        
        // Show the generated link in the dialog for manual use
        setGeneratedLink(whatsappUrl);
      } else {
        // For SMS, copy the message to clipboard
        try {
          await navigator.clipboard.writeText(message);
          toast.success("הודעת SMS הועתקה ללוח. פתח את אפליקציית ההודעות ושלח אותה");
        } catch (error) {
          console.error("Error copying SMS message:", error);
          toast.success("שלח את ההודעה הבאה ב-SMS: " + message);
        }
      }

      // Don't try to reset form state, keep dialog open to show the link
      // Reset only the phone number for next use
      setPhoneNumber("");

    } catch (error) {
      toast.error("שגיאה ביצירת הקישור");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">שליחת טופס ללקוח</DialogTitle>
          <DialogDescription className="text-right">
            הזן מספר טלפון ובחר פלטפורמת שליחה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-right block">מספר טלפון (אופציונלי לשליחה ישירה)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="052-1234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-right"
              dir="ltr"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-right block">פלטפורמת שליחה</Label>
            <RadioGroup value={platform} onValueChange={(value) => setPlatform(value as "whatsapp" | "sms")}>
              <div className="flex items-center space-x-2 justify-end">
                <Label htmlFor="whatsapp" className="cursor-pointer flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  וואטסאפ
                </Label>
                <RadioGroupItem value="whatsapp" id="whatsapp" />
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <Label htmlFor="sms" className="cursor-pointer flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  SMS
                </Label>
                <RadioGroupItem value="sms" id="sms" />
              </div>
            </RadioGroup>
          </div>

          {generatedLink && (
            <div className="bg-muted/50 p-4 rounded-lg border border-dashed">
              <Label className="text-right block mb-2 font-medium">הלינק שנוצר:</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {generatedLink.includes('wa.me') && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(generatedLink, '_blank')}
                    className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    פתח ווצאפ
                  </Button>
                )}
                <Input
                  value={generatedLink}
                  readOnly
                  className="text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground text-right">
              {generatedLink 
                ? (generatedLink.includes('wa.me') 
                    ? "קישור ווצאפ נוצר! העתק אותו ופתח בדפדפן כדי לשלוח את ההודעה."
                    : "הלינק נוצר ומוכן לשימוש. הקישור יהיה תקף למשך 7 ימים.")
                : "יישלח קישור לטופס שהלקוח יוכל למלא. הקישור יהיה תקף למשך 7 ימים."
              }
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateLink}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              "יוצר קישור..."
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                צור לינק להעתקה
              </>
            )}
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !phoneNumber.trim()}
            className="bg-gradient-to-r from-primary to-accent flex-1"
          >
            {loading ? (
              "יוצר קישור..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {platform === "whatsapp" ? "שלח בוואטסאפ" : "שלח ב-SMS"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendFormDialog;