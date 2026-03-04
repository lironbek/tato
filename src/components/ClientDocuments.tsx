import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Download, Trash2, Plus, Send, Eye, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  client_id: string | null;
  recipient_name: string | null;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

interface ClientDocumentsProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

const ClientDocuments: React.FC<ClientDocumentsProps> = ({ client, isOpen, onClose }) => {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [sendWhatsAppDialog, setSendWhatsAppDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  
  // Upload states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: "",
    description: "",
    category: "",
    isSigned: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchClientDocuments();
      fetchAvailableDocuments();
    }
  }, [isOpen, client.id]);

  const fetchClientDocuments = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client documents:', error);
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching client documents:', error);
    }
  };

  const fetchAvailableDocuments = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .is('client_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available documents:', error);
        return;
      }

      setAvailableDocuments(data || []);
    } catch (error) {
      console.error('Error fetching available documents:', error);
    }
  };

  const linkDocumentToClient = async () => {
    if (!selectedDocumentId) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('documents')
        .update({ client_id: client.id })
        .eq('id', selectedDocumentId);

      if (error) {
        toast.error('שגיאה בקישור המסמך ללקוח');
        return;
      }

      toast.success('המסמך נקשר ללקוח בהצלחה');
      setShowLinkDialog(false);
      setSelectedDocumentId("");
      fetchClientDocuments();
      fetchAvailableDocuments();
    } catch (error) {
      console.error('Error linking document:', error);
      toast.error('שגיאה בקישור המסמך');
    } finally {
      setLoading(false);
    }
  };

  const unlinkDocument = async (documentId: string) => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את הקישור למסמך זה?")) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ client_id: null })
        .eq('id', documentId);

      if (error) {
        toast.error('שגיאה בביטול קישור המסמך');
        return;
      }

      toast.success('קישור המסמך בוטל בהצלחה');
      fetchClientDocuments();
      fetchAvailableDocuments();
    } catch (error) {
      console.error('Error unlinking document:', error);
      toast.error('שגיאה בביטול הקישור');
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

  const openSendWhatsAppDialog = (document: DocumentType) => {
    setSelectedDocument(document);
    setSendWhatsAppDialog(true);
  };

  const sendDocumentToClient = async () => {
    if (!selectedDocument) return;

    try {
      // Create signature URL
      const signatureToken = `DOC-${Date.now()}`;
      const signatureUrl = `${window.location.origin}/sign/${signatureToken}`;

      const message = `היי ${client.full_name},

אני שולח/ת אליך את המסמך "${selectedDocument.title || selectedDocument.file_name}" לחתימה.

אנא לחץ על הקישור למטה כדי לפתוח ולחתום על המסמך:
${signatureUrl}

תודה!`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

      window.open(whatsappUrl, '_blank');

      await supabase
        .from('documents')
        .update({
          recipient_name: client.full_name,
          recipient_email: client.phone,
          signature_request_id: signatureToken,
          signature_url: signatureUrl
        })
        .eq('id', selectedDocument.id);

      toast.success('קישור ווצאטפ נפתח בהצלחה!');
      setSendWhatsAppDialog(false);
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error('שגיאה בשליחת המסמך');
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

  // Upload functions
  const sanitizeFileName = (fileName: string) => {
    return fileName
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '') || 'document';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadingFiles(files);
    setShowUploadDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadingFiles(files);
      setShowUploadDialog(true);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      setLoading(true);

      for (const file of uploadingFiles) {
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

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            client_id: client.id, // Auto-link to current client
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
            title: uploadFormData.title || file.name,
            description: uploadFormData.description,
            category: uploadFormData.category || null,
            is_signed: uploadFormData.isSigned,
            signed_date: uploadFormData.isSigned ? new Date().toISOString().split('T')[0] : null
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          toast.error(`שגיאה בשמירת ${file.name}: ${dbError.message}`);
          continue;
        }
      }

      toast.success('הקבצים הועלו בהצלחה!');
      setShowUploadDialog(false);
      setUploadingFiles([]);
      setUploadFormData({ title: "", description: "", category: "", isSigned: false });
      fetchClientDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>מסמכים של {client.full_name}</DialogTitle>
            <DialogDescription>
              נהל את המסמכים המתויקים ללקוח זה
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold">מסמכים מתויקים ({documents.length})</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <Upload className="ml-2 h-4 w-4" />
                  העלה מסמך
                </Button>
                <Button
                  onClick={() => setShowLinkDialog(true)}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  קשר מסמך
                </Button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">אין מסמכים מתויקים ללקוח זה</p>
              </div>
            ) : (
              <div className="overflow-x-auto" dir="ltr">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">שם הקובץ</TableHead>
                      <TableHead className="text-left">תאריך</TableHead>
                      <TableHead className="text-left">גודל</TableHead>
                      <TableHead className="text-left">קטגוריה</TableHead>
                      <TableHead className="text-left">סטטוס</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="text-left font-medium">
                          {doc.title || doc.file_name}
                        </TableCell>
                        <TableCell className="text-left">
                          {new Date(doc.created_at).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell className="text-left">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell className="text-left">
                          {getCategoryDisplay(doc.category)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc.is_signed ? "default" : "outline"}>
                            {doc.is_signed ? "חתום" : "לא חתום"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
                              onClick={() => unlinkDocument(doc.id)}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Document Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>קשר מסמך ללקוח</DialogTitle>
            <DialogDescription>
              בחר מסמך מהרשימה כדי לקשר אותו ללקוח {client.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מסמך מהרשימה" />
              </SelectTrigger>
              <SelectContent>
                {availableDocuments.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title || doc.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={linkDocumentToClient} 
              disabled={!selectedDocumentId || loading}
              className="bg-gradient-to-r from-primary to-accent"
            >
              קשר מסמך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלה מסמך חדש ל{client.full_name}</DialogTitle>
            <DialogDescription>
              העלה מסמכים חדשים שיתויקו אוטומטית ללקוח זה
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">גרור קבצים לכאן או לחץ לבחירה</p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOC, DOCX, JPG, PNG - עד 10MB לכל קובץ
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  בחר קבצים
                </label>
              </Button>
            </div>

            {/* Selected Files */}
            {uploadingFiles.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">קבצים נבחרים:</h4>
                <div className="space-y-2">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Document Details Form */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h5 className="font-medium">פרטי המסמכים:</h5>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">כותרת (אופציונלי)</Label>
                    <Input
                      id="title"
                      placeholder="כותרת המסמכים..."
                      value={uploadFormData.title}
                      onChange={(e) => setUploadFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">תיאור (אופציונלי)</Label>
                    <Textarea
                      id="description"
                      placeholder="תיאור המסמכים..."
                      value={uploadFormData.description}
                      onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">קטגוריה</Label>
                    <Select
                      value={uploadFormData.category}
                      onValueChange={(value) => setUploadFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר קטגוריה..." />
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isSigned"
                      checked={uploadFormData.isSigned}
                      onChange={(e) => setUploadFormData(prev => ({ ...prev, isSigned: e.target.checked }))}
                    />
                    <Label htmlFor="isSigned">המסמכים כבר חתומים</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={uploadFiles}
              disabled={uploadingFiles.length === 0 || loading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {loading ? "מעלה..." : "העלה מסמכים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send WhatsApp Dialog */}
      <Dialog open={sendWhatsAppDialog} onOpenChange={setSendWhatsAppDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>שלח מסמך בווצאטפ</DialogTitle>
            <DialogDescription>
              שלח את המסמך ללקוח {client.full_name} בווצאטפ
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p>המסמך ישלח ל: {client.full_name}</p>
            <p>מספר טלפון: {client.phone}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendWhatsAppDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={sendDocumentToClient}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Send className="ml-2 h-4 w-4" />
              שלח בווצאטפ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientDocuments;