import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  client_id: string;
  service_id?: string;
  appointment_date: string;
  appointment_time: string;
  artist_name?: string;
  status?: string;
  notes?: string;
  clients: {
    full_name: string;
  };
  services?: {
    name: string;
  };
}

interface Artist {
  id: string;
  full_name: string;
}

const TodayAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch appointments for selected date
      let query = supabase
        .from('appointments')
        .select(`
          *,
          clients!inner(full_name),
          services(name)
        `)
        .eq('appointment_date', dateStr)
        .order('appointment_time', { ascending: true });

      // Filter by artist if selected
      if (selectedArtist !== "all") {
        query = query.eq('artist_name', selectedArtist);
      }

      const { data: appointmentsData, error: appointmentsError } = await query;
      
      if (appointmentsError) throw appointmentsError;

      // Fetch artists
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('id, full_name')
        .eq('is_active', true);
      
      if (artistsError) throw artistsError;

      setAppointments(appointmentsData || []);
      setArtists(artistsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedArtist]);

  const getStatusBadge = (status?: string) => {
    const statusColors = {
      'scheduled': 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
      'completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
      'cancelled': 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
      'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
    };

    const statusText = {
      'scheduled': 'מתוזמן',
      'completed': 'הושלם',
      'cancelled': 'בוטל',
      'in-progress': 'בביצוע'
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {statusText[status as keyof typeof statusText] || status}
      </Badge>
    );
  };

  return (
    <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-right flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>תורים ליום</span>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>בחר תאריך</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Artist Filter */}
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="בחר אמן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל האמנים</SelectItem>
                {artists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.full_name}>
                    {artist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="text-right text-base sm:text-lg font-medium">
          {format(selectedDate, "EEEE, dd/MM/yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">טוען...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            אין תורים ליום זה
          </div>
        ) : (
          <>
            {/* Mobile Layout */}
            <div className="block sm:hidden space-y-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="border bg-background/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-lg font-semibold">
                        {appointment.appointment_time}
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div><strong>לקוח:</strong> {appointment.clients.full_name}</div>
                      <div><strong>שירות:</strong> {appointment.services?.name || 'לא צוין'}</div>
                      <div><strong>אמן:</strong> {appointment.artist_name || 'לא צוין'}</div>
                      {appointment.notes && (
                        <div><strong>הערות:</strong> {appointment.notes}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שעה</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">שירות</TableHead>
                    <TableHead className="text-right">אמן</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">הערות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-muted/50">
                      <TableCell className="text-right font-medium">
                        {appointment.appointment_time}
                      </TableCell>
                      <TableCell className="text-right">
                        {appointment.clients.full_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {appointment.services?.name || 'לא צוין'}
                      </TableCell>
                      <TableCell className="text-right">
                        {appointment.artist_name || 'לא צוין'}
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {appointment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAppointments;