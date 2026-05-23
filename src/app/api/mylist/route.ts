import { NextResponse } from "next/server";
import { supabase, mapSeason } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

// Helper: Verify that a profile belongs to the user
async function verifyProfileOwner(profileId: string, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();

  return profile?.user_id === userId;
}

// GET bookmark list items or check status
export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const seasonId = searchParams.get("seasonId");

    if (!profileId) {
      return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
    }

    // Authorization Check: Verify profile ownership
    const isOwner = await verifyProfileOwner(profileId, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    if (seasonId) {
      // Check if specific season is bookmarked
      const { data: bookmark, error } = await supabase
        .from("my_list")
        .select("*")
        .eq("profile_id", profileId)
        .eq("season_id", seasonId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return NextResponse.json({ isBookmarked: !!bookmark });
    }

    // Otherwise return all bookmarked seasons
    const { data: list, error } = await supabase
      .from("my_list")
      .select(`
        *,
        season:seasons(
          *,
          episodes:episodes(*)
        )
      `)
      .eq("profile_id", profileId)
      .order("added_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mappedSeasons = (list || [])
      .map((item: any) => mapSeason(item.season))
      .filter(Boolean);

    return NextResponse.json(mappedSeasons);
  } catch (error: any) {
    console.error("API Get MyList Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST add a bookmark
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { profileId, seasonId } = body;

    if (!profileId || !seasonId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Authorization Check: Verify profile ownership
    const isOwner = await verifyProfileOwner(profileId, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const { data: bookmark, error } = await supabase
      .from("my_list")
      .upsert({
        profile_id: profileId,
        season_id: seasonId,
      }, { onConflict: "profile_id,season_id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(bookmark);
  } catch (error: any) {
    console.error("API Create MyList Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE remove a bookmark
export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const seasonId = searchParams.get("seasonId");

    if (!profileId || !seasonId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Authorization Check: Verify profile ownership
    const isOwner = await verifyProfileOwner(profileId, user?.id || "");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const { error } = await supabase
      .from("my_list")
      .delete()
      .eq("profile_id", profileId)
      .eq("season_id", seasonId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Delete MyList Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
