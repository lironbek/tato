import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, full_name, phone, business_name, role } = await req.json()

    console.log('Creating user for email:', email)

    // Try to create user in auth.users table
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        phone,
        business_name
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      // If user already exists, try to get existing user
      if (authError.message.includes('already been registered')) {
        console.log('User already exists, checking existing user...')
        return new Response(
          JSON.stringify({ 
            error: 'המשתמש כבר קיים במערכת',
            message: 'משתמש עם כתובת המייל הזו כבר רשום במערכת' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        )
      }
      throw authError
    }

    console.log('Auth user created:', authUser.user?.id)

    // The profile should be created automatically by the trigger
    // But let's make sure the profile exists and has the correct data
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: authUser.user.id,
        full_name,
        email,
        phone,
        business_name
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Error upserting profile:', profileError)
      // If profile creation fails, delete the auth user to maintain consistency
      await supabaseClient.auth.admin.deleteUser(authUser.user.id)
      throw profileError
    }

    console.log('Profile created for user:', authUser.user.id)

    // Add role - validate that it's one of the allowed roles
    const validRoles = ['administrator', 'מנהל מערכת', 'מנהל', 'צופה'];
    if (!validRoles.includes(role)) {
      console.error('Invalid role provided:', role);
      await supabaseClient.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ 
          error: 'תפקיד לא חוקי',
          message: 'התפקיד שנבחר אינו קיים במערכת' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: role
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      // Don't fail the entire operation if role creation fails, just log it
    } else {
      console.log('Role assigned:', role, 'for user:', authUser.user.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authUser.user.id,
        message: 'המשתמש נוצר בהצלחה' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'שגיאה ביצירת המשתמש' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})