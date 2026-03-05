import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          navigate('/');
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        navigate('/');
      }
    });

    // Fetch company logo
    fetchCompanyLogo();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCompanyLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_logo_url')
        .limit(1)
        .maybeSingle();

      if (data?.company_logo_url) {
        setCompanyLogo(data.company_logo_url);
      }
    } catch (error) {
      console.log('Could not fetch company logo:', error);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !password) {
        toast({
          title: "שגיאה",
          description: "אנא מלא את כל השדות הנדרשים",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "התחברות מוצלחת!",
        description: "אתה מועבר לדף הבית",
      });

    } catch (error: any) {
      toast({
        title: "שגיאה בהתחברות",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center aurora-bg p-4 relative overflow-hidden">
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-40" />
      {/* Glow overlay */}
      <div className="absolute inset-0 bg-gradient-glow opacity-80" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="text-center mb-8 animate-fade-in">
          {companyLogo && (
            <div className="mb-6 flex justify-center">
              <img
                src={companyLogo}
                alt="לוגו החברה"
                className="h-20 w-auto object-contain drop-shadow-lg"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ברוכים הבאים</h1>
          <p className="text-muted-foreground mt-2">התחבר למערכת</p>
        </div>

        <Card className="glass neon-border shadow-violet">
          <CardHeader>
            <CardTitle className="text-right">התחברות</CardTitle>
            <CardDescription className="text-right">
              הכנס את פרטיך להתחברות למערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-right block">מייל</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-right"
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-right block">סיסמה</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:shadow-glow-sm hover:scale-[1.02] transition-all duration-200"
                disabled={loading}
              >
                {loading ? "מתחבר..." : "התחבר"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
