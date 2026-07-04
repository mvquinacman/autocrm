import { supabase } from "@/lib/supabase";

export interface PromoDetail {
  id: string;
  title: string;
  model: string | null;
  description: string | null;
  fileUrl: string | null;
  active: boolean;
  startsOn: string | null;
  endsOn: string | null;
}

interface PromoDetailRow {
  id: string;
  title: string;
  model: string | null;
  description: string | null;
  file_url: string | null;
  active: boolean;
  starts_on: string | null;
  ends_on: string | null;
}

/**
 * All promos for the viewer's dealership (RLS scopes rows), active first
 * then alphabetical. Includes inactive promos — the page shows history.
 */
export async function fetchAllPromos(): Promise<PromoDetail[]> {
  const { data, error } = await supabase
    .from("promos")
    .select("id, title, model, description, file_url, active, starts_on, ends_on")
    .order("active", { ascending: false })
    .order("title")
    .overrideTypes<PromoDetailRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    description: row.description,
    fileUrl: row.file_url,
    active: row.active,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  }));
}
