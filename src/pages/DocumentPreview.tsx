import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Link2, Eye, ArrowRight, Settings, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";
import { FormField } from "@/components/FormBuilder";

interface DocumentData {
  id: string;
  title: string;
  description: string;
  category: string;
  file_name: string;
  created_at: string;
  signature_request_id: string;
  file_path: string;
  document_content: string | null;
  signature_positions: any;
}

const DocumentPreview = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureLink, setSignatureLink] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [signatureConfig, setSignatureConfig] = useState({
    requireIdNumber: true,
    requireDate: true,
    customMessage: "",
    signaturePosition: "bottom"
  });

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error('מסמך לא נמצא');
        navigate('/');
        return;
      }

      setDocument(data);
      
      // Parse form fields if they exist
      if (data.signature_positions) {
        try {
          let fields: FormField[] = [];
          if (typeof data.signature_positions === 'string') {
            fields = JSON.parse(data.signature_positions);
          } else if (Array.isArray(data.signature_positions)) {
            fields = data.signature_positions as unknown as FormField[];
          }
          
          if (Array.isArray(fields)) {
            setFormFields(fields);
          }
        } catch (e) {
          console.log('Error parsing form fields:', e);
          setFormFields([]);
        }
      }
      
      // Generate signature link if doesn't exist
      if (!data.signature_request_id) {
        const token = `DOC-${Date.now()}`;
        await supabase
          .from('documents')
          .update({ signature_request_id: token })
          .eq('id', documentId);
        
        setSignatureLink(`${window.location.origin}/sign/${token}`);
      } else {
        setSignatureLink(`${window.location.origin}/sign/${data.signature_request_id}`);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('שגיאה בטעינת המסמך');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const copySignatureLink = () => {
    navigator.clipboard.writeText(signatureLink).then(() => {
      toast.success('קישור החתימה הועתק ללוח!');
    }).catch(() => {
      toast.error('שגיאה בהעתקת הקישור');
    });
  };

  const openSignaturePage = () => {
    window.open(signatureLink, '_blank');
  };

  const getCategoryDisplay = (category: string) => {
    const categories: { [key: string]: string } = {
      health_declaration: 'הצהרת בריאות',
      consent_form: 'טופס הסכמה',
      aftercare: 'הוראות טיפוח',
      contract: 'חוזה',
      other: 'אחר'
    };
    return categories[category] || category;
  };

  const getAgreementText = (category: string) => {
    switch (category) {
      case 'consent_form':
        return `אני החתום/ה מטה מאשר/ת כי קראתי והבנתי את כל תנאי הטופס, והנני מסכים/ה לביצוע הפעולה המתוארת במסמך זה.

אני מצהיר/ה כי מסרתי מידע מלא ואמיתי על מצבי הרפואי, ואני מבין/ה את הסיכונים הכרוכים בפעולה.

אני נותן/ת בזאת את הסכמתי המלאה והמדעת לביצוע הפעולה.`;
      case 'health_declaration':
        return `אני החתום/ה מטה מצהיר/ה כי המידע שמסרתי בהצהרת הבריאות הוא נכון, מלא ומעודכן.

אני מתחייב/ת לעדכן על כל שינוי במצבי הרפואי או בתרופות שאני נוטל/ת.

אני מבין/ה כי הסתרת מידע רפואי עלולה לגרום לסיכון בביצוע הפעולה.`;
      default:
        return `אני החתום/ה מטה מאשר/ת כי קראתי והבנתי את תוכן המסמך, והנני מסכים/ה לכל האמור בו.`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען מסמך...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center p-6">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">מסמך לא נמצא</h2>
            <p className="text-muted-foreground">המסמך לא קיים או אין לך הרשאה לגשת אליו</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-8">
      <div className="container max-w-6xl mx-auto px-4" dir="rtl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            ← חזור לדף הראשי
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-right">{document.title || document.file_name}</CardTitle>
                  <CardDescription className="text-right">
                    תצוגה מקדימה ויצירת קישור חתימה
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right flex items-center gap-2">
                <Eye className="h-5 w-5" />
                תצוגה מקדימה של המסמך
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{getCategoryDisplay(document.category)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    נוצר: {new Date(document.created_at).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none text-right" dir="rtl">
                <h4 className="font-semibold mb-2">תוכן המסמך לחתימה:</h4>
                <div className="bg-white p-4 border rounded-lg min-h-[200px]">
                  {document.document_content ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {document.document_content}
                    </p>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">טרם הוזן תוכן למסמך זה</p>
                      <p className="text-xs">חזור למסך המסמכים וערוך את התוכן</p>
                    </div>
                  )}
                </div>
                
                {/* Show dynamic form if fields exist */}
                {formFields.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">תצוגה מקדימה של הטופס:</h4>
                    <div className="bg-white border rounded-lg">
                      <DynamicFormRenderer
                        fields={formFields}
                        onSubmit={() => {}}
                        disabled={true}
                        clientData={{
                          full_name: "שם הלקוח (דוגמה)",
                          id_number: "123456789"
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      <Settings className="h-4 w-4 inline ml-1" />
                      טרם הוגדרו שדות טופס
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      חזור למסך המסמכים ולחץ על האייקון הכחול לעריכת הטופס
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature Link Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                קישור לחתימה דיגיטלית
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-right block">קישור החתימה:</Label>
                <div className="flex gap-2">
                  <Input
                    value={signatureLink}
                    readOnly
                    className="bg-muted font-mono text-sm"
                    dir="ltr"
                  />
                  <Button
                    onClick={copySignatureLink}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  שלח קישור זה ללקוח בווצאטפ, SMS או אימייל
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-right block mb-2">פעולות:</Label>
                <div className="space-y-2">
                  <Button
                    onClick={openSignaturePage}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    צפה בעמוד החתימה
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const message = `היי,

אני שולח/ת אליך מסמך לחתימה: "${document.title || document.file_name}"

אנא לחץ על הקישור למטה כדי לפתוח ולחתום על המסמך:
${signatureLink}

תודה!`;
                      
                      const encodedMessage = encodeURIComponent(message);
                      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white"
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    שלח בווצאטפ
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-2">איך זה עובד?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• הלקוח יקבל קישור לעמוד חתימה מקצועי</li>
                  <li>• יוכל לראות את תוכן המסמך</li>
                  <li>• ימלא פרטים ויחתום דיגיטלית</li>
                  <li>• החתימה תישמר אוטומטית במערכת</li>
                  <li>• תקבל הודעה כשהמסמך נחתם</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;