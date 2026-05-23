import { NextResponse } from "next/server";
import { supabase } from "./supabase";

export interface AuthenticatedUser {
  id: string; // Database User UUID
  firebaseUid: string; // Supabase Auth User ID
  email: string;
  planName: string;
  storageLimitMb: number;
}

/**
 * Extracts and validates the Authorization Bearer token from request headers,
 * then retrieves and matches the authenticated user record from the database.
 * 
 * @param request The standard NextJS request object
 */
export async function verifyAuth(request: Request): Promise<{
  user: AuthenticatedUser | null;
  errorResponse: NextResponse | null;
}> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Missing or invalid token format" },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Token is empty" },
          { status: 401 }
        ),
      };
    }

    // Verify token with Supabase auth API
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !supabaseUser) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Invalid or expired session token" },
          { status: 401 }
        ),
      };
    }

    // Retrieve corresponding user from DB using the Supabase UID (stored in firebase_uid field)
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("*")
      .eq("firebase_uid", supabaseUser.id)
      .maybeSingle();

    if (dbError) {
      console.error("verifyAuth DB retrieval error:", dbError);
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: "Internal Server Error: Database check failed" },
          { status: 500 }
        ),
      };
    }

    // Proactive Sync Fallback:
    // If the user is valid in Supabase Auth but their DB record is somehow missing,
    // gracefully upsert/create them here on the fly to prevent downstream errors.
    if (!dbUser) {
      console.log(`verifyAuth Proactive Sync: Syncing missing user record for Supabase UID ${supabaseUser.id}`);
      const { data: syncedUser, error: syncError } = await supabase
        .from("users")
        .upsert(
          {
            firebase_uid: supabaseUser.id,
            email: supabaseUser.email || "",
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            photo_url: supabaseUser.user_metadata?.avatar_url || null,
          },
          { onConflict: "firebase_uid" }
        )
        .select()
        .single();

      if (syncError || !syncedUser) {
        console.error("verifyAuth Proactive Sync failed:", syncError);
        return {
          user: null,
          errorResponse: NextResponse.json(
            { error: "Unauthorized: User record could not be synchronized" },
            { status: 401 }
          ),
        };
      }

      return {
        user: {
          id: syncedUser.id,
          firebaseUid: syncedUser.firebase_uid,
          email: syncedUser.email,
          planName: syncedUser.plan_name || "free",
          storageLimitMb: Number(syncedUser.storage_limit_mb || 500),
        },
        errorResponse: null,
      };
    }

    return {
      user: {
        id: dbUser.id,
        firebaseUid: dbUser.firebase_uid,
        email: dbUser.email,
        planName: dbUser.plan_name || "free",
        storageLimitMb: Number(dbUser.storage_limit_mb || 500),
      },
      errorResponse: null,
    };
  } catch (error: any) {
    console.error("verifyAuth Internal Exception:", error);
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Internal Server Error during verification" },
        { status: 500 }
      ),
    };
  }
}
