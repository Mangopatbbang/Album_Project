import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

// 클라이언트용 (브라우저)
export const supabase = createClient(url, publishableKey);

// 서버용 (API routes - RLS 우회)
export const supabaseServer = createClient(url, secretKey);
