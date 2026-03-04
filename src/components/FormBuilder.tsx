import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, X, FileText, Signature, MessageSquare, CheckSquare, Trash2, ArrowUp, ArrowDown, User, IdCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'yesno' | 'signature' | 'client_name' | 'client_id';
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  position: number;
}

interface FormBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: FormField[]) => void;
  initialFields?: FormField[];
  documentTitle: string;
}

const FormBuilder = ({ isOpen, onClose, onSave, initialFields = [], documentTitle }: FormBuilderProps) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<FormField>>({
    type: 'text',
    label: '',
    required: false,
    placeholder: '',
    description: ''
  });

  useEffect(() => {
    setFields(initialFields);
  }, [initialFields]);

  const addField = () => {
    if (!newField.label) {
      toast.error('יש להזין תווית לשדה');
      return;
    }

    const field: FormField = {
      id: Date.now().toString(),
      type: newField.type as FormField['type'],
      label: newField.label,
      required: newField.required || false,
      placeholder: newField.placeholder || '',
      description: newField.description || '',
      position: fields.length
    };

    setFields([...fields, field]);
    setNewField({
      type: 'text',
      label: '',
      required: false,
      placeholder: '',
      description: ''
    });
    setShowAddField(false);
    toast.success('השדה נוסף בהצלחה');
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    toast.success('השדה הוסר');
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) return;

    const newFields = [...fields];
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }

    // Update positions
    newFields.forEach((field, idx) => {
      field.position = idx;
    });

    setFields(newFields);
  };

  const updateField = (updatedField: FormField) => {
    setFields(fields.map(f => f.id === updatedField.id ? updatedField : f));
    setEditingField(null);
    toast.success('השדה עודכן');
  };

  const getFieldTypeIcon = (type: FormField['type']) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'textarea':
        return <MessageSquare className="h-4 w-4" />;
      case 'yesno':
        return <CheckSquare className="h-4 w-4" />;
      case 'signature':
        return <Signature className="h-4 w-4" />;
      case 'client_name':
        return <User className="h-4 w-4" />;
      case 'client_id':
        return <IdCard className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFieldTypeLabel = (type: FormField['type']) => {
    switch (type) {
      case 'text':
        return 'טקסט קצר';
      case 'textarea':
        return 'טקסט ארוך';
      case 'yesno':
        return 'כן/לא';
      case 'signature':
        return 'חתימה';
      case 'client_name':
        return 'שם הלקוח';
      case 'client_id':
        return 'תעודת זהות';
      default:
        return type;
    }
  };

  const handleSave = () => {
    onSave(fields);
    onClose();
    toast.success('הטופס נשמר בהצלחה');
  };

  const addQuickFields = () => {
    const quickFields: FormField[] = [
      {
        id: Date.now().toString(),
        type: 'client_name',
        label: 'שם הלקוח',
        required: true,
        position: fields.length
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'client_id',
        label: 'תעודת זהות',
        required: true,
        position: fields.length + 1
      },
      {
        id: (Date.now() + 2).toString(),
        type: 'yesno',
        label: 'האם קיימות מחלות כרוניות?',
        required: true,
        position: fields.length + 2
      },
      {
        id: (Date.now() + 3).toString(),
        type: 'textarea',
        label: 'אנא פרט על מחלות כרוניות (אם קיימות)',
        required: false,
        position: fields.length + 3
      },
      {
        id: (Date.now() + 4).toString(),
        type: 'signature',
        label: 'חתימת הלקוח',
        required: true,
        position: fields.length + 4
      }
    ];

    setFields([...fields, ...quickFields]);
    toast.success('נוספו שדות בסיסיים');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">עריכת טופס - {documentTitle}</DialogTitle>
          <DialogDescription className="text-right">
            בנה טופס דינמי עם שדות שונים ומקומות לחתימה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={addQuickFields} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-2" />
              הוסף שדות בסיסיים
            </Button>
            <Button onClick={() => setShowAddField(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-2" />
              הוסף שדה חדש
            </Button>
          </div>

          {/* Add New Field Form */}
          {showAddField && (
            <Card>
              <CardHeader>
                <CardTitle className="text-right">שדה חדש</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-right block">סוג השדה</Label>
                    <Select 
                      value={newField.type} 
                      onValueChange={(value) => setNewField({...newField, type: value as FormField['type']})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">טקסט קצר</SelectItem>
                        <SelectItem value="textarea">טקסט ארוך</SelectItem>
                        <SelectItem value="yesno">כן/לא</SelectItem>
                        <SelectItem value="signature">חתימה</SelectItem>
                        <SelectItem value="client_name">שם הלקוח</SelectItem>
                        <SelectItem value="client_id">תעודת זהות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-right block">תווית השדה</Label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField({...newField, label: e.target.value})}
                      placeholder="הזן תווית..."
                      className="text-right"
                    />
                  </div>
                </div>

                {(newField.type === 'text' || newField.type === 'textarea') && (
                  <div>
                    <Label className="text-right block">טקסט עזר</Label>
                    <Input
                      value={newField.placeholder}
                      onChange={(e) => setNewField({...newField, placeholder: e.target.value})}
                      placeholder="טקסט עזר לשדה..."
                      className="text-right"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-right block">תיאור השדה</Label>
                  <Textarea
                    value={newField.description}
                    onChange={(e) => setNewField({...newField, description: e.target.value})}
                    placeholder="תיאור נוסף לשדה..."
                    className="text-right"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Label className="text-right">שדה חובה</Label>
                  <Switch
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setShowAddField(false)} variant="outline">
                    ביטול
                  </Button>
                  <Button onClick={addField}>
                    הוסף שדה
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fields List */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-right">שדות הטופס</h3>
            {fields.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">לא נוספו שדות עדיין</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    השתמש ב"הוסף שדות בסיסיים" או "הוסף שדה חדש" כדי להתחיל
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFieldTypeIcon(field.type)}
                          <Badge variant="outline">
                            {getFieldTypeLabel(field.type)}
                          </Badge>
                          <span className="font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              חובה
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(field.id, 'down')}
                            disabled={index === fields.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(field)}
                            className="text-blue-600"
                          >
                            ערוך
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(field.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {field.description && (
                        <p className="text-sm text-muted-foreground mt-2 text-right">
                          {field.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={fields.length === 0}>
            שמור טופס
          </Button>
        </DialogFooter>

        {/* Edit Field Dialog */}
        {editingField && (
          <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-right">עריכת שדה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-right block">תווית השדה</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) => setEditingField({...editingField, label: e.target.value})}
                    className="text-right"
                  />
                </div>
                
                {(editingField.type === 'text' || editingField.type === 'textarea') && (
                  <div>
                    <Label className="text-right block">טקסט עזר</Label>
                    <Input
                      value={editingField.placeholder || ''}
                      onChange={(e) => setEditingField({...editingField, placeholder: e.target.value})}
                      className="text-right"
                    />
                  </div>
                )}
                
                <div>
                  <Label className="text-right block">תיאור השדה</Label>
                  <Textarea
                    value={editingField.description || ''}
                    onChange={(e) => setEditingField({...editingField, description: e.target.value})}
                    className="text-right"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  <Label className="text-right">שדה חובה</Label>
                  <Switch
                    checked={editingField.required}
                    onCheckedChange={(checked) => setEditingField({...editingField, required: checked})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingField(null)}>
                  ביטול
                </Button>
                <Button onClick={() => updateField(editingField)}>
                  שמור שינויים
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormBuilder;