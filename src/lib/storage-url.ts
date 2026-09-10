import { supabase } from "@/integrations/supabase/client";

// Workspace policy blocks public buckets, so we mint long-lived signed URLs instead.
// 10 years — effectively permanent for the app's lifetime.
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function getStorageUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
  return data.signedUrl;
}
