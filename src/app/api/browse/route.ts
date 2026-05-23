import { NextResponse } from "next/server";
import { supabase, mapSeason, mapEpisode } from "@/lib/supabase";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await verifyAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
    }

    // Authorization Check: Verify that this profile belongs to the user
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile || profile.user_id !== user?.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    // 1. Fetch seasons scoped to this profile along with their episodes
    const { data: seasonsData, error: seasonsError } = await supabase
      .from("seasons")
      .select("*, episodes:episodes(*)")
      .eq("profile_id", profileId)
      .order("display_order", { ascending: true });

    if (seasonsError) {
      throw seasonsError;
    }

    const seasons = (seasonsData || []).map(mapSeason).filter(Boolean);

    // 2. Fetch recently added episodes across all seasons of this profile
    const { data: episodesData, error: episodesError } = await supabase
      .from("episodes")
      .select("*, season:seasons!inner(*)")
      .eq("season.profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (episodesError) {
      throw episodesError;
    }

    const recentlyAdded = (episodesData || []).map((ep: any) => ({
      ...mapEpisode(ep),
      season: mapSeason(ep.season),
    }));

    // 3. Fetch My List items
    const { data: myListData, error: myListError } = await supabase
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

    if (myListError) {
      throw myListError;
    }

    const myList = (myListData || [])
      .map((item: any) => mapSeason(item.season))
      .filter(Boolean);

    // 4. Determine Hero Banner element (only the featured season)
    const hero = seasons.find((s: any) => s.featured) || null;

    // 5. Populate continue watching using some of recently added episodes
    const continueWatching = recentlyAdded.slice(0, 4);

    return NextResponse.json({
      hero,
      seasons,
      recentlyAdded,
      myList,
      continueWatching,
    });
  } catch (error: any) {
    console.error("API Browse Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
