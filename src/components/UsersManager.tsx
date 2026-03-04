import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, User, Mail, Phone, Shield, UserPlus, Users2, Trash2, Edit, Key, RefreshCw, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface SystemUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  business_name?: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

const UsersManager = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [roleData, setRoleData] = useState({
    role: ""
  });

  const [inviteData, setInviteData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    business_name: "",
    role: "צופה"
  });

  const [editUserData, setEditUserData] = useState({
    user_id: "",
    full_name: "",
    email: "",
    phone: "",
    business_name: "",
    role: "צופה"
  });

  const [passwordData, setPasswordData] = useState({
    user_id: "",
    new_password: ""
  });

  const roleLabels = {
    administrator: "אדמין",
    "מנהל מערכת": "מנהל מערכת",
    "מנהל": "מנהל",
    "צופה": "צופה"
  };

  const roleColors = {
    administrator: "destructive",
    "מנהל מערכת": "default",
    "מנהל": "secondary",
    "צופה": "outline"
  } as const;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_system_users');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("לא ניתן לטעון את רשימת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !roleData.role) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר כדי לנהל תפקידים");
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: selectedUser.user_id,
          role: roleData.role,
          created_by: user.id
        }]);

      if (error) throw error;
      
      toast.success("תפקיד נוסף בהצלחה");

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error("לא ניתן להוסיף תפקיד");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUserData.user_id) return;

    try {
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editUserData.full_name,
          email: editUserData.email,
          phone: editUserData.phone,
          business_name: editUserData.business_name
        })
        .eq('user_id', editUserData.user_id);

      if (profileError) throw profileError;
      
      toast.success("המשתמש עודכן בהצלחה");
      resetEditForm();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("לא ניתן לעדכן את המשתמש");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.user_id || !passwordData.new_password) return;

    if (passwordData.new_password.length < 6) {
      toast.error("הסיסמה חייבת להיות לפחות 6 תווים");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: passwordData.user_id,
          new_password: passwordData.new_password
        }
      });

      if (error) throw error;

      toast.success("הסיסמה עודכנה בהצלחה");
      resetPasswordForm();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error("לא ניתן לעדכן את הסיסמה");
    }
  };

  const handleSyncUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('sync_users_with_auth');

      if (error) throw error;

      if (data && typeof data === 'object' && 'synced_users' in data) {
        toast.success(`סנכרון הושלם בהצלחה! נוספו ${data.synced_users} משתמשים`);
      } else {
        toast.success("סנכרון הושלם בהצלחה!");
      }
      fetchUsers();
    } catch (error) {
      console.error('Error syncing users:', error);
      toast.error("לא ניתן לסנכרן משתמשים");
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
      
      toast.success("תפקיד הוסר בהצלחה");

      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error("לא ניתן להסיר תפקיד");
    }
  };

  const handleDeleteUser = async (userId: string, userName?: string, userRoles?: string[]) => {
    // Check if user is admin - prevent deletion
    if (userRoles?.includes('administrator')) {
      toast.error("לא ניתן למחוק משתמש אדמין");
      return;
    }

    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userName || 'זה'}? פעולה זו לא ניתנת לביטול.`)) {
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      // Call the edge function to delete user from all tables including auth
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userId
        }
      });

      if (error) throw error;

      toast.success("המשתמש נמחק בהצלחה");
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "שגיאה במחיקת המשתמש");
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData.password || inviteData.password.length < 6) {
      toast.error("הסיסמה חייבת להיות לפחות 6 תווים");
      return;
    }
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("יש להתחבר למערכת");
        return;
      }

      // Call the edge function to create user with auth, profile, and role
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: inviteData.email,
          password: inviteData.password,
          full_name: inviteData.full_name,
          phone: inviteData.phone,
          business_name: inviteData.business_name,
          role: inviteData.role
        }
      });

      if (error) throw error;

      toast.success("המשתמש נוצר בהצלחה! הוא יכול כעת להתחבר למערכת");
      resetInviteForm();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || "שגיאה ביצירת המשתמש");
    }
  };

  const resetForm = () => {
    setRoleData({ role: "" });
    setSelectedUser(null);
    setIsAddRoleDialogOpen(false);
  };

  const resetInviteForm = () => {
    setInviteData({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      business_name: "",
      role: "צופה"
    });
    setIsInviteDialogOpen(false);
  };

  const resetEditForm = () => {
    setEditUserData({
      user_id: "",
      full_name: "",
      email: "",
      phone: "",
      business_name: "",
      role: "צופה"
    });
    setIsEditDialogOpen(false);
  };

  const resetPasswordForm = () => {
    setPasswordData({
      user_id: "",
      new_password: ""
    });
    setIsPasswordDialogOpen(false);
  };

  const startAddRole = (user: SystemUser) => {
    setSelectedUser(user);
    setRoleData({ role: "" });
    setIsAddRoleDialogOpen(true);
  };

  const startEditUser = (user: SystemUser) => {
    setEditUserData({
      user_id: user.user_id,
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      business_name: user.business_name || "",
      role: user.roles.length > 0 ? user.roles[0] : "צופה"
    });
    setIsEditDialogOpen(true);
  };

  const startPasswordChange = (user: SystemUser) => {
    setPasswordData({
      user_id: user.user_id,
      new_password: ""
    });
    setIsPasswordDialogOpen(true);
  };

  const filteredUsers = users.filter(user =>
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.phone && user.phone.includes(searchTerm))
  );

  if (loading) {
    return <div className="p-6">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">ניהול משתמשים</h2>
        <p className="text-muted-foreground">נהל משתמשים וקבוצות הרשאה במערכת</p>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">סה"כ משתמשים</CardTitle>
          <Users2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users.length}</div>
          <p className="text-xs text-muted-foreground">
            משתמשים פעילים במערכת
          </p>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-primary to-accent"
                onClick={() => resetInviteForm()}
              >
                 <UserPlus className="mr-2 h-4 w-4" />
                הוסף משתמש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-right">הוספת משתמש חדש</DialogTitle>
                <DialogDescription className="text-right">
                  הוסף משתמש חדש למערכת
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right block">אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-right block">סיסמה *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={inviteData.password}
                    onChange={(e) => setInviteData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="text-right"
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-right block">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={inviteData.full_name}
                    onChange={(e) => setInviteData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-right block">טלפון</Label>
                  <Input
                    id="phone"
                    value={inviteData.phone}
                    onChange={(e) => setInviteData(prev => ({ ...prev, phone: e.target.value }))}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-right block">שם העסק</Label>
                  <Input
                    id="business_name"
                    value={inviteData.business_name}
                    onChange={(e) => setInviteData(prev => ({ ...prev, business_name: e.target.value }))}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-right block">קבוצת הרשאה</Label>
                  <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrator">אדמין</SelectItem>
                      <SelectItem value="מנהל מערכת">מנהל מערכת</SelectItem>
                      <SelectItem value="מנהל">מנהל</SelectItem>
                      <SelectItem value="צופה">צופה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                    הוסף משתמש
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline"
            onClick={handleSyncUsers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            סנכרן עם Auth
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש משתמשים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
      </div>

      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">
                הוספת תפקיד למשתמש
              </DialogTitle>
              <DialogDescription className="text-right">
                {selectedUser && `הוסף תפקיד ל${selectedUser.full_name || selectedUser.email}`}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddRole} className="space-y-4" dir="rtl">
              <div className="space-y-2">
                <Label htmlFor="role">תפקיד *</Label>
                <Select value={roleData.role} onValueChange={(value) => setRoleData({...roleData, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תפקיד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">אדמין</SelectItem>
                    <SelectItem value="מנהל מערכת">מנהל מערכת</SelectItem>
                    <SelectItem value="מנהל">מנהל</SelectItem>
                    <SelectItem value="צופה">צופה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                  הוסף תפקיד
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת משתמש</DialogTitle>
            <DialogDescription className="text-right">
              ערוך את פרטי המשתמש
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name" className="text-right block">שם מלא</Label>
              <Input
                id="edit_full_name"
                value={editUserData.full_name}
                onChange={(e) => setEditUserData(prev => ({ ...prev, full_name: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_email" className="text-right block">אימייל</Label>
              <Input
                id="edit_email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone" className="text-right block">טלפון</Label>
              <Input
                id="edit_phone"
                value={editUserData.phone}
                onChange={(e) => setEditUserData(prev => ({ ...prev, phone: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_business_name" className="text-right block">שם העסק</Label>
              <Input
                id="edit_business_name"
                value={editUserData.business_name}
                onChange={(e) => setEditUserData(prev => ({ ...prev, business_name: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block">קבוצת הרשאה</Label>
              <Select value={editUserData.role} onValueChange={(value) => setEditUserData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">אדמין</SelectItem>
                  <SelectItem value="מנהל מערכת">מנהל מערכת</SelectItem>
                  <SelectItem value="מנהל">מנהל</SelectItem>
                  <SelectItem value="צופה">צופה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                עדכן משתמש
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">שינוי סיסמה</DialogTitle>
            <DialogDescription className="text-right">
              הזן סיסמה חדשה למשתמש
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-right block">סיסמה חדשה *</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                required
                className="text-right"
                minLength={6}
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="bg-gradient-to-r from-primary to-accent">
                עדכן סיסמה
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <Card className="bg-gradient-card border-border/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם מלא</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">שם עסק</TableHead>
                <TableHead className="text-right">קבוצות הרשאה</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.user_id} className="hover:bg-muted/50">
                   <TableCell className="text-right font-medium">
                     <div className="flex items-center gap-2 justify-end">
                       <span>{user.full_name || "ללא שם"}</span>
                       {user.roles.includes('administrator') && (
                         <div title="משתמש מוגן - לא ניתן למחיקה">
                           <ShieldCheck className="h-4 w-4 text-yellow-500" />
                         </div>
                       )}
                       <User className="h-4 w-4 text-muted-foreground" />
                     </div>
                   </TableCell>
                  <TableCell className="text-right">{user.email || "-"}</TableCell>
                  <TableCell className="text-right">{user.phone || "-"}</TableCell>
                  <TableCell className="text-right">{user.business_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <div key={role} className="flex items-center gap-1">
                            <Badge 
                              variant={roleColors[role as keyof typeof roleColors] || "outline"} 
                              className="text-xs"
                            >
                              {roleLabels[role as keyof typeof roleLabels] || role}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleRemoveRole(user.user_id, role)}
                            >
                              ×
                            </Button>
                          </div>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          ללא תפקיד
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditUser(user)}
                        title="ערוך משתמש"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startPasswordChange(user)}
                        title="שנה סיסמה"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startAddRole(user)}
                        title="הוסף תפקיד"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleDeleteUser(user.user_id, user.full_name, user.roles)}
                         className="hover:bg-destructive hover:text-destructive-foreground"
                         title={user.roles.includes('administrator') ? "לא ניתן למחוק אדמין" : "מחק משתמש"}
                         disabled={user.roles.includes('administrator')}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "לא נמצאו משתמשים התואמים לחיפוש" : "אין משתמשים במערכת"}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UsersManager;