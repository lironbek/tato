import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Plus, Clock, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Client {
  id: string;
  full_name: string;
  phone: string;
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
  nickname?: string;
}

interface Appointment {
  id: string;
  client_id: string;
  service_id?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  status: string;
  artist_id?: string;
  artist_name?: string;
  notes?: string;
  clients: Client;
  services?: Service;
  artists?: Artist;
}

const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "",
    status: "scheduled",
    artist_id: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients:client_id (id, full_name, phone),
          services:service_id (id, name, price, duration_minutes),
          artists:artist_id (id, full_name, nickname)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch clients
      const { data: { user } } = await supabase.auth.getUser();
      console.log('AppointmentsManager - Current user:', user);
      if (!user) {
        console.log('AppointmentsManager - No user found');
        setLoading(false);
        return;
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name, phone')
        .eq('user_id', user.id)
        .order('full_name');

      console.log('AppointmentsManager - Clients query result:', { data: clientsData, error: clientsError });
      if (clientsError) throw clientsError;

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('user_id', user.id)
        .order('name');

      console.log('AppointmentsManager - Services query result:', { data: servicesData, error: servicesError });
      if (servicesError) throw servicesError;

      // Fetch artists
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, full_name, nickname')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('full_name');

      console.log('AppointmentsManager - Artists query result:', { data: artistsData, error: artistsError });
      if (artistsError) throw artistsError;

      setAppointments(appointmentsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
      setArtists(artistsData || []);
      console.log('AppointmentsManager - Set data:', { 
        appointments: appointmentsData?.length || 0,
        clients: clientsData?.length || 0, 
        services: servicesData?.length || 0,
        artists: artistsData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הנתונים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "שגיאה",
          description: "יש להתחבר כדי לקבוע תור",
          variant: "destructive"
        });
        return;
      }

      const appointmentData = {
        ...formData,
        user_id: user.id,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        service_id: formData.service_id || null
      };

      if (editingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id);

        if (error) throw error;
        
        toast({
          title: "הצלחה",
          description: "התור עודכן בהצלחה"
        });
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData]);

        if (error) throw error;
        
        toast({
          title: "הצלחה",
          description: "תור חדש נקבע בהצלחה"
        });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את התור",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      service_id: "",
      appointment_date: "",
      appointment_time: "",
      duration_minutes: "",
      status: "scheduled",
      artist_id: "",
      notes: ""
    });
    setEditingAppointment(null);
    setIsAddDialogOpen(false);
  };

  const startEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      client_id: appointment.client_id,
      service_id: appointment.service_id || "",
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      duration_minutes: appointment.duration_minutes?.toString() || "",
      status: appointment.status,
      artist_id: appointment.artist_id || "",
      notes: appointment.notes || ""
    });
    setIsAddDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'cancelled':
        return 'בוטל';
      case 'no_show':
        return 'לא הגיע';
      default:
        return 'מתוזמן';
    }
  };

  const getSelectedDateAppointments = () => {
    if (!selectedDate) return [];
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(appointment => appointment.appointment_date === selectedDateStr);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const scheduleAppointmentForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setFormData({
      ...formData,
      appointment_date: dateStr
    });
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">ניהול תורים</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="ml-2 h-4 w-4" />
              קבע תור חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingAppointment ? "עריכת תור" : "קביעת תור חדש"}
              </DialogTitle>
              <DialogDescription className="text-right">
                מלא את הפרטים הנדרשים לקביעת תור
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="space-y-2">
                <Label htmlFor="client_id">לקוח *</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
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
                <Select value={formData.service_id} onValueChange={(value) => setFormData({...formData, service_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר שירות (אופציונלי)" />
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
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="appointment_time">שעה *</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
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
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
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
                <Select value={formData.artist_id} onValueChange={(value) => setFormData({...formData, artist_id: value})}>
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
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  ביטול
                </Button>
                <Button type="submit">
                  {editingAppointment ? "עדכן" : "קבע תור"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column: Appointments List */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            רשימת תורים
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="bg-gradient-card border-border/50 backdrop-blur-sm hover:shadow-card transition-all duration-300">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-semibold text-base sm:text-lg">{appointment.clients.full_name}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(appointment.status)}
                          <Badge variant="outline" className="text-xs">
                            {getStatusText(appointment.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <span>{new Date(appointment.appointment_date).toLocaleDateString('he-IL')}</span>
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mr-2" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        
                        {appointment.services && (
                          <div className="text-xs sm:text-sm">
                            <strong>שירות:</strong> {appointment.services.name}
                          </div>
                        )}
                        
                        {appointment.artists && (
                          <div className="text-xs sm:text-sm">
                            <strong>אמן:</strong> {appointment.artists.full_name}
                          </div>
                        )}
                      </div>

                      {appointment.duration_minutes && (
                        <div className="text-xs text-muted-foreground mt-2">
                          משך זמן: {appointment.duration_minutes} דקות
                        </div>
                      )}

                      {appointment.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          הערות: {appointment.notes}
                        </div>
                      )}
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => startEdit(appointment)} className="w-full sm:w-auto">
                      עריכה
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {appointments.length === 0 && (
              <Card className="bg-gradient-card border-border/50 backdrop-blur-sm p-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">עדיין לא נקבעו תורים</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Calendar */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            לוח שנה
          </h3>
          
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-right flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm sm:text-base">
                בחירת תאריך
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scheduleAppointmentForDate(selectedDate || new Date())}
                  disabled={!selectedDate}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  קבע תור לתאריך זה
                </Button>
              </CardTitle>
              <CardDescription className="text-right text-xs sm:text-sm">
                לחץ על תאריך כדי לראות את התורים או לקבוע תור חדש
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border mx-auto text-sm"
                locale={he}
                modifiers={{
                  hasAppointment: appointments.map(apt => new Date(apt.appointment_date))
                }}
                modifiersStyles={{
                  hasAppointment: { backgroundColor: 'hsl(var(--primary))', color: 'white' }
                }}
              />
            </CardContent>
          </Card>
          
          {/* Daily Appointments */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-right text-lg">
                תורים ל{selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: he }) : 'היום'}
              </CardTitle>
              <CardDescription className="text-right">
                {getSelectedDateAppointments().length} תורים מתוזמנים
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getSelectedDateAppointments().length > 0 ? (
                  getSelectedDateAppointments().map((appointment) => (
                    <div key={appointment.id} className="p-3 rounded-lg border bg-background/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(appointment.status)}
                        </Badge>
                        <span className="font-medium">{appointment.appointment_time}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{appointment.clients.full_name}</span>
                        </div>
                        {appointment.services && (
                          <div className="text-muted-foreground">
                            {appointment.services.name}
                          </div>
                        )}
                        {appointment.artists && (
                          <div className="text-muted-foreground">
                            אמן: {appointment.artists.full_name}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(appointment)}>
                          עריכה
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>אין תורים מתוזמנים לתאריך זה</p>
                    {selectedDate && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => scheduleAppointmentForDate(selectedDate)}
                      >
                        קבע תור
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsManager;