import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = "https://ffxylnvhfylxeygnspir.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeHlsbnZoZnlseGV5Z25zcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Nzg4OTYsImV4cCI6MjA4MDI1NDg5Nn0.NLYKX3-0eey1Rk-I4IxTNHkYadaO9myw0CbjSf2Npsc";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
