import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, FileText, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";
import { FormField } from "@/components/FormBuilder";

interface DocumentData {
  id: string;
  title: string;
  description: string;
  category: string;
  recipient_name: string;
  signature_request_id: string;
  is_signed: boolean;
  file_name: string;
  created_at: string;
  document_content: string | null;
  signature_positions: any;
  clients?: {
    id: string;
    full_name: string;
    id_number: string;
    phone: string;
    email: string;
  };
}

const SignDocument = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchDocument();
    } else {
      setError('טוקן מסמך חסר');
      setLoading(false);
    }
  }, [token]);

  const fetchDocument = async () => {
    try {
      if (!token) {
        setError('טוקן מסמך חסר');
        return;
      }

      console.log('Fetching document with token:', token);

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          clients (
            id,
            full_name,
            id_number,
            phone,
            email
          )
        `)
        .eq('signature_request_id', token)
        .maybeSingle();

      if (error) {
        console.error('Database error:', error);
        setError('שגיאה בטעינת המסמך');
        return;
      }

      if (!data) {
        setError('מסמך לא נמצא או פג תוקף');
        return;
      }

      if (data.is_signed) {
        setDocument(data);
        return; // Will show signed message
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
            console.log('Parsed form fields:', fields);
            setFormFields(fields);
          } else {
            console.warn('Form fields is not an array:', fields);
            setFormFields([]);
          }
        } catch (parseError) {
          console.error('Error parsing form fields:', parseError);
          setFormFields([]);
        }
      } else {
        console.log('No signature positions found');
        setFormFields([]);
      }
      
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('שגיאה בטעינת המסמך');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    if (!document) return;

    try {
      setSigning(true);

      // Save form responses and mark as signed
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          is_signed: true,
          signed_date: new Date().toISOString().split('T')[0],
          signed_document_url: JSON.stringify(formData), // Store form responses
          recipient_name: formData.client_name || document.recipient_name
        })
        .eq('id', document.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('המסמך נחתם בהצלחה!');
      setDocument({ ...document, is_signed: true });
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('שגיאה בחתימת המסמך');
    } finally {
      setSigning(false);
    }
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

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center p-6">
            <FileText className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">שגיאה בטעינת המסמך</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'המסמך לא קיים או פג תוקף'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="mb-2"
            >
              נסה שוב
            </Button>
            <br />
            <Button 
              onClick={() => navigate('/')} 
              variant="ghost"
              size="sm"
            >
              חזור לדף הראשי
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document.is_signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="text-center p-6">
            <Check className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-green-600">מסמך נחתם בהצלחה</h2>
            <p className="text-muted-foreground">המסמך כבר נחתם ונשלח לעסק</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-8">
      <div className="container max-w-4xl mx-auto px-4" dir="rtl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-right">{document.title || document.file_name}</CardTitle>
                <CardDescription className="text-right">
                  {document.description}
                </CardDescription>
                {document.category && (
                  <Badge variant="outline" className="mt-1">{getCategoryDisplay(document.category)}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Document Content */}
        {document.document_content && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-right">תוכן המסמך</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">תאריך: {new Date(document.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-medium">מספר מסמך: {document.signature_request_id}</span>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none text-right mt-4" dir="rtl">
                <div className="bg-white p-4 border rounded-lg">
                  <p className="whitespace-pre-line text-sm leading-relaxed">
                    {document.document_content}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Form */}
        {formFields.length > 0 ? (
          <div className="mb-6">
            <DynamicFormRenderer
              fields={formFields}
              onSubmit={handleFormSubmit}
              disabled={signing}
              clientData={{
                full_name: document.clients?.full_name || document.recipient_name || undefined,
                id_number: document.clients?.id_number || undefined
              }}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="text-center p-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">לא הוגדר טופס</h3>
              <p className="text-muted-foreground mb-4">
                עדיין לא הוגדרו שדות עבור מסמך זה
              </p>
              <p className="text-sm text-muted-foreground">
                פנה לעסק כדי להשלים את הגדרת הטופס
              </p>
            </CardContent>
          </Card>
        )}

        {signing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-sm mx-4">
              <CardContent className="text-center p-6">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="font-medium">חותם מסמך...</p>
                <p className="text-sm text-muted-foreground mt-1">אנא המתן</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignDocument;