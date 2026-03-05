import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Users,
  Calendar,
  Package,
  CreditCard,
  FileText,
  Camera,
  Bell,
  Settings as SettingsIcon,
  TrendingUp,
  Clock,
  DollarSign,
  UserPlus,
  Palette,
  Shield,
  LogOut,
  Wrench,
  ClipboardList,
  Database,
  BarChart3,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import ClientsManager from "./ClientsManager";
import AppointmentsManager from "./AppointmentsManager";
import UsersManager from "./UsersManager";
import ArtistsManager from "./ArtistsManager";
import DocumentsManager from "./DocumentsManager";
import GalleryManager from "./GalleryManager";
import InventoryManager from "./InventoryManager";
import PaymentsManager from "./PaymentsManager";
import ServicesManager from "./ServicesManager";
import WorkOrderManager from "./WorkOrderManager";
import { ThemeToggle } from "./ThemeToggle";
import TodayAppointments from "./TodayAppointments";
import QuickActions from "./QuickActions";

const statColors = [
  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-l-2 border-violet-500/50",
  "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-l-2 border-fuchsia-500/50",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500/50",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-2 border-amber-500/50",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-l-2 border-violet-500/50",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-l-2 border-rose-500/50",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-2 border-cyan-500/50",
  "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-l-2 border-fuchsia-500/50",
];

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState({
    company_name: "InkFlow CRM",
    company_logo_url: ""
  });
  const [overviewStats, setOverviewStats] = useState({
    totalClients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    lowStockItems: 0,
    totalInventoryValue: 0,
    totalArtists: 0,
    pendingWorkOrders: 0,
    completedWorkOrders: 0
  });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          fetchCompanySettings(session.user);
          fetchOverviewStats(session.user);
        } else {
          navigate('/auth');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchCompanySettings(session.user);
        fetchOverviewStats(session.user);
      } else {
        navigate('/auth');
      }
    });

    // Listen for quick action events
    const handleQuickAction = (event: CustomEvent) => {
      setActiveSection(event.detail.section);
    };

    window.addEventListener('quickActionSelected', handleQuickAction as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('quickActionSelected', handleQuickAction as EventListener);
    };
  }, [navigate]);

  const fetchCompanySettings = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, company_logo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCompanySettings({
          company_name: data.company_name || "InkFlow CRM",
          company_logo_url: data.company_logo_url || ""
        });
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchOverviewStats = async (user: User) => {
    try {
      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { count: todayAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('appointment_date', today);

      // Fetch monthly payments
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user.id)
        .gte('payment_date', firstDayOfMonth);

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Fetch inventory stats
      const { data: inventoryItems } = await supabase
        .from('inventory')
        .select('current_stock, minimum_stock, cost_price')
        .eq('user_id', user.id);

      const lowStockItems = inventoryItems?.filter(item => item.current_stock <= item.minimum_stock).length || 0;
      const totalInventoryValue = inventoryItems?.reduce((sum, item) => sum + (item.current_stock * (item.cost_price || 0)), 0) || 0;

      // Fetch artists count
      const { count: artistsCount } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch work orders stats
      const { count: pendingWorkOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress']);

      const { count: completedWorkOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setOverviewStats({
        totalClients: clientsCount || 0,
        todayAppointments: todayAppointmentsCount || 0,
        monthlyRevenue: Math.round(monthlyRevenue),
        lowStockItems: lowStockItems,
        totalInventoryValue: Math.round(totalInventoryValue),
        totalArtists: artistsCount || 0,
        pendingWorkOrders: pendingWorkOrdersCount || 0,
        completedWorkOrders: completedWorkOrdersCount || 0
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "התנתקת בהצלחה",
        description: "אתה מועבר לדף ההתחברות",
      });

      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "שגיאה בהתנתקות",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const stats = [
    { title: "סה\"כ לקוחות", value: overviewStats.totalClients.toString(), icon: Users, change: `${overviewStats.totalClients}` },
    { title: "תורים היום", value: overviewStats.todayAppointments.toString(), icon: Calendar, change: `${overviewStats.todayAppointments}` },
    { title: "הכנסות החודש", value: `₪${overviewStats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, change: `₪${overviewStats.monthlyRevenue}` },
    { title: "עבודות בתהליך", value: overviewStats.pendingWorkOrders.toString(), icon: Clock, change: `${overviewStats.pendingWorkOrders}` },
    { title: "אמנים פעילים", value: overviewStats.totalArtists.toString(), icon: Palette, change: `${overviewStats.totalArtists} פעילים` },
    { title: "מלאי נמוך", value: overviewStats.lowStockItems.toString(), icon: Package, change: `${overviewStats.lowStockItems} פריטים` },
    { title: "ערך מלאי", value: `₪${overviewStats.totalInventoryValue.toLocaleString()}`, icon: TrendingUp, change: `ערך כולל` },
    { title: "עבודות שהושלמו", value: overviewStats.completedWorkOrders.toString(), icon: ClipboardList, change: `${overviewStats.completedWorkOrders} הושלמו` },
  ];

  // Bottom nav items for mobile
  const bottomNavItems = [
    { id: "overview", label: "סקירה", icon: BarChart3 },
    { id: "clients", label: "לקוחות", icon: Users },
    { id: "appointments", label: "תורים", icon: Calendar },
    { id: "work_orders", label: "הזמנות", icon: ClipboardList },
    { id: "payments", label: "תשלומים", icon: CreditCard },
  ];

  const moreMenuItems = [
    { id: "inventory", label: "מלאי", icon: Package },
    { id: "services", label: "שירותים", icon: Wrench },
    { id: "artists", label: "אמנים", icon: Palette },
    { id: "users", label: "משתמשים", icon: Shield },
    { id: "gallery", label: "גלריה", icon: Camera },
    { id: "documents", label: "מסמכים", icon: FileText },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full aurora-bg relative">
        {/* Fixed aurora glow overlays */}
        <div className="fixed inset-0 pointer-events-none bg-gradient-glow opacity-60 z-0" />
        <div className="fixed inset-0 pointer-events-none dot-pattern opacity-30 z-0" />

        {/* Glassmorphic Header */}
        <header className="sticky top-0 z-40 glass relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:block">
                <SidebarTrigger />
              </div>
              {companySettings.company_logo_url ? (
                <img
                  src={companySettings.company_logo_url}
                  alt="לוגו החברה"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain"
                />
              ) : (
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-primary to-accent"></div>
              )}
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate max-w-[140px] sm:max-w-none">
                {companySettings.company_name}
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 ml-4 sm:ml-6">
              <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">
                שלום, {user.user_metadata?.full_name || user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">התנתק</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="h-8 w-8 sm:h-10 sm:w-10">
                <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex w-full" dir="rtl">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden md:block">
            <AppSidebar
              companySettings={companySettings}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
          </div>

          {/* Main Content - extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 p-3 sm:p-6 pb-20 md:pb-6">
            {activeSection === "overview" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="animate-fade-in">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">ברוכים הבאים למערכת ניהול Cybertattoo</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">האמנות זו הנשמה של האנושות</p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat, index) => (
                    <Card key={stat.title} className={`animate-slide-up stagger-${index + 1} bg-gradient-card border-border/50 backdrop-blur-sm hover:shadow-glow-sm transition-all duration-300 hover:-translate-y-0.5`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm font-medium text-right">{stat.title}</CardTitle>
                        <div className={`p-1.5 sm:p-2 rounded-lg ${statColors[index]}`}>
                          <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.change}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Today's Schedule */}
                <TodayAppointments />

                {/* Quick Actions */}
                <QuickActions />
              </div>
            )}

            {activeSection === "clients" && <ClientsManager />}
            {activeSection === "appointments" && <AppointmentsManager />}
            {activeSection === "services" && <ServicesManager />}
            {activeSection === "work_orders" && <WorkOrderManager />}
            {activeSection === "artists" && <ArtistsManager />}
            {activeSection === "users" && <UsersManager />}
            {activeSection === "documents" && <DocumentsManager />}
            {activeSection === "gallery" && <GalleryManager />}
            {activeSection === "inventory" && <InventoryManager />}
            {activeSection === "payments" && <PaymentsManager />}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass safe-bottom relative" dir="rtl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex items-center justify-around h-16 px-1">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setShowMoreMenu(false); }}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors relative ${
                  activeSection === item.id
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${activeSection === item.id ? "scale-110" : ""} transition-transform`} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                {activeSection === item.id && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-glow-sm" />
                )}
              </button>
            ))}
            {/* More button */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                  showMoreMenu || moreMenuItems.some(i => i.id === activeSection)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">עוד</span>
              </button>

              {/* More menu popup */}
              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl glass neon-border shadow-lg overflow-hidden animate-scale-in">
                  {moreMenuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setShowMoreMenu(false); }}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                        activeSection === item.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Overlay for more menu */}
        {showMoreMenu && (
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setShowMoreMenu(false)}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

function AppSidebar({ companySettings, activeSection, setActiveSection }: {
  companySettings: any;
  activeSection: string;
  setActiveSection: (section: string) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "ניהול יומי": false,
    "עסקי": false,
    "בסיס נתונים": false
  });

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => {
      // Close all groups first
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

      // Then open the clicked group
      newState[groupLabel] = !prev[groupLabel];
      return newState;
    });
  };

  const menuSections = [
    {
      label: "ניהול יומי",
      items: [
        { id: "clients", label: "לקוחות", icon: Users },
        { id: "appointments", label: "תורים", icon: Calendar },
        { id: "work_orders", label: "הזמנות עבודה", icon: ClipboardList },
      ]
    },
    {
      label: "עסקי",
      items: [
        { id: "inventory", label: "מלאי", icon: Package },
        { id: "payments", label: "תשלומים", icon: CreditCard },
        { id: "gallery", label: "גלריה", icon: Camera },
      ]
    },
    {
      label: "בסיס נתונים",
      items: [
        { id: "artists", label: "אמנים", icon: Palette },
        { id: "users", label: "משתמשים", icon: Shield },
        { id: "services", label: "שירותים", icon: Wrench },
        { id: "documents", label: "מסמכים", icon: FileText },
      ]
    }
  ];

  return (
    <Sidebar side="right" className="border-l border-border/50 transition-all duration-300" collapsible="icon">
      <SidebarHeader className="p-3 sm:p-6">
        {companySettings.company_logo_url ? (
          <div className="space-y-2 sm:space-y-3 text-center">
            <img
              src={companySettings.company_logo_url}
              alt="לוגו החברה"
              className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-lg object-contain border"
            />
            {!collapsed && <h3 className="font-semibold text-xs sm:text-sm">{companySettings.company_name}</h3>}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 text-center">
            <div className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-lg bg-gradient-to-br from-primary to-accent"></div>
            {!collapsed && <h3 className="font-semibold text-xs sm:text-sm">{companySettings.company_name}</h3>}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Overview as standalone item */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveSection("overview")}
                  isActive={activeSection === "overview"}
                  className={`w-full justify-end text-right transition-all duration-200 ${
                    activeSection === "overview"
                      ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-lg"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <BarChart3 className="mr-2 h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>סקירה כללית</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel
              className="text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => !collapsed && toggleGroup(section.label)}
            >
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className={`transition-transform duration-200 ${openGroups[section.label] ? "rotate-90" : ""}`}>◀</span>
                  <span>{section.label}</span>
                </div>
              )}
            </SidebarGroupLabel>
            {(collapsed || openGroups[section.label]) && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                        className={`w-full justify-end text-right transition-all duration-200 ${
                          activeSection === item.id
                            ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-lg"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default Dashboard;
