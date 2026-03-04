import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Camera, X, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GalleryItem {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  title?: string;
  description?: string;
  work_type?: string;
  body_part?: string;
  style?: string;
  is_portfolio: boolean;
  is_public: boolean;
  created_at: string;
}

const GalleryManager = () => {
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    workType: "",
    bodyPart: "",
    style: "",
    isPortfolio: false,
    isPublic: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error fetching gallery items:', error);
      toast.error('שגיאה בטעינת הגלריה');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('gallery')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const deleteGalleryItem = async (item: GalleryItem) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את "${item.title || item.file_name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('gallery')
        .remove([item.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('gallery')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      toast.success('התמונה נמחקה בהצלחה');
      fetchGalleryItems(); // Refresh the gallery
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      toast.error('שגיאה במחיקת התמונה');
    }
  };

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

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setUploadingFiles(files);
      setShowUploadForm(true);
    } else {
      toast.error("אנא בחר קבצי תמונה בלבד");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setUploadingFiles(files);
      setShowUploadForm(true);
    }
  };

  const uploadFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      for (const file of uploadingFiles) {
        // Upload to storage
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`שגיאה בהעלאת ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Save to database
        const { error: dbError } = await supabase
          .from('gallery')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            title: formData.title || file.name,
            description: formData.description,
            work_type: formData.workType || null,
            body_part: formData.bodyPart || null,
            style: formData.style || null,
            is_portfolio: formData.isPortfolio,
            is_public: formData.isPublic
          });

        if (dbError) {
          toast.error(`שגיאה בשמירת ${file.name}: ${dbError.message}`);
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
        workType: "",
        bodyPart: "",
        style: "",
        isPortfolio: false,
        isPublic: false
      });
      
      // Refresh gallery
      fetchGalleryItems();

    } catch (error) {
      toast.error("שגיאה בהעלאת הקבצים");
      console.error(error);
    }
  };

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold mb-2">גלריית עבודות</h2>
        <p className="text-muted-foreground">העלה וארגן את תמונות העבודות שלך</p>
      </div>

      {!showUploadForm ? (
        <>
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
                <Camera className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">העלה תמונות לגלריה</h3>
                <p className="text-muted-foreground mb-6">
                  גרור ושחרר תמונות כאן או לחץ לבחירת קבצים
                </p>
                <div className="space-x-4">
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    בחר תמונות
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gallery Grid */}
          {loading ? (
            <div className="text-center py-8">טוען...</div>
          ) : galleryItems.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item) => (
                <Card key={item.id} className="bg-gradient-card border-border/50 backdrop-blur-sm overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={getImageUrl(item.file_path)}
                      alt={item.title || item.file_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {item.is_portfolio && (
                        <Badge variant="secondary" className="text-xs">
                          תיק עבודות
                        </Badge>
                      )}
                      {item.is_public && (
                        <Badge variant="outline" className="text-xs">
                          ציבורי
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-right mb-2">
                      {item.title || item.file_name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground text-right mb-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGalleryItem(item)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="text-right">
                        {item.work_type && <span className="block">סוג: {item.work_type}</span>}
                        {item.body_part && <span className="block">איבר: {item.body_part}</span>}
                        {item.style && <span className="block">סגנון: {item.style}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">אין תמונות בגלריה</h3>
                <p className="text-muted-foreground">
                  העלה תמונות כדי להתחיל לבנות את הגלריה שלך
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* File Preview */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right">תמונות להעלאה</CardTitle>
              <CardDescription className="text-right">
                {uploadingFiles.length} תמונות נבחרו
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
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload Form */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right">פרטי התמונות</CardTitle>
              <CardDescription className="text-right">
                הוסף מידע נוסף על התמונות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-right block">כותרת</Label>
                <Input
                  id="title"
                  placeholder="כותרת לתמונות..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-right block">תיאור</Label>
                <Textarea
                  id="description"
                  placeholder="תיאור העבודה..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-right resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-right block">סוג עבודה</Label>
                  <Select value={formData.workType} onValueChange={(value) => setFormData(prev => ({ ...prev, workType: value }))}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר סוג עבודה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tattoo">קעקוע</SelectItem>
                      <SelectItem value="piercing">פירסינג</SelectItem>
                      <SelectItem value="design">עיצוב</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-right block">איבר גוף</Label>
                  <Input
                    placeholder="זרוע, רגל, גב..."
                    value={formData.bodyPart}
                    onChange={(e) => setFormData(prev => ({ ...prev, bodyPart: e.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-right block">סגנון</Label>
                <Input
                  placeholder="ריאליסטי, מסורתי, מינימליסטי..."
                  value={formData.style}
                  onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="flex space-x-4 justify-center">
                <Badge 
                  variant={formData.isPortfolio ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, isPortfolio: !prev.isPortfolio }))}
                >
                  לתיק עבודות
                </Badge>
                <Badge 
                  variant={formData.isPublic ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                >
                  ציבורי
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
                  העלה תמונות
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GalleryManager;