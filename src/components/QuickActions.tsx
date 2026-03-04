import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  UserPlus, 
  ClipboardList, 
  Wrench, 
  FileText, 
  CreditCard 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  action: string;
}

const QuickActions = () => {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: "appointment",
      title: "קביעת תור",
      description: "קבע תור חדש ללקוח",
      icon: Calendar,
      color: "bg-muted/50 hover:bg-muted",
      action: "appointments"
    },
    {
      id: "client",
      title: "הקמת לקוח",
      description: "הוסף לקוח חדש למערכת",
      icon: UserPlus,
      color: "bg-muted/50 hover:bg-muted",
      action: "clients"
    },
    {
      id: "work_order",
      title: "הזמנת עבודה",
      description: "צור הזמנת עבודה חדשה",
      icon: ClipboardList,
      color: "bg-muted/50 hover:bg-muted",
      action: "work_orders"
    },
    {
      id: "service",
      title: "הוספת שירות",
      description: "הוסף שירות חדש לרשימה",
      icon: Wrench,
      color: "bg-muted/50 hover:bg-muted",
      action: "services"
    },
    {
      id: "document",
      title: "יצירת מסמך",
      description: "צור מסמך או הסכם חדש",
      icon: FileText,
      color: "bg-muted/50 hover:bg-muted",
      action: "documents"
    },
    {
      id: "payment",
      title: "רישום תשלום",
      description: "רשום תשלום מלקוח",
      icon: CreditCard,
      color: "bg-muted/50 hover:bg-muted",
      action: "payments"
    }
  ];

  const handleAction = (actionId: string, sectionName: string) => {
    // נבדוק אם צריך לנווט או לפתוח דיאלוג
    // כרגע נעביר לסקשן הרלוונטי
    if (typeof window !== "undefined") {
      // Emit custom event to change section in Dashboard
      window.dispatchEvent(new CustomEvent('quickActionSelected', { 
        detail: { section: sectionName } 
      }));
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-right text-xl font-bold">פעולות מהירות</CardTitle>
        <CardDescription className="text-right">
          בצע פעולות נפוצות במהירות וביעילות
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              onClick={() => handleAction(action.id, action.action)}
              className={`
                h-auto p-3 sm:p-6 flex flex-col items-center text-center space-y-2 sm:space-y-3
                ${action.color} transition-all duration-300 
                border border-border/50 shadow-sm hover:shadow-md transform hover:scale-105
                rounded-xl text-foreground
              `}
              variant="ghost"
            >
              <div className="p-2 sm:p-3 bg-primary/10 rounded-xl">
                <action.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base">{action.title}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed hidden sm:block">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;