import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, X, File, Plus, Download, Eye, Trash2, Send, Edit, MousePointer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DocumentTextEditor from "./DocumentTextEditor";
import FormBuilder, { FormField } from "./FormBuilder";
import DocumentFieldMarker from "./DocumentFieldMarker";
// @ts-ignore - mammoth doesn't have proper types
import mammoth from "mammoth";

interface DocumentType {
  id: string;
  file_name: string;
  title: string;
  description: string;
  category: string;
  file_size: number;
  file_type: string;
  file_path: string;
  is_signed: boolean;
  signed_date: string | null;
  created_at: string;
  document_content: string | null;
  signature_positions: any;
}

const DocumentsManager = () => {
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendWhatsAppDialog, setSendWhatsAppDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentType | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [currentFormFields, setCurrentFormFields] = useState<FormField[]>([]);
  const [showFieldMarker, setShowFieldMarker] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [showNewFormBuilder, setShowNewFormBuilder] = useState(false);
  const [newFormData, setNewFormData] = useState({
    title: "",
    description: "",
    category: "consent_form"
  });
  const [whatsappForm, setWhatsappForm] = useState({
    clientId: "",
    clientPhone: "",
    clientName: "",
    documentNumber: "",
    message: "",
    generatedMessage: "",
    formattedPhone: ""
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    isSigned: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
      setUploadingFiles(files);
      setShowUploadForm(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > 0) {
      setUploadingFiles(files);
      setShowUploadForm(true);
    }
  };

  const sanitizeFileName = (fileName: string) => {
    // Remove non-ASCII characters and keep only English letters, numbers, dots, hyphens, and underscores
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace all non-ASCII characters with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    return sanitized || 'document';
  };

  const fetchDocuments = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      console.log('Fetching documents for user:', user.id);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        toast.error('שגיאה בטעינת המסמכים');
        return;
      }

      console.log('Documents fetched:', data);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('שגיאה בטעינת המסמכים');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone')
        .eq('user_id', user.id)
        .order('full_name');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const downloadDocument = async (doc: DocumentType) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) {
        toast.error('שגיאה בהורדת הקובץ');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        toast.error('שגיאה במחיקת המסמך');
        return;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('המסמך נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('שגיאה במחיקת המסמך');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const openSendWhatsAppDialog = (document: DocumentType) => {
    setSelectedDocument(document);
    setWhatsappForm({
      clientId: "",
      clientPhone: "",
      clientName: "",
      documentNumber: `DOC-${Date.now()}`,
      message: `היי,

אני שולח/ת אליך את המסמך "${document.title || document.file_name}" לחתימה.

אנא לחץ על הקישור למטה כדי לפתוח ולחתום על המסמך:
[הקישור יתווסף אוטומטי]

תודה!`,
      generatedMessage: "",
      formattedPhone: ""
    });
    setSendWhatsAppDialog(true);
  };

  const openTextEditor = (document: DocumentType) => {
    setEditingDocument(document);
    setShowTextEditor(true);
  };

  const handleTextSave = (content: string) => {
    if (editingDocument) {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === editingDocument.id 
            ? { ...doc, document_content: content }
            : doc
        )
      );
    }
  };

  const openFieldMarker = (document: DocumentType) => {
    setEditingDocument(document);
    // Parse existing visual fields
    let existingFields: any[] = [];
    if (document.signature_positions) {
      try {
        const parsed = typeof document.signature_positions === 'string'
          ? JSON.parse(document.signature_positions)
          : document.signature_positions;
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].x !== undefined) {
          existingFields = parsed;
        }
      } catch (e) {
        console.log('Error parsing visual fields:', e);
      }
    }
    setCurrentFormFields(existingFields as any);
    setShowFieldMarker(true);
  };

  const handleFieldMarkerSave = async (fields: any[]) => {
    if (!editingDocument) return;
    try {
      const { error } = await supabase
        .from('documents')
        .update({ signature_positions: JSON.stringify(fields) })
        .eq('id', editingDocument.id);
      if (error) {
        toast.error('שגיאה בשמירת השדות');
        return;
      }
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === editingDocument.id
            ? { ...doc, signature_positions: JSON.stringify(fields) }
            : doc
        )
      );
      fetchDocuments();
    } catch (error) {
      console.error('Error saving visual fields:', error);
      toast.error('שגיאה בשמירת השדות');
    }
  };

  const hasHtmlContent = (doc: DocumentType) => {
    return doc.document_content && doc.document_content.includes('<');
  };

  const openFormBuilder = (document: DocumentType) => {
    setEditingDocument(document);
    
    // Parse existing form fields if any
    let existingFields: FormField[] = [];
    if (document.signature_positions) {
      try {
        // signature_positions is already parsed JSON from Supabase
        if (typeof document.signature_positions === 'string') {
          existingFields = JSON.parse(document.signature_positions);
        } else {
          existingFields = document.signature_positions;
        }
        
        // Ensure it's an array
        if (!Array.isArray(existingFields)) {
          existingFields = [];
        }
      } catch (e) {
        console.log('Error parsing form fields:', e);
        existingFields = [];
      }
    }
    
    setCurrentFormFields(existingFields);
    setShowFormBuilder(true);
  };

  const handleFormSave = async (fields: FormField[]) => {
    if (!editingDocument) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Update document with form fields
      const { error } = await supabase
        .from('documents')
        .update({
          signature_positions: JSON.stringify(fields)
        })
        .eq('id', editingDocument.id);

      if (error) {
        toast.error('שגיאה בשמירת הטופס');
        return;
      }

      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === editingDocument.id 
            ? { ...doc, signature_positions: JSON.stringify(fields) }
            : doc
        )
      );

      toast.success('הטופס נשמר בהצלחה');
      fetchDocuments();
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('שגיאה בשמירת הטופס');
    }
  };

  const handleNewFormSave = async (fields: FormField[]) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Create new document record with form fields
      const { error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: `${newFormData.title || 'טופס-חדש'}.form`,
          file_path: `forms/${user.id}/${Date.now()}-${(newFormData.title || 'form').replace(/[^a-zA-Z0-9]/g, '_')}.json`,
          file_size: JSON.stringify(fields).length,
          file_type: 'application/json',
          title: newFormData.title || 'טופס אינטרקטיבי חדש',
          description: newFormData.description || 'טופס שנוצר באמצעות בונה הטפסים',
          category: newFormData.category,
          is_signed: false,
          signature_positions: JSON.stringify(fields),
          document_content: null
        });

      if (error) {
        toast.error('שגיאה ביצירת הטופס');
        return;
      }

      // Reset form data
      setNewFormData({
        title: "",
        description: "",
        category: "consent_form"
      });

      toast.success('הטופס נוצר בהצלחה');
      fetchDocuments();
    } catch (error) {
      console.error('Error creating new form:', error);
      toast.error('שגיאה ביצירת הטופス');
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    if (selectedClient) {
      setWhatsappForm(prev => ({
        ...prev,
        clientId: clientId,
        clientName: selectedClient.full_name,
        clientPhone: selectedClient.phone || ""
      }));
    }
  };

  const sendDocumentToClient = async () => {
    if (!selectedDocument) return;

    try {
      if (!whatsappForm.clientPhone) {
        toast.error('מספר טלפון חסר');
        return;
      }

      setSendingWhatsApp(true);

      // Generate signature token
      const signatureToken = whatsappForm.documentNumber;

      // Update document with recipient info first
      await supabase
        .from('documents')
        .update({
          client_id: whatsappForm.clientId || null,
          recipient_email: whatsappForm.clientPhone,
          recipient_name: whatsappForm.clientName,
          signature_request_id: signatureToken,
          signature_url: `${window.location.origin}/sign/${signatureToken}`
        })
        .eq('id', selectedDocument.id);

      // Send via edge function
      const { data, error } = await supabase.functions.invoke('send-whatsapp-document', {
        body: {
          document_id: selectedDocument.id,
          recipient_phone: whatsappForm.clientPhone,
          recipient_name: whatsappForm.clientName,
          custom_message: whatsappForm.message
        }
      });

      if (error) {
        throw error;
      }

      toast.success('ההודעה נשלחה בהצלחה בווצאטפ!');
      setSendWhatsAppDialog(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('שגיאה בשליחת ההודעה. ודא שה-Green API מוגדר כראוי.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchClients();
  }, []);

  const uploadFiles = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      for (const file of uploadingFiles) {
        // Upload to storage with sanitized file name
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${user.id}/${Date.now()}-${sanitizedName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          toast.error(`שגיאה בהעלאת ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Convert .docx to HTML if applicable
        let documentContent: string | null = null;
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'docx' || file.type.includes('wordprocessingml.document')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            documentContent = result.value;
            if (result.messages?.length) {
              console.log('Mammoth conversion messages:', result.messages);
            }
          } catch (convErr) {
            console.error('Error converting docx to HTML:', convErr);
          }
        }

        // Save to database with conflict handling
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
            title: formData.title || file.name,
            description: formData.description,
            category: formData.category || null,
            is_signed: formData.isSigned,
            signed_date: formData.isSigned ? new Date().toISOString().split('T')[0] : null,
            document_content: documentContent
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          // If conflict, try to clean up the uploaded file
          if (dbError.code === '23505') { // Unique constraint violation
            await supabase.storage.from('documents').remove([uploadData.path]);
            toast.error(`קובץ ${file.name} כבר קיים במערכת`);
          } else {
            toast.error(`שגיאה בשמירת ${file.name}: ${dbError.message}`);
          }
        } else {
          toast.success(`${file.name} הועלה בהצלחה`);
        }
      }

      // Reset form
      setUploadingFiles([]);
      setShowUploadForm(false);
      setFormData({
        title: "",
        description: "",
        category: "",
        isSigned: false
      });

      // Refresh documents list
      fetchDocuments();

    } catch (error) {
      toast.error("שגיאה בהעלאת הקבצים");
      console.error(error);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return <File className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">ניהול מסמכים</h2>
        <p className="text-muted-foreground">העלה וארגן מסמכים חשובים של העסק</p>
      </div>

      {/* Documents Table */}
      <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-right">מסמכים שמורים</CardTitle>
          <CardDescription className="text-right">
            {documents.length} מסמכים במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">טוען מסמכים...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">לא נמצאו מסמכים</p>
            </div>
          ) : (
            <div className="overflow-x-auto" dir="rtl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם הקובץ</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">גודל</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-right font-medium">
                        {doc.title || doc.file_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(doc.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-right">
                        {getCategoryDisplay(doc.category)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.is_signed ? "default" : "outline"}>
                          {doc.is_signed ? "חתום" : "לא חתום"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          <div className="flex gap-2">
                            {doc.document_content && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openFieldMarker(doc)}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="סימון שדות על המסמך (חתימה, טקסט, תאריך)"
                              >
                                <MousePointer className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFormBuilder(doc)}
                              className="text-blue-600 hover:text-blue-800"
                              title="עריכת טופס חתימה"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTextEditor(doc)}
                              className="text-purple-600 hover:text-purple-800"
                              title="ערוך תוכן המסמך"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/document-preview/${doc.id}`, '_blank')}
                              className="text-green-600 hover:text-green-800"
                              title="תצוגה מקדימה ויצירת קישור חתימה"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSendWhatsAppDialog(doc)}
                              className="text-blue-600 hover:text-blue-800"
                              title="שלח בווצאטפ (מתקדם)"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id, doc.file_path)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!showUploadForm ? (
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardContent className="p-12">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">העלה מסמכים</h3>
              <p className="text-muted-foreground mb-6">
                גרור ושחרר קבצים כאן או לחץ לבחירת קבצים
              </p>
              <div className="space-x-4 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:space-x-4">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  בחר קבצים
                </Button>
                <Button 
                  onClick={() => setShowNewFormBuilder(true)}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  צור טופס אינטרקטיבי
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* File Preview */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right">קבצים להעלאה</CardTitle>
              <CardDescription className="text-right">
                {uploadingFiles.length} קבצים נבחרו
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadingFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {getFileTypeIcon(file.name)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload Form */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right">פרטי המסמכים</CardTitle>
              <CardDescription className="text-right">
                הוסף מידע נוסף על המסמכים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-right block">כותרת</Label>
                <Input
                  id="title"
                  placeholder="כותרת למסמכים..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-right block">תיאור</Label>
                <Textarea
                  id="description"
                  placeholder="תיאור המסמך..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-right resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block">קטגוריה</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health_declaration">הצהרת בריאות</SelectItem>
                    <SelectItem value="consent_form">טופס הסכמה</SelectItem>
                    <SelectItem value="aftercare">הוראות טיפוח</SelectItem>
                    <SelectItem value="contract">חוזה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <Badge 
                  variant={formData.isSigned ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, isSigned: !prev.isSigned }))}
                >
                  מסמך חתום
                </Badge>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadingFiles([]);
                  }}
                >
                  ביטול
                </Button>
                <Button 
                  onClick={uploadFiles}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  העלה מסמכים
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send WhatsApp Dialog */}
      <Dialog open={sendWhatsAppDialog} onOpenChange={setSendWhatsAppDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>שלח מסמך בווצאטפ</DialogTitle>
            <DialogDescription>
              מלא את הפרטים וישלח קישור למסמך בווצאטפ לחתימה
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientSelect" className="text-right">
                בחר לקוח
              </Label>
              <Select
                value={whatsappForm.clientId}
                onValueChange={handleClientSelect}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="בחר לקוח מהרשימה" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientName" className="text-right">
                שם הלקוח
              </Label>
              <Input
                id="clientName"
                value={whatsappForm.clientName}
                onChange={(e) => setWhatsappForm(prev => ({ ...prev, clientName: e.target.value }))}
                className="col-span-3"
                placeholder="הכנס שם הלקוח"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientPhone" className="text-right">
                מספר טלפון
              </Label>
              <Input
                id="clientPhone"
                type="tel"
                value={whatsappForm.clientPhone}
                onChange={(e) => setWhatsappForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                className="col-span-3"
                placeholder="972501234567"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documentNumber" className="text-right">
                מספר מסמך
              </Label>
              <Input
                id="documentNumber"
                value={whatsappForm.documentNumber}
                onChange={(e) => setWhatsappForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                className="col-span-3"
                placeholder="DOC-123456"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                הודעה
              </Label>
              <Textarea
                id="message"
                value={whatsappForm.message}
                onChange={(e) => setWhatsappForm(prev => ({ ...prev, message: e.target.value }))}
                className="col-span-3"
                rows={4}
                placeholder="הודעה אישית ללקוח..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSendWhatsAppDialog(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={sendDocumentToClient}
              disabled={!whatsappForm.clientPhone || !whatsappForm.clientName || sendingWhatsApp}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {sendingWhatsApp ? (
                <>
                  <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full ml-2"></div>
                  שולח...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  שלח בווצאטפ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Document Text Editor */}
      {editingDocument && (
        <DocumentTextEditor
          documentId={editingDocument.id}
          currentContent={editingDocument.document_content || ""}
          isOpen={showTextEditor}
          onClose={() => setShowTextEditor(false)}
          onSave={handleTextSave}
        />
      )}

      {/* Form Builder */}
      {editingDocument && (
        <FormBuilder
          isOpen={showFormBuilder}
          onClose={() => setShowFormBuilder(false)}
          onSave={handleFormSave}
          initialFields={currentFormFields}
          documentTitle={editingDocument.title || editingDocument.file_name}
        />
      )}

      {/* Visual Field Marker */}
      {editingDocument && editingDocument.document_content && (
        <DocumentFieldMarker
          isOpen={showFieldMarker}
          onClose={() => setShowFieldMarker(false)}
          onSave={handleFieldMarkerSave}
          documentContent={
            editingDocument.document_content.includes('<')
              ? editingDocument.document_content
              : `<div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px;">${editingDocument.document_content}</div>`
          }
          initialFields={currentFormFields as any}
          documentTitle={editingDocument.title || editingDocument.file_name}
        />
      )}

      {/* New Form Builder */}
      <FormBuilder
        isOpen={showNewFormBuilder}
        onClose={() => setShowNewFormBuilder(false)}
        onSave={handleNewFormSave}
        initialFields={[]}
        documentTitle="טופס חדש"
      />
    </div>
  );
};

export default DocumentsManager;