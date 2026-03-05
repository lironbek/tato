import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, FileText, Calendar, User, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";
import { FormField } from "@/components/FormBuilder";
import { Canvas as FabricCanvas } from "fabric";

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
  const [visualFields, setVisualFields] = useState<any[]>([]);
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [visualFormData, setVisualFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const signatureCanvasRefs = useRef<Record<string, { canvas: FabricCanvas | null }>>({});

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
          let fields: any[] = [];
          if (typeof data.signature_positions === 'string') {
            fields = JSON.parse(data.signature_positions);
          } else if (Array.isArray(data.signature_positions)) {
            fields = data.signature_positions;
          }

          if (Array.isArray(fields) && fields.length > 0) {
            // Check if these are visual fields (have x/y coords) or FormBuilder fields
            const isVisual = fields[0].x !== undefined;
            console.log('Fields detected:', { isVisual, count: fields.length, hasContent: !!data.document_content });

            if (isVisual) {
              setVisualFields(fields);
              setIsVisualMode(true);
              // Pre-fill default values
              const prefilled: Record<string, string> = {};
              for (const f of fields) {
                if (f.defaultValue) {
                  prefilled[f.id] = f.defaultValue;
                }
              }
              setVisualFormData(prefilled);
            } else {
              console.log('Form fields detected:', fields);
              setFormFields(fields as FormField[]);
              setIsVisualMode(false);
            }
          } else {
            setFormFields([]);
            setVisualFields([]);
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

  const initSignatureCanvas = useCallback((fieldId: string, canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl || signatureCanvasRefs.current[fieldId]?.canvas) return;
    const fabricCanvas = new FabricCanvas(canvasEl, {
      isDrawingMode: true,
      width: canvasEl.parentElement?.clientWidth || 200,
      height: canvasEl.parentElement?.clientHeight || 60,
      backgroundColor: '#ffffff',
    });
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#000000';
    signatureCanvasRefs.current[fieldId] = { canvas: fabricCanvas };
  }, []);

  const handleVisualSubmit = async () => {
    if (!document) return;

    // Validate required fields
    for (const field of visualFields) {
      if (field.required) {
        if (field.type === 'signature' || field.type === 'initials') {
          const ref = signatureCanvasRefs.current[field.id];
          if (!ref?.canvas || ref.canvas.getObjects().length === 0) {
            toast.error(`השדה "${field.label}" הוא שדה חובה`);
            return;
          }
        } else {
          if (!visualFormData[field.id]?.trim()) {
            toast.error(`השדה "${field.label}" הוא שדה חובה`);
            return;
          }
        }
      }
    }

    try {
      setSigning(true);

      // Collect all field values
      const collectedData: Record<string, any> = {};
      for (const field of visualFields) {
        if (field.type === 'signature' || field.type === 'initials') {
          const ref = signatureCanvasRefs.current[field.id];
          if (ref?.canvas && ref.canvas.getObjects().length > 0) {
            collectedData[field.id] = ref.canvas.toDataURL({ format: 'png' });
          }
        } else {
          collectedData[field.id] = visualFormData[field.id] || '';
        }
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          is_signed: true,
          signed_date: new Date().toISOString().split('T')[0],
          signed_document_url: JSON.stringify(collectedData),
          recipient_name: visualFormData['client_name'] || document.recipient_name
        })
        .eq('id', document.id);

      if (updateError) throw updateError;

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

        {/* Visual Mode: document with positioned fields overlaid */}
        {isVisualMode ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-right">תוכן המסמך</CardTitle>
              <CardDescription className="text-right">
                מלא את השדות המסומנים על המסמך ולחץ "חתום ושלח"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">תאריך: {new Date(document.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">מספר מסמך: {document.signature_request_id}</span>
                </div>
              </div>

              {/* Document with overlaid interactive fields */}
              <div className="relative border rounded-lg bg-white" style={{ minHeight: '600px' }}>
                {document.document_content ? (
                  document.document_content.includes('<') ? (
                    <div
                      className="p-8 prose prose-sm max-w-none"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: document.document_content }}
                    />
                  ) : (
                    <div className="p-8" dir="rtl">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{document.document_content}</p>
                    </div>
                  )
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>מלא את השדות למטה</p>
                  </div>
                )}

                {/* Interactive fields at visual positions */}
                {visualFields.map((field) => {
                  const hasPrefilledValue = !!field.defaultValue;
                  const currentValue = visualFormData[field.id] || '';
                  const isPrefilledAndUnchanged = hasPrefilledValue && currentValue === field.defaultValue;

                  return (
                    <div
                      key={field.id}
                      className="absolute"
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}px`,
                        height: field.type === 'signature' || field.type === 'initials' ? `${field.height}px` : 'auto',
                        zIndex: 10,
                      }}
                    >
                      {(field.type === 'signature' || field.type === 'initials') ? (
                        <div className="border-2 border-blue-400 rounded bg-blue-50/80">
                          <div className="text-xs text-blue-600 px-1 font-medium">{field.label}{field.required && ' *'}</div>
                          <canvas
                            ref={(el) => initSignatureCanvas(field.id, el)}
                            style={{ width: '100%', height: `${field.height - 20}px` }}
                          />
                        </div>
                      ) : field.type === 'date' ? (
                        <div>
                          <label className="text-xs text-purple-600 font-medium">{field.label}{field.required && ' *'}</label>
                          <Input
                            type="date"
                            value={currentValue}
                            onChange={(e) => setVisualFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className={`h-8 text-sm border-purple-400 ${
                              isPrefilledAndUnchanged
                                ? 'bg-amber-50 border-amber-400 font-bold text-amber-900'
                                : 'bg-purple-50/80'
                            }`}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className={`text-xs font-medium ${
                            isPrefilledAndUnchanged ? 'text-amber-700' : 'text-green-600'
                          }`}>
                            {field.label}{field.required && ' *'}
                            {hasPrefilledValue && <span className="text-[10px] opacity-70 mr-1">(מולא מראש)</span>}
                          </label>
                          <Input
                            type="text"
                            value={currentValue}
                            onChange={(e) => setVisualFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className={`h-8 text-sm ${
                              isPrefilledAndUnchanged
                                ? 'bg-amber-50 border-amber-400 font-bold text-amber-900'
                                : 'border-green-400 bg-green-50/80'
                            }`}
                            placeholder={field.label}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={handleVisualSubmit}
                  disabled={signing}
                  className="bg-gradient-to-r from-primary to-accent px-8"
                  size="lg"
                >
                  {signing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full ml-2"></div>
                      חותם...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-2" />
                      חתום ושלח
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Document Content (plain text mode) */}
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
                      {document.document_content.includes('<') ? (
                        <div dangerouslySetInnerHTML={{ __html: document.document_content }} />
                      ) : (
                        <p className="whitespace-pre-line text-sm leading-relaxed">
                          {document.document_content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dynamic Form (FormBuilder-based) */}
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
              !isVisualMode && (
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
              )
            )}
          </>
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