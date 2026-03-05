import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  document_id: string;
  recipient_phone: string;
  recipient_name: string;
  custom_message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { document_id, recipient_phone, recipient_name, custom_message }: SendWhatsAppRequest =
      await req.json();

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format phone number (Israeli format: 0XX -> 972XX)
    let phone = recipient_phone.replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) {
      phone = "972" + phone.substring(1);
    } else if (!phone.startsWith("972")) {
      phone = "972" + phone;
    }

    // Use the signing URL already stored on the document by the client
    const signingUrl = doc.signature_url || "";

    // Build message
    const defaultMessage = `היי ${recipient_name},\n\nאני שולח/ת אליך את המסמך "${doc.title || doc.file_name}" לחתימה.\n\nאנא לחץ/י על הקישור למטה כדי לפתוח ולחתום על המסמך:\n${signingUrl}\n\nתודה!`;
    const message = custom_message
      ? custom_message.replace("[הקישור יתווסף אוטומטי]", signingUrl)
      : defaultMessage;

    // Send via Green API
    const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
    const apiToken = Deno.env.get("GREEN_API_TOKEN");

    if (!instanceId || !apiToken) {
      return new Response(
        JSON.stringify({ error: "Green API credentials not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const greenApiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;
    const greenApiResponse = await fetch(greenApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message: message,
      }),
    });

    const greenApiResult = await greenApiResponse.json();

    if (!greenApiResponse.ok) {
      console.error("Green API error:", greenApiResult);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message", details: greenApiResult }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update document status
    await supabase
      .from("documents")
      .update({
        recipient_name: recipient_name,
        recipient_email: phone,
      })
      .eq("id", document_id);

    console.log("WhatsApp message sent successfully:", greenApiResult);

    return new Response(
      JSON.stringify({ success: true, messageId: greenApiResult.idMessage }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-document:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
