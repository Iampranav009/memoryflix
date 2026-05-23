import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { BUCKET_NAME } from "@/lib/s3";
import { verifyAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    // Check if the episode exists to validate ID
    const { data: episode, error } = await supabase
      .from("episodes")
      .select("media_type, season_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !episode) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (episode.media_type !== "video") {
      return NextResponse.json({ error: "Episode is not a video" }, { status: 400 });
    }

    // Authorization Check: Verify that the season belongs to the authenticated user
    const { data: season } = await supabase
      .from("seasons")
      .select("profile_id")
      .eq("id", episode.season_id)
      .maybeSingle();

    if (!season) {
      return NextResponse.json({ error: "Forbidden: Owner verification failed" }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", season.profile_id)
      .maybeSingle();

    if (!profile || profile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this video memory" }, { status: 403 });
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
