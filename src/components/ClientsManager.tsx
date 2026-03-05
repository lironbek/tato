import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Users, Search, Edit, Trash2, Phone, Mail, MapPin, Send, Check, X, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SendFormDialog from "./SendFormDialog";
import ClientDocuments from "./ClientDocuments";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  birth_date?: string;
  id_number?: string;
  medical_conditions?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  source: string;
  status?: 'pending' | 'active' | 'inactive';
  invitation_token?: string;
  created_at: string;
  updated_at: string;
}

const ClientsManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingClients, setPendingClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSendFormDialog, setShowSendFormDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedClientForDocuments, setSelectedClientForDocuments] = useState<Client | null>(null);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    birth_date: "",
    id_number: "",
    medical_conditions: "",
    allergies: "",
    medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    source: "manual"
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      console.log("Fetching clients...");
      
      // Fetch active clients
      const { data: activeData, error: activeError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;
      
      // Fetch pending clients
      const { data: pendingData, error: pendingError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      
      console.log("Active clients:", activeData);
      console.log("Pending clients:", pendingData);
      
      setClients(activeData || []);
      setPendingClients(pendingData || []);
    } catch (error) {
      toast.error("שגיאה בטעינת הלקוחות");
      console.error("Fetch clients error:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .eq('id', clientId);

      if (error) throw error;
      
      toast.success("הלקוח אושר בהצלחה");
      fetchClients();
    } catch (error) {
      toast.error("שגיאה באישור הלקוח");
      console.error(error);
    }
  };

  const rejectClient = async (clientId: string) => {
    if (!confirm("האם אתה בטוח שברצונך לדחות לקוח זה?")) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      
      toast.success("הלקוח נדחה ונמחק מהמערכת");
      fetchClients();
    } catch (error) {
      toast.error("שגיאה בדחיית הלקוח");
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      console.log("Current user:", user);

      // Validate required fields
      if (!formData.full_name.trim()) {
        toast.error("שדה שם מלא הוא חובה");
        return;
      }

      if (!formData.phone.trim()) {
        toast.error("שדה טלפון הוא חובה");
        return;
      }

      // Prepare data with proper null handling for date fields
      const dataToSave = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        birth_date: formData.birth_date || null,
        id_number: formData.id_number.trim() || null,
        medical_conditions: formData.medical_conditions.trim() || null,
        allergies: formData.allergies.trim() || null,
        medications: formData.medications.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        notes: formData.notes.trim() || null,
        source: formData.source,
        status: 'active' // Manual clients are always active
      };

      console.log("Data to save:", JSON.stringify(dataToSave, null, 2));

      if (editingClient) {
        console.log("Updating client:", editingClient.id);
        const { data, error } = await supabase
          .from('clients')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', editingClient.id)
          .select();

        if (error) {
          console.error("Update error:", JSON.stringify(error, null, 2));
          throw error;
        }
        console.log("Update successful:", data);
        toast.success("לקוח עודכן בהצלחה");
      } else {
        console.log("Inserting new client with user_id:", user.id);
        
        const insertData = {
          ...dataToSave,
          user_id: user.id
        };

        console.log("Insert data:", JSON.stringify(insertData, null, 2));

        const { data, error } = await supabase
          .from('clients')
          .insert(insertData as any)
          .select();

        if (error) {
          console.error("Insert error:", JSON.stringify(error, null, 2));
          
          if (error.code === '23505') {
            toast.error("לקוח עם טלפון זה כבר קיים במערכת");
            return;
          }
          if (error.code === '23503') {
            toast.error("שגיאת זיהוי משתמש - אנא התחבר מחדש");
            return;
          }
          
          throw error;
        }
        console.log("Insert successful:", data);
        toast.success("לקוח נוסף בהצלחה");
      }

      setShowAddDialog(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error("Submit error details:", JSON.stringify(error, null, 2));
      
      if (error.message) {
        toast.error(`שגיאה: ${error.message}`);
      } else {
        toast.error("שגיאה בשמירת הלקוח");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק לקוח זה?")) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("לקוח נמחק בהצלחה");
      fetchClients();
    } catch (error) {
      toast.error("שגיאה במחיקת הלקוח");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      address: "",
      birth_date: "",
      id_number: "",
      medical_conditions: "",
      allergies: "",
      medications: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: "",
      source: "manual"
    });
  };

  const startEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      birth_date: client.birth_date || "",
      id_number: client.id_number || "",
      medical_conditions: client.medical_conditions || "",
      allergies: client.allergies || "",
      medications: client.medications || "",
      emergency_contact_name: client.emergency_contact_name || "",
      emergency_contact_phone: client.emergency_contact_phone || "",
      notes: client.notes || "",
      source: client.source
    });
    setShowAddDialog(true);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPendingClients = pendingClients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openClientDocuments = (client: Client) => {
    setSelectedClientForDocuments(client);
    setShowDocumentsDialog(true);
  };

  const renderClientRow = (client: Client, isPending = false) => (
    <TableRow key={client.id}>
      <TableCell className="text-right font-medium">{client.full_name}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <Phone className="h-4 w-4" />
          {client.phone}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {client.email ? (
          <div className="flex items-center gap-2 justify-end">
            <Mail className="h-4 w-4" />
            {client.email}
          </div>
        ) : (
          <span className="text-muted-foreground">לא צוין</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {client.address ? (
          <div className="flex items-center gap-2 justify-end">
            <MapPin className="h-4 w-4" />
            {client.address}
          </div>
        ) : (
          <span className="text-muted-foreground">לא צוין</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={client.source === 'form_link' ? 'secondary' : 'outline'}>
          {client.source === 'form_link' ? 'קישור' : 'ידני'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex gap-2 justify-center">
          {isPending ? (
            <>
              <Button
                size="sm"
                onClick={() => approveClient(client.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectClient(client.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openClientDocuments(client)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(client)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(client.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">ניהול לקוחות</h2>
        <p className="text-muted-foreground">נהל את כל הלקוחות שלך במקום אחד</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">לקוחות פעילים</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {clients.filter(c => c.source === 'form_link').length} הגיעו דרך קישור
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממתינים לאישור</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingClients.length}</div>
            <p className="text-xs text-muted-foreground">
              לקוחות חדשים דרך קישור
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ לקוחות</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length + pendingClients.length}</div>
            <p className="text-xs text-muted-foreground">
              כולל פעילים וממתינים
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-primary to-accent"
                onClick={() => {
                  setEditingClient(null);
                  resetForm();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                הוסף לקוח
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-right">
                  {editingClient ? "עריכת לקוח" : "הוספת לקוח חדש"}
                </DialogTitle>
                <DialogDescription className="text-right">
                  {editingClient ? "ערוך את פרטי הלקוח" : "הוסף לקוח חדש למערכת"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-right block">שם מלא *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-right block">טלפון *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-right block">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="text-right block">תאריך לידה</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_number" className="text-right block">תעודת זהות</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name" className="text-right block">איש קשר חירום</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      className="text-right"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-right block">כתובת</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="text-right resize-none"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_conditions" className="text-right block">מצבים רפואיים</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
                    className="text-right resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="allergies" className="text-right block">אלרגיות</Label>
                    <Textarea
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                      className="text-right resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medications" className="text-right block">תרופות</Label>
                    <Textarea
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                      className="text-right resize-none"
                      rows={2}
                    />
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
                    {editingClient ? "עדכן" : "הוסף"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => setShowSendFormDialog(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            שלח טופס ללקוח
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש לקוחות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </div>

      {/* Tabs for Active and Pending Clients */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="relative">
            לקוחות פעילים
            {clients.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {clients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            ממתינים לאישור
            {pendingClients.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                {pendingClients.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right">לקוחות פעילים</CardTitle>
              <CardDescription className="text-right">
                {filteredClients.length} לקוחות פעילים במערכת
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">טוען...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "לא נמצאו לקוחות התואמים לחיפוש" : "אין לקוחות פעילים כרגע"}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto" dir="rtl">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם מלא</TableHead>
                          <TableHead className="text-right">טלפון</TableHead>
                          <TableHead className="text-right">אימייל</TableHead>
                          <TableHead className="text-right">כתובת</TableHead>
                          <TableHead className="text-center">מקור</TableHead>
                          <TableHead className="text-center">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map(client => renderClientRow(client, false))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile cards */}
                  <div className="block sm:hidden space-y-3" dir="rtl">
                    {filteredClients.map(client => (
                      <div key={client.id} className="border border-border/50 rounded-xl p-4 space-y-3 bg-card/50">
                        <div className="flex items-center justify-between">
                          <Badge variant={client.source === 'form_link' ? 'secondary' : 'outline'}>
                            {client.source === 'form_link' ? 'קישור' : 'ידני'}
                          </Badge>
                          <h3 className="font-semibold text-base">{client.full_name}</h3>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 justify-end">
                            <span>{client.phone}</span>
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="truncate">{client.email}</span>
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-1 border-t border-border/30">
                          <Button size="sm" variant="outline" onClick={() => openClientDocuments(client)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEdit(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm border-yellow-200">
            <CardHeader>
              <CardTitle className="text-right flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                לקוחות ממתינים לאישור
              </CardTitle>
              <CardDescription className="text-right">
                {filteredPendingClients.length} לקוחות ממתינים לאישורך
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">טוען...</div>
              ) : filteredPendingClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "לא נמצאו לקוחות התואמים לחיפוש" : "אין לקוחות הממתינים לאישור כרגע"}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto" dir="rtl">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם מלא</TableHead>
                          <TableHead className="text-right">טלפון</TableHead>
                          <TableHead className="text-right">אימייל</TableHead>
                          <TableHead className="text-right">כתובת</TableHead>
                          <TableHead className="text-center">מקור</TableHead>
                          <TableHead className="text-center">אישור/דחייה</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingClients.map(client => renderClientRow(client, true))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile cards */}
                  <div className="block sm:hidden space-y-3" dir="rtl">
                    {filteredPendingClients.map(client => (
                      <div key={client.id} className="border border-yellow-200 rounded-xl p-4 space-y-3 bg-yellow-50/50 dark:bg-yellow-900/10">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">ממתין</Badge>
                          <h3 className="font-semibold text-base">{client.full_name}</h3>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 justify-end">
                            <span>{client.phone}</span>
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="truncate">{client.email}</span>
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-1 border-t border-border/30">
                          <Button size="sm" onClick={() => approveClient(client.id)} className="bg-green-600 hover:bg-green-700 text-white">
                            <Check className="h-4 w-4 ml-1" />
                            אשר
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectClient(client.id)}>
                            <X className="h-4 w-4 ml-1" />
                            דחה
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SendFormDialog
        open={showSendFormDialog}
        onOpenChange={setShowSendFormDialog}
      />
      
      {selectedClientForDocuments && (
        <ClientDocuments
          client={selectedClientForDocuments}
          isOpen={showDocumentsDialog}
          onClose={() => setShowDocumentsDialog(false)}
        />
      )}
    </div>
  );
};

export default ClientsManager;