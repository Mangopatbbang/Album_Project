import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

// 서버용 (API routes - RLS 우회)
// 클라이언트 컴포넌트에서는 @/lib/supabase-browser 의 supabaseBrowser 사용
export const supabaseServer = createClient(url, secretKey);
