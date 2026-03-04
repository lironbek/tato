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
import { Plus, Edit, Trash2, Eye, FileText, Calendar, User, Printer, Clock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WorkOrderPrint from "@/components/WorkOrderPrint";
// Remove the mock auth import

interface WorkOrder {
  id: string;
  work_order_number: string;
  client_id: string;
  service_id: string;
  artist_id: string | null;
  work_description: string | null;
  estimated_price: number;
  final_price: number | null;
  estimated_duration: number | null;
  work_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'partially_paid';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
  email?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Artist {
  id: string;
  full_name: string;
  nickname: string;
}

const WorkOrderManager = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<WorkOrder | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [appointmentWorkOrder, setAppointmentWorkOrder] = useState<WorkOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentWorkOrder, setPaymentWorkOrder] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    artist_id: "",
    work_description: "",
    estimated_price: "",
    final_price: "",
    estimated_duration: "",
    work_date: "",
    status: "pending" as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'partially_paid',
    notes: ""
  });

  const [appointmentFormData, setAppointmentFormData] = useState({
    client_id: "",
    service_id: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "",
    status: "scheduled",
    artist_id: "",
    notes: ""
  });

  const [paymentFormData, setPaymentFormData] = useState({
    client_id: "",
    work_order_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    payment_status: "completed",
    notes: ""
  });

  useEffect(() => {
    Promise.all([
      fetchWorkOrders(),
      fetchClients(),
      fetchServices(),
      fetchArtists(),
      fetchPayments()
    ]);
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('work_orders' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work orders:', error);
        // If table doesn't exist yet, just show empty state
        if (error.code === 'PGRST116' || error.message.includes('relation "work_orders" does not exist')) {
          setWorkOrders([]);
          return;
        }
        toast.error('שגיאה בטעינת הזמנות העבודה');
        return;
      }

      // Type assertion to ensure data is properly typed
      const orders: WorkOrder[] = (data as unknown) as WorkOrder[];
      setWorkOrders(orders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Fetching clients for user:', user.id);
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, address, email')
        .eq('user_id', user.id)
        .order('full_name');

      console.log('Clients query result:', { data, error });
      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }
      setClients(data || []);
      console.log('Set clients:', data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('user_id', user.id)
        .order('name');

      if (error) return;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetching artists for user:', user?.id);
      if (!user) return;

      const { data, error } = await supabase
        .from('artists')
        .select('id, full_name, nickname')
        .eq('user_id', user.id)
        .order('full_name');

      console.log('Artists query result:', { data, error });
      if (error) {
        console.error('Error fetching artists:', error);
        return;
      }
      setArtists(data || []);
      console.log('Set artists:', data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const getOrderPaymentInfo = (orderId: string, estimatedPrice: number) => {
    const orderPayments = payments.filter(p => p.work_order_id === orderId && p.payment_status === 'completed');
    const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = estimatedPrice - totalPaid;
    
    return {
      totalPaid,
      remaining,
      isFullyPaid: remaining <= 0,
      isPartiallyPaid: totalPaid > 0 && remaining > 0,
      hasPayments: totalPaid > 0
    };
  };

  const getOrderStatus = (order: WorkOrder) => {
    const paymentInfo = getOrderPaymentInfo(order.id, order.estimated_price);
    
    if (order.status === 'completed') return order.status;
    if (order.status === 'cancelled') return order.status;
    
    if (paymentInfo.isFullyPaid) return 'completed';
    if (paymentInfo.isPartiallyPaid) return 'partially_paid';
    
    return order.status;
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'לקוח לא נמצא';
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'שירות לא נמצא';
  };

  const getArtistName = (artistId: string | null) => {
    if (!artistId) return 'לא שויך';
    const artist = artists.find(a => a.id === artistId);
    return artist ? (artist.nickname || artist.full_name) : 'אמן לא נמצא';
  };

  const generateOrderNumber = async () => {
    // Get the count of existing work orders to generate next number starting from 1000
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'WO-1000';
    
    const { count } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const nextNumber = 1000 + (count || 0);
    return `WO-${nextNumber}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.service_id || !formData.work_date) {
      toast.error('נא למלא את השדות החובה');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get selected service details for auto-fill
      const selectedService = services.find(s => s.id === formData.service_id);
      
      const orderData = {
        work_order_number: editingOrder?.work_order_number || await generateOrderNumber(),
        client_id: formData.client_id,
        service_id: formData.service_id,
        artist_id: formData.artist_id || null,
        work_description: formData.work_description.trim() || null,
        estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : selectedService?.price || 0,
        final_price: formData.final_price ? parseFloat(formData.final_price) : null,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : selectedService?.duration_minutes || null,
        work_date: formData.work_date,
        status: formData.status,
        notes: formData.notes.trim() || null,
        user_id: user.id,
        created_by: user.id
      };

      let error;
      if (editingOrder) {
        ({ error } = await supabase
          .from('work_orders' as any)
          .update(orderData)
          .eq('id', editingOrder.id));
      } else {
        ({ error } = await supabase
          .from('work_orders' as any)
          .insert(orderData));
      }

      if (error) {
        console.error('Error saving work order:', error);
        toast.error('שגיאה בשמירת ההזמנה');
        return;
      }

      toast.success(editingOrder ? 'ההזמנה עודכנה בהצלחה' : 'ההזמנה נוצרה בהצלחה');
      setShowDialog(false);
      setEditingOrder(null);
      resetForm();
      // Refresh both work orders and payments to update status
      await Promise.all([fetchWorkOrders(), fetchPayments()]);
    } catch (error) {
      console.error('Error saving work order:', error);
      toast.error('שגיאה בשמירת ההזמנה');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      service_id: "",
      artist_id: "",
      work_description: "",
      estimated_price: "",
      final_price: "",
      estimated_duration: "",
      work_date: "",
      status: "pending",
      notes: ""
    });
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      client_id: order.client_id,
      service_id: order.service_id,
      artist_id: order.artist_id || "",
      work_description: order.work_description || "",
      estimated_price: order.estimated_price?.toString() || "",
      final_price: order.final_price?.toString() || "",
      estimated_duration: order.estimated_duration?.toString() || "",
      work_date: order.work_date,
      status: order.status,
      notes: order.notes || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק הזמנה זו?")) return;

    try {
      const { error } = await supabase
        .from('work_orders' as any)
        .delete()
        .eq('id', orderId);

      if (error) {
        toast.error('שגיאה במחיקת ההזמנה');
        return;
      }

      toast.success('ההזמנה נמחקה בהצלחה');
      fetchWorkOrders();
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast.error('שגיאה במחיקת ההזמנה');
    }
  };

  const handleNewOrder = () => {
    setEditingOrder(null);
    resetForm();
    setShowDialog(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(price);
  };

  const getStatusDisplay = (status: string) => {
    const statuses: { [key: string]: { label: string; variant: any } } = {
      pending: { label: 'ממתין', variant: 'outline' },
      in_progress: { label: 'בתהליך', variant: 'secondary' },
      completed: { label: 'שולם מלא', variant: 'default' },
      cancelled: { label: 'בוטל', variant: 'destructive' },
      partially_paid: { label: 'שולם חלקית', variant: 'secondary' }
    };
    return statuses[status] || { label: status, variant: 'outline' };
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    setFormData(prev => ({
      ...prev,
      service_id: serviceId,
      estimated_price: selectedService?.price?.toString() || "",
      estimated_duration: selectedService?.duration_minutes?.toString() || ""
    }));
  };

  const handlePrint = (order: WorkOrder) => {
    setPrintingOrder(order);
    setShowPrintDialog(true);
  };

  const handleScheduleAppointment = (order: WorkOrder) => {
    setAppointmentWorkOrder(order);
    // Pre-fill appointment form with work order data
    setAppointmentFormData({
      client_id: order.client_id,
      service_id: order.service_id,
      appointment_date: order.work_date,
      appointment_time: "",
      duration_minutes: order.estimated_duration?.toString() || "",
      status: "scheduled",
      artist_id: order.artist_id || "",
      notes: `תור עבור הזמנת עבודה ${order.work_order_number}`
    });
    setShowAppointmentDialog(true);
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר כדי לקבוע תור');
        return;
      }

      const appointmentData = {
        ...appointmentFormData,
        user_id: user.id,
        duration_minutes: appointmentFormData.duration_minutes ? parseInt(appointmentFormData.duration_minutes) : null,
        service_id: appointmentFormData.service_id || null
      };

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (error) throw error;
      
      toast.success('התור נקבע בהצלחה');
      setShowAppointmentDialog(false);
      setAppointmentWorkOrder(null);
      resetAppointmentForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('לא ניתן לקבוע את התור');
    }
  };

  const handleCreatePayment = (order: WorkOrder) => {
    setPaymentWorkOrder(order);
    const paymentInfo = getOrderPaymentInfo(order.id, order.estimated_price);
    
    // Pre-fill payment form with work order data
    setPaymentFormData({
      client_id: order.client_id,
      work_order_id: order.id,
      amount: paymentInfo.remaining > 0 ? paymentInfo.remaining : order.estimated_price,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
      payment_status: "completed",
      notes: `תשלום עבור הזמנת עבודה ${order.work_order_number}`
    });
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentWorkOrder) return;
    
    const paymentInfo = getOrderPaymentInfo(paymentWorkOrder.id, paymentWorkOrder.estimated_price);
    
    // Check if payment amount exceeds remaining balance
    if (paymentFormData.amount > paymentInfo.remaining) {
      toast.error(`לא ניתן לשלם יותר מהיתרה הנותרת: ₪${paymentInfo.remaining.toLocaleString()}`);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר למערכת');
        return;
      }

      const paymentData = {
        ...paymentFormData,
        user_id: user.id,
        amount: paymentFormData.amount
      };

      const { error } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (error) throw error;
      
      // Check if this payment completes the order
      const newTotalPaid = paymentInfo.totalPaid + paymentFormData.amount;
      const willBeFullyPaid = newTotalPaid >= paymentWorkOrder.estimated_price;
      
      if (willBeFullyPaid) {
        // Update work order status to completed
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ status: 'completed' })
          .eq('id', paymentWorkOrder.id);
          
        if (updateError) {
          console.error('Error updating work order status:', updateError);
        }
        
        toast.success('התשלום נוסף בהצלחה וההזמנה הושלמה!');
      } else {
        toast.success('התשלום נוסף בהצלחה');
      }
      
      setShowPaymentDialog(false);
      setPaymentWorkOrder(null);
      resetPaymentForm();
      // Refresh both payments and work orders to update status
      await Promise.all([fetchPayments(), fetchWorkOrders()]);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('לא ניתן ליצור את התשלום');
    }
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      client_id: "",
      work_order_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
      payment_status: "completed",
      notes: ""
    });
  };

  const resetAppointmentForm = () => {
    setAppointmentFormData({
      client_id: "",
      service_id: "",
      appointment_date: "",
      appointment_time: "",
      duration_minutes: "",
      status: "scheduled",
      artist_id: "",
      notes: ""
    });
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

  const handlePrintNow = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = document.querySelector('.print-content')?.innerHTML;
    if (!printContent) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>הזמנת עבודה - ${printingOrder?.work_order_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            color: black;
            background: white;
            direction: rtl;
          }
          
          @page {
            margin: 0.75in 0.5in;
            size: A4 portrait;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
          }
          
          .header {
            border-bottom: 2px solid #333;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          
          .company-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          
          .company-details {
            flex: 1;
          }
          
          .company-name {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .company-contact {
            font-size: 11pt;
            color: #666;
            line-height: 1.3;
          }
          
          .logo {
            margin-right: 20px;
          }
          
          .logo img {
            height: 60px;
            width: auto;
          }
          
          .title-section {
            text-align: center;
            margin-bottom: 24px;
          }
          
          .main-title {
            font-size: 28pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .order-number {
            font-size: 16pt;
            font-weight: bold;
            color: #0066cc;
          }
          
          /* Table Styles */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 2px solid #333;
          }

          .table-header {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 14pt;
            padding: 8px 10px;
            text-align: center;
            border: 1px solid #333;
          }

          .label-cell {
            width: 30%;
            font-weight: bold;
            background-color: #f9f9f9;
            padding: 8px 10px;
            border: 1px solid #333;
            text-align: right;
          }

          .data-cell {
            padding: 8px 10px;
            border: 1px solid #333;
            text-align: right;
          }

          .price-cell {
            font-weight: bold;
            font-size: 12pt;
          }

          .notes-cell {
            padding: 15px 10px;
            white-space: pre-wrap;
            text-align: right;
          }

          .signature-cell {
            width: 50%;
            padding: 20px 10px;
            text-align: center;
            vertical-align: top;
            border: 1px solid #333;
          }

          .signature-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 80px;
          }

          .signature-line {
            width: 200px;
            height: 1px;
            border-bottom: 1px solid #333;
            margin-bottom: 8px;
            margin-top: 30px;
          }

          .signature-label {
            font-weight: bold;
            margin: 5px 0;
            font-size: 10pt;
          }

          .signature-date {
            font-size: 9pt;
            margin: 5px 0;
          }

          .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 16px;
          }

          /* Print adjustments for tables */
          @media print {
            .info-table {
              page-break-inside: avoid;
              margin-bottom: 15px;
            }
            
            .table-header {
              background-color: #f5f5f5 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .label-cell {
              background-color: #f9f9f9 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען הזמנות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">הזמנות עבודה</h2>
          <p className="text-muted-foreground">נהל הזמנות עבודה וטופסים ללקוחות</p>
        </div>
        <Button onClick={handleNewOrder} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="ml-2 h-4 w-4" />
          הזמנה חדשה
        </Button>
      </div>

      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">אין הזמנות עבודה</h3>
            <p className="text-muted-foreground mb-4">
              התחל על ידי יצירת ההזמנה הראשונה שלך
            </p>
            <Button onClick={handleNewOrder} className="bg-gradient-to-r from-primary to-accent">
              <Plus className="ml-2 h-4 w-4" />
              הוסף הזמנה ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>רשימת הזמנות ({workOrders.length})</CardTitle>
            <CardDescription>כל הזמנות העבודה במערכת</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מספר הזמנה</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">שירות</TableHead>
                    <TableHead className="text-right">אמן</TableHead>
                    <TableHead className="text-right">תאריך עבודה</TableHead>
                    <TableHead className="text-right">מחיר/תשלומים</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((order) => {
                    const currentStatus = getOrderStatus(order);
                    const statusInfo = getStatusDisplay(currentStatus);
                    const paymentInfo = getOrderPaymentInfo(order.id, order.estimated_price);
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-right">
                          {order.work_order_number}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center">
                            <User className="h-4 w-4 ml-2 text-muted-foreground" />
                            {getClientName(order.client_id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {getServiceName(order.service_id)}
                        </TableCell>
                        <TableCell className="text-right">
                          {getArtistName(order.artist_id)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
                            {new Date(order.work_date).toLocaleDateString('he-IL')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-medium text-green-600">
                              {formatPrice(order.estimated_price)}
                            </div>
                            {paymentInfo.hasPayments && (
                              <div className="text-sm text-muted-foreground">
                                <div className="text-green-600">שולם: {formatPrice(paymentInfo.totalPaid)}</div>
                                {paymentInfo.remaining > 0 && (
                                  <div className="text-orange-600">יתרה: {formatPrice(paymentInfo.remaining)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreatePayment(order)}
                              className="text-green-600 hover:text-green-800"
                              title="צור תשלום"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleScheduleAppointment(order)}
                              className="text-purple-600 hover:text-purple-800"
                              title="קבע תור"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrint(order)}
                              className="text-orange-600 hover:text-orange-800"
                              title="הדפס הזמנה"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(order)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Work Order Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? "עריכת הזמנה" : "הזמנה חדשה"}
              </DialogTitle>
              <DialogDescription>
                {editingOrder 
                  ? "ערוך את פרטי ההזמנה הקיימת" 
                  : "צור הזמנת עבודה חדשה ללקוח"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">לקוח *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">שירות *</Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={handleServiceChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר שירות..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {formatPrice(service.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artist">אמן</Label>
                  <Select
                    value={formData.artist_id}
                    onValueChange={(value) => setFormData({ ...formData, artist_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר אמן..." />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.nickname || artist.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_date">תאריך עבודה *</Label>
                  <Input
                    id="work_date"
                    type="date"
                    value={formData.work_date}
                    onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_description">תיאור העבודה</Label>
                <Textarea
                  id="work_description"
                  value={formData.work_description}
                  onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                  placeholder="פרט את העבודה המבוקשת..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_price">מחיר משוער (₪)</Label>
                  <Input
                    id="estimated_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_price}
                    onChange={(e) => setFormData({ ...formData, estimated_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">משך זמן (דקות)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    min="0"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="in_progress">בתהליך</SelectItem>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.status === 'completed' && (
                <div className="space-y-2">
                  <Label htmlFor="final_price">מחיר סופי (₪)</Label>
                  <Input
                    id="final_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.final_price}
                    onChange={(e) => setFormData({ ...formData, final_price: e.target.value })}
                    placeholder="מחיר סופי לאחר השלמת העבודה"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                {editingOrder ? "עדכן הזמנה" : "צור הזמנה"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הדפסת הזמנת עבודה</DialogTitle>
            <DialogDescription>
              תצוגה מקדימה להדפסה של הזמנה מספר {printingOrder?.work_order_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="print-content">
            {printingOrder && (
              <WorkOrderPrint 
                workOrder={printingOrder}
                clients={clients}
                services={services}
                artists={artists}
              />
            )}
          </div>
          
          <DialogFooter className="print:hidden">
            <Button type="button" variant="outline" onClick={() => setShowPrintDialog(false)}>
              סגור
            </Button>
            <Button type="button" onClick={handlePrintNow} className="bg-gradient-to-r from-primary to-accent">
              <Printer className="ml-2 h-4 w-4" />
              הדפס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-lg max-h-screen overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>קביעת תור</DialogTitle>
            <DialogDescription>
              קביעת תור עבור הזמנת עבודה {appointmentWorkOrder?.work_order_number}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAppointmentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">לקוח *</Label>
              <Select value={appointmentFormData.client_id} onValueChange={(value) => setAppointmentFormData({...appointmentFormData, client_id: value})}>
                <SelectTrigger>
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
              <Label htmlFor="service_id">שירות</Label>
              <Select value={appointmentFormData.service_id} onValueChange={(value) => setAppointmentFormData({...appointmentFormData, service_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר שירות" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - ₪{service.price} ({service.duration_minutes} דק')
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointment_date">תאריך *</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  value={appointmentFormData.appointment_date}
                  onChange={(e) => setAppointmentFormData({...appointmentFormData, appointment_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appointment_time">שעה *</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={appointmentFormData.appointment_time}
                  onChange={(e) => setAppointmentFormData({...appointmentFormData, appointment_time: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">משך זמן (דקות)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={appointmentFormData.duration_minutes}
                  onChange={(e) => setAppointmentFormData({...appointmentFormData, duration_minutes: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select value={appointmentFormData.status} onValueChange={(value: any) => setAppointmentFormData({...appointmentFormData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">מתוזמן</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                    <SelectItem value="no_show">לא הגיע</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist_id">אמן</Label>
              <Select value={appointmentFormData.artist_id} onValueChange={(value) => setAppointmentFormData({...appointmentFormData, artist_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר אמן (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.full_name} {artist.nickname && `(${artist.nickname})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={appointmentFormData.notes}
                onChange={(e) => setAppointmentFormData({...appointmentFormData, notes: e.target.value})}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowAppointmentDialog(false)}>
                ביטול
              </Button>
              <Button type="submit">
                קבע תור
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg max-h-screen overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת תשלום</DialogTitle>
            <DialogDescription>
              יצירת תשלום עבור הזמנת עבודה {paymentWorkOrder?.work_order_number}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">לקוח *</Label>
              <Select value={paymentFormData.client_id} onValueChange={(value) => setPaymentFormData({...paymentFormData, client_id: value})}>
                <SelectTrigger>
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

            {paymentWorkOrder && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="font-medium">פרטי ההזמנה:</div>
                <div className="text-sm space-y-1">
                  {(() => {
                    const paymentInfo = getOrderPaymentInfo(paymentWorkOrder.id, paymentWorkOrder.estimated_price);
                    return (
                      <>
                        <div>מחיר כולל: {formatPrice(paymentWorkOrder.estimated_price)}</div>
                        {paymentInfo.hasPayments && (
                          <>
                            <div className="text-green-600">שולם עד כה: {formatPrice(paymentInfo.totalPaid)}</div>
                            <div className="text-orange-600 font-medium">יתרה לתשלום: {formatPrice(paymentInfo.remaining)}</div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">סכום *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({...paymentFormData, amount: parseFloat(e.target.value) || 0})}
                  required
                />
                {paymentWorkOrder && (() => {
                  const paymentInfo = getOrderPaymentInfo(paymentWorkOrder.id, paymentWorkOrder.estimated_price);
                  if (paymentFormData.amount > paymentInfo.remaining) {
                    return (
                      <div className="text-sm text-red-600">
                        ⚠️ הסכום גדול מהיתרה הנותרת: {formatPrice(paymentInfo.remaining)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">תאריך תשלום *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>אמצעי תשלום</Label>
                <Select value={paymentFormData.payment_method} onValueChange={(value) => setPaymentFormData({...paymentFormData, payment_method: value})}>
                  <SelectTrigger>
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
                <Label>סטטוס</Label>
                <Select value={paymentFormData.payment_status} onValueChange={(value) => setPaymentFormData({...paymentFormData, payment_status: value})}>
                  <SelectTrigger>
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
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                ביטול
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                צור תשלום
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkOrderManager;