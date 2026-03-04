import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Upload, Save, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
// @ts-ignore - mammoth doesn't have proper types
import mammoth from "mammoth";

interface DocumentTextEditorProps {
  documentId: string;
  currentContent: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
}

const DocumentTextEditor: React.FC<DocumentTextEditorProps> = ({
  documentId,
  currentContent,
  isOpen,
  onClose,
  onSave
}) => {
  const [content, setContent] = useState(currentContent);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromFile = async (file: File) => {
    setExtracting(true);
    try {
      const fileType = file.type;
      let extractedText = "";

      if (fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
          fileType.includes('application/msword')) {
        // Word document
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } 
      else if (fileType === 'text/plain') {
        // Plain text file
        extractedText = await file.text();
      }
      else if (fileType === 'application/pdf') {
        // For PDF files, we'll show a message since pdf-parse requires Node.js
        toast.error('קבצי PDF אינם נתמכים כרגע. אנא העתק את הטקסט ידנית או שמור כ-Word');
        return;
      }
      else {
        toast.error('סוג קובץ לא נתמך. נתמכים: Word (.docx), טקסט רגיל (.txt)');
        return;
      }

      if (extractedText.trim()) {
        setContent(extractedText);
        toast.success('הטקסט חולץ בהצלחה מהקובץ!');
      } else {
        toast.error('לא נמצא טקסט בקובץ');
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error('שגיאה בחילוץ הטקסט מהקובץ');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      extractTextFromFile(file);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('יש להזין תוכן למסמך');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_content: content.trim() })
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      toast.success('תוכן המסמך נשמר בהצלחה!');
      onSave(content.trim());
      onClose();
    } catch (error) {
      console.error('Error saving document content:', error);
      toast.error('שגיאה בשמירת תוכן המסמך');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            עריכת תוכן המסמך
          </DialogTitle>
          <DialogDescription>
            הזן או חלץ את תוכן המסמך שיוצג ללקוח לחתימה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                חילוץ טקסט מקובץ
              </CardTitle>
              <CardDescription>
                העלה קובץ Word או טקסט כדי לחלץ את התוכן אוטומטית
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
                  variant="outline"
                  className="flex-1"
                >
                  {extracting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full ml-2"></div>
                      מחלץ טקסט...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 ml-2" />
                      בחר קובץ לחילוץ טקסט
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                נתמכים: Word (.docx, .doc), טקסט רגיל (.txt)
              </p>
            </CardContent>
          </Card>

          {/* Manual Text Input */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-right block">
              תוכן המסמך לחתימה
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="הזן את תוכן המסמך כאן, או חלץ מקובץ למעלה..."
              className="min-h-[400px] font-mono text-sm"
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground">
              תוכן זה יוצג ללקוח לפני החתימה. כתב בצורה ברורה ומקצועית.
            </p>
          </div>

          {/* Preview */}
          {content.trim() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">תצוגה מקדימה</CardTitle>
                <CardDescription>
                  כך יראה התוכן ללקוח
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 border rounded-lg max-h-40 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !content.trim()}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full ml-2"></div>
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                שמור תוכן
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentTextEditor;