import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { BUCKET_NAME } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if the episode exists to validate ID
    const { data: episode, error } = await supabase
      .from("episodes")
      .select("media_type")
      .eq("id", id)
      .single();

    if (error || !episode) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (episode.media_type !== "video") {
      return NextResponse.json({ error: "Episode is not a video" }, { status: 400 });
    }

    const region = process.env.AWS_REGION || "us-east-1";
    const spriteUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/videos/${id}/sprite.jpg`;
    const vttUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/videos/${id}/preview.vtt`;

    return NextResponse.json({
      spriteUrl,
      vttUrl
    });
  } catch (error: any) {
    console.error("GET Video Preview Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
