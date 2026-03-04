import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkOrderPrintProps {
  workOrder: {
    id: string;
    work_order_number: string;
    client_id: string;
    service_id: string;
    artist_id: string | null;
    work_description: string | null;
    estimated_price: number;
    final_price: number | null;
    estimated_duration: number | null;
    work_date: string;
    status: string;
    notes: string | null;
    created_at: string;
    created_by: string | null;
  };
  clients: Array<{ id: string; full_name: string; phone: string; address?: string; email?: string }>;
  services: Array<{ id: string; name: string; price: number; duration_minutes: number }>;
  artists: Array<{ id: string; full_name: string; nickname: string }>;
}

interface CompanySettings {
  company_name: string;
  company_logo_url?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
}

const WorkOrderPrint: React.FC<WorkOrderPrintProps> = ({ workOrder, clients, services, artists }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [creatorName, setCreatorName] = useState<string>("לא ידוע");

  useEffect(() => {
    fetchCompanySettings();
    if (workOrder.created_by) {
      fetchCreatorName();
    }
  }, [workOrder.created_by]);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCompanySettings(data);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchCreatorName = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', workOrder.created_by)
        .maybeSingle();

      if (data?.full_name) {
        setCreatorName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching creator name:', error);
    }
  };

  const getClientDetails = () => {
    return clients.find(c => c.id === workOrder.client_id);
  };

  const getServiceDetails = () => {
    return services.find(s => s.id === workOrder.service_id);
  };

  const getArtistDetails = () => {
    if (!workOrder.artist_id) return null;
    return artists.find(a => a.id === workOrder.artist_id);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(price);
  };

  const getStatusLabel = (status: string) => {
    const statuses: { [key: string]: string } = {
      pending: 'ממתין',
      in_progress: 'בתהליך',
      completed: 'הושלם',
      cancelled: 'בוטל'
    };
    return statuses[status] || status;
  };

  const client = getClientDetails();
  const service = getServiceDetails();
  const artist = getArtistDetails();

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      direction: 'rtl', 
      padding: '20px',
      fontSize: '12pt',
      lineHeight: '1.4'
    }}>
      <style>
        {`
          .container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            font-family: Arial, sans-serif;
            direction: rtl;
          }

          .header {
            margin-bottom: 32px;
            border-bottom: 2px solid #333;
            padding-bottom: 16px;
          }

          .company-info {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .company-details {
            flex: 1;
          }

          .company-name {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
          }

          .logo img {
            max-height: 80px;
            max-width: 120px;
          }

          .title-section {
            text-align: center;
            margin-bottom: 24px;
          }

          .main-title {
            font-size: 28pt;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .order-number {
            font-size: 16pt;
            font-weight: bold;
            color: #0066cc;
          }

          /* Table Styles */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 2px solid #333;
            page-break-inside: avoid;
          }

          .table-header {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 14pt;
            padding: 8px 10px;
            text-align: center;
            border: 1px solid #333;
          }

          .label-cell {
            width: 30%;
            font-weight: bold;
            background-color: #f9f9f9;
            padding: 8px 10px;
            border: 1px solid #333;
            text-align: right;
          }

          .data-cell {
            padding: 8px 10px;
            border: 1px solid #333;
            text-align: right;
          }

          .price-cell {
            font-weight: bold;
            font-size: 12pt;
          }

          .notes-cell {
            padding: 15px 10px;
            white-space: pre-wrap;
            text-align: right;
          }

          .signature-cell {
            width: 50%;
            padding: 20px 10px;
            text-align: center;
            vertical-align: top;
            border: 1px solid #333;
          }

          .signature-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 80px;
          }

          .signature-line {
            width: 200px;
            height: 1px;
            border-bottom: 1px solid #333;
            margin-bottom: 8px;
            margin-top: 30px;
          }

          .signature-label {
            font-weight: bold;
            margin: 5px 0;
            font-size: 10pt;
          }

          .signature-date {
            font-size: 9pt;
            margin: 5px 0;
          }

          .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 16px;
          }

          @media print {
            .info-table {
              page-break-inside: avoid;
              margin-bottom: 15px;
            }
            
            .table-header {
              background-color: #f5f5f5 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .label-cell {
              background-color: #f9f9f9 !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        `}
      </style>

      {/* Header with Company Info */}
      <div className="header">
        <div className="company-info">
          <div className="company-details">
            <h1 className="company-name">
              {companySettings?.company_name || 'שם החברה'}
            </h1>
            <div className="company-contact">
              {companySettings?.company_address && (
                <p>{companySettings.company_address}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '10pt' }}>
                {companySettings?.company_phone && (
                  <span>טלפון: {companySettings.company_phone}</span>
                )}
                {companySettings?.company_email && (
                  <span>אימייל: {companySettings.company_email}</span>
                )}
              </div>
              {companySettings?.company_website && (
                <p style={{ fontSize: '10pt' }}>{companySettings.company_website}</p>
              )}
            </div>
          </div>
          
          {companySettings?.company_logo_url && (
            <div className="logo">
              <img 
                src={companySettings.company_logo_url} 
                alt="לוגו החברה"
              />
            </div>
          )}
        </div>
      </div>

      {/* Work Order Title */}
      <div className="title-section">
        <h2 className="main-title">הזמנת עבודה</h2>
        <div className="order-number">
          מספר הזמנה: {workOrder.work_order_number}
        </div>
      </div>

      {/* Client Information Table */}
      <table className="info-table">
        <thead>
          <tr>
            <th colSpan={2} className="table-header">פרטי הלקוח</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="label-cell">שם מלא:</td>
            <td className="data-cell">{client?.full_name || 'לא נמצא'}</td>
          </tr>
          <tr>
            <td className="label-cell">טלפון:</td>
            <td className="data-cell">{client?.phone || 'לא זמין'}</td>
          </tr>
          {client?.email && (
            <tr>
              <td className="label-cell">אימייל:</td>
              <td className="data-cell">{client.email}</td>
            </tr>
          )}
          {client?.address && (
            <tr>
              <td className="label-cell">כתובת:</td>
              <td className="data-cell">{client.address}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Order Information Table */}
      <table className="info-table">
        <thead>
          <tr>
            <th colSpan={2} className="table-header">פרטי ההזמנה</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="label-cell">תאריך יצירה:</td>
            <td className="data-cell">{new Date(workOrder.created_at).toLocaleDateString('he-IL')}</td>
          </tr>
          <tr>
            <td className="label-cell">תאריך עבודה:</td>
            <td className="data-cell">{new Date(workOrder.work_date).toLocaleDateString('he-IL')}</td>
          </tr>
          <tr>
            <td className="label-cell">סטטוס:</td>
            <td className="data-cell">{getStatusLabel(workOrder.status)}</td>
          </tr>
          <tr>
            <td className="label-cell">נוצר על ידי:</td>
            <td className="data-cell">{creatorName}</td>
          </tr>
        </tbody>
      </table>

      {/* Service Details Table */}
      <table className="info-table">
        <thead>
          <tr>
            <th colSpan={2} className="table-header">פרטי השירות</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="label-cell">שם השירות:</td>
            <td className="data-cell">{service?.name || 'שירות לא נמצא'}</td>
          </tr>
          {workOrder.work_description && (
            <tr>
              <td className="label-cell">תיאור העבודה:</td>
              <td className="data-cell">{workOrder.work_description}</td>
            </tr>
          )}
          {artist && (
            <tr>
              <td className="label-cell">אמן מבצע:</td>
              <td className="data-cell">{artist.nickname || artist.full_name}</td>
            </tr>
          )}
          {workOrder.estimated_duration && (
            <tr>
              <td className="label-cell">משך זמן משוער:</td>
              <td className="data-cell">{workOrder.estimated_duration} דקות</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pricing Table */}
      <table className="info-table">
        <thead>
          <tr>
            <th colSpan={2} className="table-header">פרטי מחיר</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="label-cell">מחיר משוער:</td>
            <td className="data-cell price-cell">{formatPrice(workOrder.estimated_price)}</td>
          </tr>
          {workOrder.final_price && (
            <tr>
              <td className="label-cell">מחיר סופי:</td>
              <td className="data-cell price-cell">{formatPrice(workOrder.final_price)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Notes Table */}
      {workOrder.notes && (
        <table className="info-table">
          <thead>
            <tr>
              <th className="table-header">הערות</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="data-cell notes-cell">{workOrder.notes}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Signatures Table */}
      <table className="info-table">
        <thead>
          <tr>
            <th colSpan={2} className="table-header">חתימות</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="signature-cell">
              <div className="signature-area">
                <div className="signature-line"></div>
                <p className="signature-label">חתימת הלקוח</p>
                <p className="signature-date">תאריך: ___________</p>
              </div>
            </td>
            <td className="signature-cell">
              <div className="signature-area">
                <div className="signature-line"></div>
                <p className="signature-label">חתימת המבצע</p>
                <p className="signature-date">תאריך: ___________</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="footer">
        <p>מסמך זה הופק במערכת {companySettings?.company_name || 'InkFlow CRM'}</p>
        <p>תאריך הפקה: {new Date().toLocaleDateString('he-IL')} {new Date().toLocaleTimeString('he-IL')}</p>
      </div>
    </div>
  );
};

export default WorkOrderPrint;