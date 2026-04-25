import { supabaseServer } from "@/lib/supabase";

type LogAction = "album_add" | "album_edit" | "album_delete" | "rating_set" | "rating_delete";

export function logActivity(params: {
  userId: string | null;
  action: LogAction;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  details?: Record<string, unknown>;
}): void {
  void supabaseServer.from("activity_logs").insert({
    user_id: params.userId ?? null,
    action: params.action,
    album_id: params.albumId ?? null,
    album_title: params.albumTitle ?? null,
    album_artist: params.albumArtist ?? null,
    details: params.details ?? null,
  });
}
