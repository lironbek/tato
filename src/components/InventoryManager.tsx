import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Package, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InventoryItem {
  id: string;
  item_name: string;
  sku?: string;
  category?: string;
  current_stock: number;
  minimum_stock: number;
  cost_price?: number;
  selling_price?: number;
  supplier?: string;
  supplier_contact?: string;
  created_at: string;
  updated_at: string;
}

const InventoryManager = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    item_name: "",
    sku: "",
    category: "",
    current_stock: 0,
    minimum_stock: 0,
    cost_price: 0,
    selling_price: 0,
    supplier: "",
    supplier_contact: ""
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      toast.error("שגיאה בטעינת המלאי");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      if (editingItem) {
        const { error } = await supabase
          .from('inventory')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success("פריט עודכן בהצלחה");
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert({
            ...formData,
            user_id: user.id
          });

        if (error) throw error;
        toast.success("פריט נוסף בהצלחה");
      }

      setShowAddDialog(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error("שגיאה בשמירת הפריט");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק פריט זה?")) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("פריט נמחק בהצלחה");
      fetchItems();
    } catch (error) {
      toast.error("שגיאה במחיקת הפריט");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      sku: "",
      category: "",
      current_stock: 0,
      minimum_stock: 0,
      cost_price: 0,
      selling_price: 0,
      supplier: "",
      supplier_contact: ""
    });
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      sku: item.sku || "",
      category: item.category || "",
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      cost_price: item.cost_price || 0,
      selling_price: item.selling_price || 0,
      supplier: item.supplier || "",
      supplier_contact: item.supplier_contact || ""
    });
    setShowAddDialog(true);
  };

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_stock);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">ניהול מלאי</h2>
        <p className="text-muted-foreground">נהל את מלאי החנות בקלות ויעילות</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ פריטים</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מלאי נמוך</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ערך מלאי</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₪{items.reduce((sum, item) => sum + (item.current_stock * (item.cost_price || 0)), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive text-right">התראת מלאי נמוך</CardTitle>
            <CardDescription className="text-right">
              {lowStockItems.length} פריטים במלאי נמוך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-background rounded">
                  <Badge variant="destructive">{item.current_stock}/{item.minimum_stock}</Badge>
                  <span className="font-medium">{item.item_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-primary to-accent"
              onClick={() => {
                setEditingItem(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              הוסף פריט
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingItem ? "עריכת פריט" : "הוספת פריט חדש"}
              </DialogTitle>
              <DialogDescription className="text-right">
                {editingItem ? "ערוך את פרטי הפריט" : "הוסף פריט חדש למלאי"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name" className="text-right block">שם הפריט *</Label>
                  <Input
                    id="item_name"
                    value={formData.item_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                    required
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-right block">מק"ט</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-right block">קטגוריה</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock" className="text-right block">מלאי נוכחי *</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    required
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock" className="text-right block">מלאי מינימום *</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: parseInt(e.target.value) || 0 }))}
                    required
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price" className="text-right block">מחיר עלות</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price" className="text-right block">מחיר מכירה</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-right block">ספק</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_contact" className="text-right block">פרטי התקשרות ספק</Label>
                <Input
                  id="supplier_contact"
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact: e.target.value }))}
                  className="text-right"
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                  {editingItem ? "עדכן" : "הוסף"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש פריטים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </div>

      {/* Items Table */}
      <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-right">רשימת פריטי המלאי</CardTitle>
          <CardDescription className="text-right">
            {filteredItems.length} פריטים
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">טוען...</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">שם הפריט</TableHead>
                      <TableHead className="text-left">מק"ט</TableHead>
                      <TableHead className="text-left">קטגוריה</TableHead>
                      <TableHead className="text-left">מלאי</TableHead>
                      <TableHead className="text-left">מחיר עלות</TableHead>
                      <TableHead className="text-left">מחיר מכירה</TableHead>
                      <TableHead className="text-left">ספק</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-left">{item.item_name}</TableCell>
                        <TableCell className="text-left">{item.sku || "-"}</TableCell>
                        <TableCell className="text-left">{item.category || "-"}</TableCell>
                        <TableCell className="text-left">
                          <Badge
                            variant={item.current_stock <= item.minimum_stock ? "destructive" : "default"}
                          >
                            {item.current_stock}/{item.minimum_stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          {item.cost_price ? `₪${item.cost_price}` : "-"}
                        </TableCell>
                        <TableCell className="text-left">
                          {item.selling_price ? `₪${item.selling_price}` : "-"}
                        </TableCell>
                        <TableCell className="text-left">{item.supplier || "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          לא נמצאו פריטים
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="block sm:hidden p-3 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">לא נמצאו פריטים</div>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.current_stock <= item.minimum_stock;
                    const stockPercent = item.minimum_stock > 0 ? Math.min((item.current_stock / item.minimum_stock) * 100, 100) : 100;
                    return (
                      <div key={item.id} className={`border rounded-xl p-4 space-y-3 ${isLow ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card/50'}`}>
                        <div className="flex items-center justify-between">
                          <Badge variant={isLow ? "destructive" : "default"}>
                            {item.current_stock}/{item.minimum_stock}
                          </Badge>
                          <h3 className="font-semibold text-base">{item.item_name}</h3>
                        </div>
                        {/* Stock level indicator */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-green-500'}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{item.category || ""}</span>
                          <span>{item.cost_price ? `עלות: ₪${item.cost_price}` : ""}</span>
                        </div>
                        {item.supplier && (
                          <div className="text-xs text-muted-foreground text-right">ספק: {item.supplier}</div>
                        )}
                        <div className="flex gap-2 justify-end pt-1 border-t border-border/30">
                          <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;