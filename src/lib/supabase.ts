import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Sign in with Google using Supabase OAuth
export const signInWithGoogle = async (redirectTo?: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo || `${window.location.origin}/browse`,
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Supabase OAuth Error:", error);
    throw error;
  }
};

// Logout helper
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase SignOut Error:", error);
    throw error;
  }
};

// Model Mappers to map database snake_case fields back to client camelCase fields
export const mapUser = (user: any) => user ? ({
  id: user.id,
  firebaseUid: user.firebase_uid,
  email: user.email,
  name: user.name,
  photoUrl: user.photo_url,
  createdAt: user.created_at,
  planName: user.plan_name || "free",
  storageLimitMb: Number(user.storage_limit_mb || 500),
  razorpaySubscriptionId: user.razorpay_subscription_id || null,
  razorpayPaymentId: user.razorpay_payment_id || null,
}) : null;

export const mapProfile = (profile: any) => profile ? ({
  id: profile.id,
  userId: profile.user_id,
  name: profile.name,
  avatarUrl: profile.avatar_url,
  createdAt: profile.created_at,
}) : null;

export const mapEpisode = (episode: any) => episode ? ({
  id: episode.id,
  seasonId: episode.season_id,
  title: episode.title,
  description: episode.description,
  thumbnailUrl: episode.thumbnail_url,
  mediaUrl: episode.media_url,
  mediaType: episode.media_type,
  episodeNumber: episode.episode_number,
  memoryDate: episode.memory_date,
  durationSeconds: episode.duration_seconds,
  createdAt: episode.created_at,
}) : null;

export const mapSeason = (season: any) => {
  if (!season) return null;
  const mapped = {
    id: season.id,
    profileId: season.profile_id,
    title: season.title,
    description: season.description,
    thumbnailUrl: season.thumbnail_url,
    createdAt: season.created_at,
    displayOrder: season.display_order,
    featured: season.featured,
    episodes: undefined as any,
  };
  if (season.episodes && Array.isArray(season.episodes)) {
    mapped.episodes = season.episodes
      .map(mapEpisode)
      .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);
  }
  return mapped;
};
