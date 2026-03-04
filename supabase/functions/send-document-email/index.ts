import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendDocumentEmailRequest {
  clientEmail: string;
  clientName: string;
  documentNumber: string;
  documentTitle: string;
  documentUrl: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientEmail, 
      clientName, 
      documentNumber, 
      documentTitle, 
      documentUrl, 
      message 
    }: SendDocumentEmailRequest = await req.json();

    // Replace the placeholder in the message with the actual URL
    const finalMessage = message.replace('[הקישור יתווסף אוטומטי]', documentUrl);

    const emailResponse = await resend.emails.send({
      from: "InkFlow CRM <noreply@yourdomain.com>",
      to: [clientEmail],
      subject: `מסמך לחתימה - ${documentTitle} (מספר: ${documentNumber})`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            מסמך לחתימה
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">שלום ${clientName},</h3>
            <div style="white-space: pre-line; line-height: 1.6; color: #555;">
              ${finalMessage}
            </div>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #333; margin-bottom: 15px;">פרטי המסמך:</h4>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 8px;"><strong>שם המסמך:</strong> ${documentTitle}</li>
              <li style="margin-bottom: 8px;"><strong>מספר מסמך:</strong> ${documentNumber}</li>
              <li style="margin-bottom: 8px;"><strong>תאריך שליחה:</strong> ${new Date().toLocaleDateString('he-IL')}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${documentUrl}" 
               style="display: inline-block; 
                      background-color: #007bff; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold;
                      margin: 10px;">
              צפה במסמך וחתום
            </a>
          </div>
          
          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; text-align: center;">
              הקישור תקף ל-24 שעות. אם יש לך שאלות, אנא צור קשר איתנו.
            <br>
              <strong>InkFlow CRM</strong>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Document email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-document-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);