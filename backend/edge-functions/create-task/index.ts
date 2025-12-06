// backend/edge-functions/create-task/index.ts
// Supabase Edge Function (Deno + TypeScript)
// Deploy with: supabase functions deploy create-task

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type CreateTaskPayload = {
  application_id?: string;
  task_type?: string;
  due_at?: string;
};

const VALID_TASK_TYPES = ["call", "email", "review"] as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  let payload: CreateTaskPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { application_id, task_type, due_at } = payload;

  // ---- Validation ----
  if (!application_id || typeof application_id !== "string") {
    return jsonResponse({ error: "application_id is required" }, 400);
  }

  if (!task_type || !VALID_TASK_TYPES.includes(task_type as any)) {
    return jsonResponse(
      { error: "task_type must be one of: call, email, review" },
      400
    );
  }

  if (!due_at || typeof due_at !== "string") {
    return jsonResponse({ error: "due_at is required" }, 400);
  }

  const dueDate = new Date(due_at);
  if (Number.isNaN(dueDate.getTime())) {
    return jsonResponse({ error: "due_at must be a valid ISO timestamp" }, 400);
  }

  const now = new Date();
  if (dueDate.getTime() <= now.getTime()) {
    return jsonResponse({ error: "due_at must be in the future" }, 400);
  }

  try {
    // Optional but nice: ensure application exists & get tenant_id
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      return jsonResponse({ error: "Invalid application_id" }, 400);
    }

    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        tenant_id: application.tenant_id,
        application_id,
        type: task_type,
        due_at: dueDate.toISOString(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !task) {
      console.error("Insert error", insertError);
      return jsonResponse({ error: "Failed to create task" }, 500);
    }

    return jsonResponse({ success: true, task_id: task.id }, 200);
  } catch (err) {
    console.error("Unexpected error in create-task function", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
