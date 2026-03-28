import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// 브라우저용 싱글턴 클라이언트 (auth 상태 유지)
export const supabaseBrowser = createClient(url, key);
