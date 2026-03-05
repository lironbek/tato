import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Signature, Type, Calendar, PenTool, Trash2, Save, GripVertical, ArrowRight, ZoomIn, ZoomOut, Pencil } from "lucide-react";

export interface VisualField {
  id: string;
  type: "signature" | "text" | "date" | "initials";
  label: string;
  x: number; // percentage from left of content
  y: number; // percentage from top of content
  width: number;
  height: number;
  required: boolean;
  defaultValue?: string;
}

interface DocumentFieldMarkerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: VisualField[]) => void;
  documentContent: string;
  initialFields?: VisualField[];
  documentTitle: string;
}

const FIELD_TYPES = [
  { type: "signature" as const, label: "חתימה", icon: Signature, color: "bg-blue-500 hover:bg-blue-600", badgeColor: "bg-blue-100 text-blue-800 border-blue-400" },
  { type: "text" as const, label: "שדה טקסט", icon: Type, color: "bg-green-500 hover:bg-green-600", badgeColor: "bg-green-100 text-green-800 border-green-400" },
  { type: "date" as const, label: "תאריך", icon: Calendar, color: "bg-purple-500 hover:bg-purple-600", badgeColor: "bg-purple-100 text-purple-800 border-purple-400" },
  { type: "initials" as const, label: "ראשי תיבות", icon: PenTool, color: "bg-orange-500 hover:bg-orange-600", badgeColor: "bg-orange-100 text-orange-800 border-orange-400" },
];

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  signature: { width: 220, height: 70 },
  text: { width: 200, height: 40 },
  date: { width: 160, height: 40 },
  initials: { width: 100, height: 50 },
};

const DocumentFieldMarker: React.FC<DocumentFieldMarkerProps> = ({
  isOpen,
  onClose,
  onSave,
  documentContent,
  initialFields = [],
  documentTitle,
}) => {
  const [fields, setFields] = useState<VisualField[]>(initialFields);
  const [activeFieldType, setActiveFieldType] = useState<VisualField["type"] | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFields(initialFields);
      setActiveFieldType(null);
      setEditingFieldId(null);
    }
  }, [isOpen, initialFields]);

  // Convert a mouse event to percentage coordinates relative to contentRef
  const getContentCoords = useCallback((e: React.MouseEvent): { xPct: number; yPct: number } | null => {
    if (!contentRef.current) return null;
    const rect = contentRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    return { xPct, yPct };
  }, []);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-field-id]")) return;
      if (!activeFieldType) return;

      const coords = getContentCoords(e);
      if (!coords) return;

      const fieldTypeInfo = FIELD_TYPES.find((ft) => ft.type === activeFieldType);

      const newField: VisualField = {
        id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: activeFieldType,
        label: fieldTypeInfo?.label || activeFieldType,
        x: Math.max(0, Math.min(coords.xPct, 90)),
        y: Math.max(0, Math.min(coords.yPct, 95)),
        width: DEFAULT_SIZES[activeFieldType].width,
        height: DEFAULT_SIZES[activeFieldType].height,
        required: true,
      };

      setFields((prev) => [...prev, newField]);
    },
    [activeFieldType, getContentCoords]
  );

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const coords = getContentCoords(e);
    if (!coords) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    setDraggingFieldId(fieldId);
    setDragOffset({
      x: coords.xPct - field.x,
      y: coords.yPct - field.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!draggingFieldId) return;

      const coords = getContentCoords(e);
      if (!coords) return;

      setFields((prev) =>
        prev.map((f) =>
          f.id === draggingFieldId
            ? {
                ...f,
                x: Math.max(0, Math.min(coords.xPct - dragOffset.x, 90)),
                y: Math.max(0, Math.min(coords.yPct - dragOffset.y, 95)),
              }
            : f
        )
      );
    },
    [draggingFieldId, dragOffset, getContentCoords]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingFieldId(null);
  }, []);

  const updateField = (fieldId: string, updates: Partial<VisualField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const removeField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const toggleRequired = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, required: !f.required } : f))
    );
  };

  const handleSave = () => {
    onSave(fields);
    toast.success("שדות המסמך נשמרו בהצלחה");
    onClose();
  };

  const getFieldBadgeStyle = (type: VisualField["type"]) => {
    return FIELD_TYPES.find((ft) => ft.type === type)?.badgeColor || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowRight className="h-4 w-4 ml-1" />
            חזרה
          </Button>
          <div className="h-6 w-px bg-border" />
          <Signature className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{documentTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{fields.length} שדות</Badge>
          <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-accent">
            <Save className="h-4 w-4 ml-2" />
            שמור שדות
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center px-4 py-2 bg-muted/50 border-b shrink-0">
        <span className="text-sm font-medium ml-1">הוסף שדה:</span>
        {FIELD_TYPES.map((ft) => (
          <Button
            key={ft.type}
            variant={activeFieldType === ft.type ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFieldType(activeFieldType === ft.type ? null : ft.type)}
            className={activeFieldType === ft.type ? ft.color + " text-white border-0" : ""}
          >
            <ft.icon className="h-4 w-4 ml-1" />
            {ft.label}
          </Button>
        ))}

        {activeFieldType && (
          <Badge className="mr-auto animate-pulse bg-yellow-100 text-yellow-800 border-yellow-400">
            לחץ על המסמך למיקום השדה — לחץ שוב על הכפתור לביטול
          </Badge>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document area — scrollable */}
        <div
          className={`flex-1 overflow-auto bg-gray-100 p-4 ${
            activeFieldType ? "cursor-crosshair" : ""
          }`}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* White page container — this is the positioning parent for all fields */}
          <div
            ref={contentRef}
            className="relative mx-auto bg-white shadow-lg rounded-lg"
            style={{ maxWidth: "800px" }}
            onClick={handleContentClick}
            onMouseMove={handleMouseMove}
          >
            {/* Rendered document HTML */}
            <div
              className="p-10 prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_img]:max-w-full"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: documentContent }}
            />

            {/* Placed field overlays — positioned with percentages */}
            {fields.map((field) => {
              const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type);
              return (
                <div
                  key={field.id}
                  data-field-id={field.id}
                  className={`absolute border-2 rounded-md flex items-center justify-between px-2 gap-1 select-none transition-shadow ${
                    getFieldBadgeStyle(field.type)
                  } ${draggingFieldId === field.id ? "opacity-80 shadow-xl ring-2 ring-primary" : "shadow-md hover:shadow-lg"}`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}px`,
                    height: `${field.height}px`,
                    zIndex: draggingFieldId === field.id ? 50 : 10,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                >
                  <div className="flex items-center gap-1 text-xs font-semibold overflow-hidden cursor-grab flex-1 min-w-0">
                    <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {fieldType && <fieldType.icon className="h-3.5 w-3.5 shrink-0" />}
                    <div className="truncate flex flex-col leading-tight">
                      <span className="truncate">{field.label}{field.required && <span className="text-red-500 font-bold mr-0.5">*</span>}</span>
                      {field.defaultValue && (
                        <span className="font-bold text-[10px] truncate opacity-80">
                          {field.defaultValue}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0 hover:bg-red-200 rounded-full"
                    onClick={(e) => removeField(field.id, e)}
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 border-r bg-card overflow-auto shrink-0 p-3">
          <h3 className="font-semibold text-sm mb-3">שדות שסומנו</h3>
          {fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              בחר סוג שדה מהסרגל למעלה ולחץ על המסמך כדי לסמן מיקום
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, i) => {
                const ft = FIELD_TYPES.find((t) => t.type === f.type);
                const isEditing = editingFieldId === f.id;
                return (
                  <div
                    key={f.id}
                    className={`rounded-md border text-xs ${getFieldBadgeStyle(f.type)} ${isEditing ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <span className="font-bold text-muted-foreground">{i + 1}</span>
                      {ft && <ft.icon className="h-3.5 w-3.5 shrink-0" />}
                      <span className="flex-1 truncate font-medium">{f.label}</span>
                      <button
                        className="opacity-60 hover:opacity-100"
                        onClick={() => setEditingFieldId(isEditing ? null : f.id)}
                        title="ערוך שדה"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="text-xs underline opacity-60 hover:opacity-100"
                        onClick={() => toggleRequired(f.id)}
                      >
                        {f.required ? "חובה" : "רשות"}
                      </button>
                      <button
                        className="hover:text-red-600"
                        onClick={(e) => removeField(f.id, e as any)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {isEditing && (
                      <div className="px-2 pb-2 space-y-2 border-t pt-2">
                        <div>
                          <Label className="text-xs font-medium">שם השדה</Label>
                          <Input
                            value={f.label}
                            onChange={(e) => updateField(f.id, { label: e.target.value })}
                            className="h-7 text-xs mt-0.5"
                            dir="rtl"
                          />
                        </div>
                        {f.type !== "signature" && f.type !== "initials" && (
                          <div>
                            <Label className="text-xs font-medium">ערך מוקדם (ימולא מראש)</Label>
                            <Input
                              value={f.defaultValue || ""}
                              onChange={(e) => updateField(f.id, { defaultValue: e.target.value })}
                              className="h-7 text-xs mt-0.5 font-bold"
                              dir="rtl"
                              placeholder="לדוגמה: שם הלקוח..."
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              אם ידוע מראש — יוצג בגופן מודגש. אם ריק — הלקוח ימלא בעצמו.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isEditing && f.defaultValue && (
                      <div className="px-2 pb-1.5">
                        <span className="text-[10px] font-bold bg-white/60 rounded px-1 py-0.5">
                          {f.defaultValue}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fields.length > 0 && (
            <div className="mt-4 p-2 bg-muted/50 rounded text-[10px] text-muted-foreground space-y-1">
              <p><strong>ערך מוקדם</strong> — טקסט שימולא מראש בצבע מודגש. הלקוח יוכל לערוך אותו.</p>
              <p><strong>ללא ערך מוקדם</strong> — שדה ריק שהלקוח ימלא בעצמו.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentFieldMarker;
