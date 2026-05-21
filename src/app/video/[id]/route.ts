import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: episode, error } = await supabase
      .from("episodes")
      .select("media_url")
      .eq("id", id)
      .single();

    if (error || !episode) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ url: episode.media_url });
  } catch (error: any) {
    console.error("GET Video URL Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
