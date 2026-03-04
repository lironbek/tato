import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Canvas as FabricCanvas } from "fabric";
import { FormField } from "./FormBuilder";
import { toast } from "sonner";

interface DynamicFormRendererProps {
  fields: FormField[];
  onSubmit: (formData: Record<string, any>) => void;
  clientData?: {
    full_name?: string;
    id_number?: string;
  };
  disabled?: boolean;
  initialValues?: Record<string, any>;
}

interface SignatureCanvasRef {
  canvas: FabricCanvas | null;
  isEmpty: () => boolean;
  getDataURL: () => string;
  clear: () => void;
}

const SignatureCanvas = ({ onSignatureChange, initialSignature, fieldId }: { 
  onSignatureChange: (signature: string) => void;
  initialSignature?: string;
  fieldId: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [paths, setPaths] = useState<Array<{x: number, y: number}[]>>([]);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with high DPI support
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Set drawing style for smooth lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all paths
    redrawCanvas();

  }, [paths]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw all completed paths
    paths.forEach(path => {
      if (path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw current path
    if (currentPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  };

  const getCoordinates = (e: MouseEvent | TouchEvent): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};

    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if (e instanceof TouchEvent) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasSignature(true);

    const coords = getCoordinates(e);
    setCurrentPath([coords]);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);

    // Draw the current segment immediately for smooth feedback
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevPath = currentPath;
    if (prevPath.length > 0) {
      ctx.beginPath();
      ctx.moveTo(prevPath[prevPath.length - 1].x, prevPath[prevPath.length - 1].y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
      
      // Export signature after a short delay to ensure canvas is updated
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const dataURL = canvas.toDataURL('image/png', 1.0);
          onSignatureChange(dataURL);
        }
      }, 100);
    }
  };

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath([]);
    setHasSignature(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onSignatureChange('');
  };

  const undoLastStroke = () => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
      
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const dataURL = canvas.toDataURL('image/png', 1.0);
          onSignatureChange(dataURL);
        }
      }, 100);
      
      if (paths.length === 1) {
        setHasSignature(false);
      }
    }
  };

  // Event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events for mobile
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [isDrawing, currentPath]);

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-blue-400 rounded-lg p-3 bg-blue-50/30">
        <canvas 
          ref={canvasRef} 
          className="w-full h-48 rounded-lg cursor-crosshair border border-gray-300 bg-white shadow-sm"
          style={{ 
            touchAction: 'none',
            userSelect: 'none'
          }}
        />
        <div className="flex items-center justify-center mt-3 gap-2">
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <span>✏️</span>
            <span>חתום כאן בעכבר או באצבע</span>
          </div>
          {isDrawing && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span>✍️</span>
              <span>חותם...</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 justify-center">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={undoLastStroke}
          disabled={!hasSignature || paths.length === 0}
          className="text-xs"
        >
          ↶ בטל משיכה
        </Button>
        <Button 
          type="button" 
          variant="destructive" 
          size="sm" 
          onClick={clearSignature}
          disabled={!hasSignature}
          className="text-xs"
        >
          🗑 נקה הכל
        </Button>
        {hasSignature && (
          <Badge variant="secondary" className="text-xs px-2 py-1">
            ✓ חתימה מוכנה
          </Badge>
        )}
      </div>
      
      {hasSignature && (
        <div className="text-center">
          <p className="text-xs text-green-600">
            ✅ החתימה נשמרה - תוכל להמשיך למלא את שאר הטופס
          </p>
        </div>
      )}
    </div>
  );
};

const DynamicFormRenderer = ({ 
  fields, 
  onSubmit, 
  clientData, 
  disabled = false, 
  initialValues = {} 
}: DynamicFormRendererProps) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sort fields by position
  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  // Initialize form data with client data when available
  useEffect(() => {
    const initData = { ...initialValues };
    
    sortedFields.forEach(field => {
      if (field.type === 'client_name' && clientData?.full_name && !initData[field.id]) {
        initData[field.id] = clientData.full_name;
      }
      if (field.type === 'client_id' && clientData?.id_number && !initData[field.id]) {
        initData[field.id] = clientData.id_number;
      }
    });
    
    setFormData(initData);
  }, [clientData, sortedFields, initialValues]);

  const handleInputChange = (fieldId: string, value: any) => {
    console.log('handleInputChange called:', fieldId, value); // Debug log
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    sortedFields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.id] = `השדה "${field.label}" הוא חובה`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form data on submit:', formData); // Debug log
    
    if (!validateForm()) {
      console.log('Validation errors:', errors); // Debug log
      toast.error('יש למלא את כל השדות החובה');
      return;
    }

    onSubmit(formData);
  };

  const getDefaultValue = (field: FormField) => {
    // Always use formData first, then fallback to client data
    if (formData[field.id] !== undefined && formData[field.id] !== '') {
      return formData[field.id];
    }
    
    if (field.type === 'client_name' && clientData?.full_name) {
      return clientData.full_name;
    }
    if (field.type === 'client_id' && clientData?.id_number) {
      return clientData.id_number;
    }
    return '';
  };

  const renderField = (field: FormField) => {
    const value = getDefaultValue(field);
    const hasError = !!errors[field.id];

    switch (field.type) {
      case 'text':
      case 'client_name':
      case 'client_id':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-right block">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground text-right">
                {field.description}
              </p>
            )}
            <Input
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`text-right ${hasError ? 'border-red-500' : ''}`}
              disabled={disabled || !!(field.type === 'client_name' && clientData?.full_name) || !!(field.type === 'client_id' && clientData?.id_number)}
            />
            {hasError && (
              <p className="text-sm text-red-500 text-right">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-right block">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground text-right">
                {field.description}
              </p>
            )}
            <Textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`text-right ${hasError ? 'border-red-500' : ''}`}
              disabled={disabled}
              rows={4}
            />
            {hasError && (
              <p className="text-sm text-red-500 text-right">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'yesno':
        return (
          <div key={field.id} className="space-y-3">
            <Label className="text-right block font-medium">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground text-right">
                {field.description}
              </p>
            )}
            <RadioGroup
              value={value}
              onValueChange={(val) => {
                console.log('RadioGroup onValueChange:', field.id, val);
                handleInputChange(field.id, val);
              }}
              className={`space-y-3 ${hasError ? 'border border-red-500 rounded-lg p-4' : 'p-2'}`}
            >
              <div className="flex items-center gap-3 justify-end p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <Label 
                  htmlFor={`${field.id}-yes`} 
                  className="text-right cursor-pointer text-base font-medium flex-1 select-none"
                  onClick={() => {
                    console.log('Yes label clicked for field:', field.id);
                    handleInputChange(field.id, 'yes');
                  }}
                >
                  כן
                </Label>
                <RadioGroupItem 
                  value="yes" 
                  id={`${field.id}-yes`} 
                  className="h-5 w-5"
                />
              </div>
              <div className="flex items-center gap-3 justify-end p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <Label 
                  htmlFor={`${field.id}-no`} 
                  className="text-right cursor-pointer text-base font-medium flex-1 select-none"
                  onClick={() => {
                    console.log('No label clicked for field:', field.id);
                    handleInputChange(field.id, 'no');
                  }}
                >
                  לא
                </Label>
                <RadioGroupItem 
                  value="no" 
                  id={`${field.id}-no`}
                  className="h-5 w-5"
                />
              </div>
            </RadioGroup>
            {hasError && (
              <p className="text-sm text-red-500 text-right font-medium">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'signature':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-right block">
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground text-right">
                {field.description}
              </p>
            )}
            <div className={`${hasError ? 'border border-red-500 rounded p-2' : ''}`}>
              <SignatureCanvas
                fieldId={field.id}
                onSignatureChange={(signature) => handleInputChange(field.id, signature)}
                initialSignature={value}
              />
            </div>
            {hasError && (
              <p className="text-sm text-red-500 text-right">{errors[field.id]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-right">טופס לחתימה</CardTitle>
        <CardDescription className="text-right">
          אנא מלא את הפרטים הנדרשים וחתום במקומות המיועדים לכך
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {sortedFields.map(renderField)}
          
          {!disabled && (
            <div className="flex justify-center pt-6">
              <Button type="submit" className="px-8">
                שלח טופס
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default DynamicFormRenderer;