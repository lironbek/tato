import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration_minutes: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const ServicesManager = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    duration_minutes: ""
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        toast.error('שגיאה בטעינת השירותים');
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('שגיאה בטעינת השירותים');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast.error('נא למלא את השדות החובה');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category || null,
        price: parseFloat(formData.price),
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        user_id: user.id
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) {
          toast.error('שגיאה בעדכון השירות');
          return;
        }

        toast.success('השירות עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('services')
          .insert(serviceData);

        if (error) {
          toast.error('שגיאה ביצירת השירות');
          return;
        }

        toast.success('השירות נוצר בהצלחה');
      }

      setShowDialog(false);
      setEditingService(null);
      setFormData({ name: "", description: "", category: "", price: "", duration_minutes: "" });
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('שגיאה בשמירת השירות');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      price: service.price?.toString() || "",
      duration_minutes: service.duration_minutes?.toString() || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק שירות זה?")) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        toast.error('שגיאה במחיקת השירות');
        return;
      }

      toast.success('השירות נמחק בהצלחה');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('שגיאה במחיקת השירות');
    }
  };

  const handleNewService = () => {
    setEditingService(null);
    setFormData({ name: "", description: "", category: "", price: "", duration_minutes: "" });
    setShowDialog(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} שעות`;
    }
    return `${hours} שעות ${remainingMinutes} דקות`;
  };

  const getCategoryDisplay = (category: string) => {
    const categories: { [key: string]: string } = {
      tattoo: 'קעקועים',
      piercing: 'פירסינג',
      consultation: 'ייעוץ',
      touch_up: 'טאצ-אפ',
      removal: 'הסרה',
      other: 'אחר'
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען שירותים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">ניהול שירותים</h2>
          <p className="text-muted-foreground">נהל את השירותים והמחירים של העסק</p>
        </div>
        <Button onClick={handleNewService} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="ml-2 h-4 w-4" />
          שירות חדש
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין שירותים</h3>
            <p className="text-muted-foreground mb-4">
              התחל על ידי הוספת השירותים הראשונים שלך
            </p>
            <Button onClick={handleNewService} className="bg-gradient-to-r from-primary to-accent">
              <Plus className="ml-2 h-4 w-4" />
              הוסף שירות ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>רשימת שירותים ({services.length})</CardTitle>
            <CardDescription>כל השירותים הזמינים במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם השירות</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">מחיר</TableHead>
                    <TableHead className="text-right">משך זמן</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium text-right">
                        {service.name}
                      </TableCell>
                      <TableCell className="text-right max-w-xs">
                        <div className="truncate" title={service.description}>
                          {service.description || "אין תיאור"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {service.category ? (
                          <Badge variant="outline">
                            {getCategoryDisplay(service.category)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">לא צוין</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatPrice(service.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {service.duration_minutes ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 ml-1 text-muted-foreground" />
                            {formatDuration(service.duration_minutes)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">לא צוין</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-800"
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
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Service Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "עריכת שירות" : "שירות חדש"}
              </DialogTitle>
              <DialogDescription>
                {editingService 
                  ? "ערוך את פרטי השירות הקיים" 
                  : "הוסף שירות חדש למערכת"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם השירות *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="הכנס שם השירות..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">תיאור השירות</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תאר את השירות..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">קטגוריה</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tattoo">קעקועים</SelectItem>
                    <SelectItem value="piercing">פירסינג</SelectItem>
                    <SelectItem value="consultation">ייעוץ</SelectItem>
                    <SelectItem value="touch_up">טאצ-אפ</SelectItem>
                    <SelectItem value="removal">הסרה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">מחיר (₪) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">משך זמן (דקות)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="60"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                {editingService ? "עדכן שירות" : "הוסף שירות"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManager;