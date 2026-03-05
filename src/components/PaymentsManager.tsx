import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, CreditCard, Search, Edit, Trash2, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  client_id: string;
  appointment_id?: string;
  work_order_id?: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    full_name: string;
    phone: string;
  };
  work_orders?: {
    work_order_number: string;
  };
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

interface WorkOrder {
  id: string;
  work_order_number: string;
}

const PaymentsManager = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    work_order_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    payment_status: "completed",
    notes: ""
  });

  useEffect(() => {
    fetchPayments();
    fetchClients();
    fetchWorkOrders();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients (
            full_name,
            phone
          ),
          work_orders (
            work_order_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      toast.error("שגיאה בטעינת התשלומים");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("שגיאה בטעינת הלקוחות:", error);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('work_orders')
        .select('id, work_order_number')
        .eq('user_id', user.id)
        .order('work_order_number');

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error("שגיאה בטעינת הזמנות העבודה:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's a work order linked and validate payment amount
    if (formData.work_order_id) {
      try {
        const { data: workOrderData, error: woError } = await supabase
          .from('work_orders')
          .select('estimated_price')
          .eq('id', formData.work_order_id)
          .single();
          
        if (!woError && workOrderData) {
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('work_order_id', formData.work_order_id)
            .eq('payment_status', 'completed');
            
          if (!paymentsError) {
            const totalPaid = (paymentsData || []).reduce((sum, p) => sum + p.amount, 0);
            const remaining = workOrderData.estimated_price - totalPaid;
            
            if (formData.amount > remaining) {
              toast.error(`לא ניתן לשלם יותר מהיתרה הנותרת: ₪${remaining.toLocaleString()}`);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error validating payment amount:', error);
      }
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update({
            ...formData,
            amount: formData.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast.success("תשלום עודכן בהצלחה");
      } else {
        const { error } = await supabase
          .from('payments')
          .insert({
            ...formData,
            amount: formData.amount,
            user_id: user.id
          });

        if (error) throw error;
        
        // Check if this payment completes a work order
        if (formData.work_order_id) {
          const { data: workOrderData, error: woError } = await supabase
            .from('work_orders')
            .select('estimated_price')
            .eq('id', formData.work_order_id)
            .single();
            
          if (!woError && workOrderData) {
            const { data: paymentsData, error: paymentsError } = await supabase
              .from('payments')
              .select('amount')
              .eq('work_order_id', formData.work_order_id)
              .eq('payment_status', 'completed');
              
            if (!paymentsError) {
              const totalPaid = (paymentsData || []).reduce((sum, p) => sum + p.amount, 0) + formData.amount;
              
              if (totalPaid >= workOrderData.estimated_price) {
                // Update work order status to completed
                await supabase
                  .from('work_orders')
                  .update({ status: 'completed' })
                  .eq('id', formData.work_order_id);
                  
                toast.success("תשלום נוסף בהצלחה וההזמנה הושלמה!");
              } else {
                toast.success("תשלום נוסף בהצלחה");
              }
            }
          }
        } else {
          toast.success("תשלום נוסף בהצלחה");
        }
      }

      setShowAddDialog(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
    } catch (error) {
      toast.error("שגיאה בשמירת התשלום");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תשלום זה?")) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("תשלום נמחק בהצלחה");
      fetchPayments();
    } catch (error) {
      toast.error("שגיאה במחיקת התשלום");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      work_order_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
      payment_status: "completed",
      notes: ""
    });
  };

  const startEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      client_id: payment.client_id,
      work_order_id: payment.work_order_id || "",
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method || "cash",
      payment_status: payment.payment_status,
      notes: payment.notes || ""
    });
    setShowAddDialog(true);
  };

  const filteredPayments = payments.filter(payment =>
    payment.clients?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amount.toString().includes(searchTerm)
  );

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const thisMonthPayments = payments.filter(payment => 
    new Date(payment.payment_date).getMonth() === new Date().getMonth()
  );
  const thisMonthTotal = thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">הושלם</Badge>;
      case 'pending':
        return <Badge variant="secondary">ממתין</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">בוטל</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'מזומן';
      case 'card': return 'אשראי';
      case 'bank_transfer': return 'העברה בנקאית';
      case 'check': return 'שיק';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">ניהול תשלומים</h2>
        <p className="text-muted-foreground">עקוב אחר כל התשלומים וההכנסות</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ תשלומים</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {payments.length} תשלומים
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">החודש</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{thisMonthTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {thisMonthPayments.length} תשלומים החודש
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממוצע תשלום</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₪{payments.length > 0 ? Math.round(totalAmount / payments.length).toLocaleString() : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-primary to-accent"
              onClick={() => {
                setEditingPayment(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              הוסף תשלום
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingPayment ? "עריכת תשלום" : "הוספת תשלום חדש"}
              </DialogTitle>
              <DialogDescription className="text-right">
                {editingPayment ? "ערוך את פרטי התשלום" : "הוסף תשלום חדש למערכת"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id" className="text-right block">לקוח *</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר לקוח" />
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

              <div className="space-y-2">
                <Label htmlFor="work_order_id" className="text-right block">הזמנת עבודה</Label>
                <Select value={formData.work_order_id} onValueChange={(value) => setFormData(prev => ({ ...prev, work_order_id: value }))}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר הזמנת עבודה (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrders.map((workOrder) => (
                      <SelectItem key={workOrder.id} value={workOrder.id}>
                        {workOrder.work_order_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-right block">סכום *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    required
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_date" className="text-right block">תאריך תשלום *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    required
                    className="text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-right block">אמצעי תשלום</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">מזומן</SelectItem>
                      <SelectItem value="card">כרטיס אשראי</SelectItem>
                      <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                      <SelectItem value="check">שיק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">סטטוס</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}>
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-right block">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="text-right resize-none"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                  {editingPayment ? "עדכן" : "הוסף"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש תשלומים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-right">רשימת התשלומים</CardTitle>
          <CardDescription className="text-right">
            {filteredPayments.length} תשלומים
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
                      <TableHead className="text-left">לקוח</TableHead>
                      <TableHead className="text-left">הזמנת עבודה</TableHead>
                      <TableHead className="text-left">תאריך</TableHead>
                      <TableHead className="text-left">סכום</TableHead>
                      <TableHead className="text-left">אמצעי תשלום</TableHead>
                      <TableHead className="text-left">סטטוס</TableHead>
                      <TableHead className="text-left">הערות</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium text-left">
                          {payment.clients?.full_name || "לא ידוע"}
                        </TableCell>
                        <TableCell className="text-left">
                          {payment.work_orders?.work_order_number || "-"}
                        </TableCell>
                        <TableCell className="text-left">
                          {new Date(payment.payment_date).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell className="font-medium text-left">
                          ₪{payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-left">
                          {getPaymentMethodLabel(payment.payment_method || "")}
                        </TableCell>
                        <TableCell className="text-left">
                          {getStatusBadge(payment.payment_status)}
                        </TableCell>
                        <TableCell className="text-left max-w-xs truncate">
                          {payment.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(payment)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          לא נמצאו תשלומים
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="block sm:hidden p-3 space-y-3">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">לא נמצאו תשלומים</div>
                ) : (
                  filteredPayments.map((payment) => (
                    <div key={payment.id} className="border border-border/50 rounded-xl p-4 space-y-3 bg-card/50">
                      <div className="flex items-center justify-between">
                        {getStatusBadge(payment.payment_status)}
                        <h3 className="font-semibold text-base">{payment.clients?.full_name || "לא ידוע"}</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString('he-IL')}
                        </span>
                        <span className="text-lg font-bold text-green-600">₪{payment.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{payment.work_orders?.work_order_number || ""}</span>
                        <span>{getPaymentMethodLabel(payment.payment_method || "")}</span>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground text-right truncate">{payment.notes}</p>
                      )}
                      <div className="flex gap-2 justify-end pt-1 border-t border-border/30">
                        <Button size="sm" variant="outline" onClick={() => startEdit(payment)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(payment.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsManager;