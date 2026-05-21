"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setDbUser, setActiveProfile, setIsLoading, isLoading } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Listen for auth state changes in Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const supabaseUser = session.user;
          
          // Sync user to Supabase DB via Prisma API
          const response = await axios.post("/api/auth/sync", {
            firebaseUid: supabaseUser.id, // Using 'firebaseUid' DB field to store Supabase Auth user ID
            email: supabaseUser.email || "",
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            photoUrl: supabaseUser.user_metadata?.avatar_url || null,
          });
          
          const syncedUser = response.data;
          setDbUser(syncedUser);

          // Get profiles for user to restore active profile if stored
          const profilesResponse = await axios.get(`/api/profiles?userId=${syncedUser.id}`);
          const profiles = profilesResponse.data;

          const storedProfileId = localStorage.getItem("memoryflix_active_profile_id");
          if (storedProfileId) {
            const matchedProfile = profiles.find((p: any) => p.id === storedProfileId);
            if (matchedProfile) {
              setActiveProfile(matchedProfile);
            } else {
              setActiveProfile(null);
            }
          } else {
            setActiveProfile(null);
          }

          // If logged in and on the login/landing page, redirect based on profile choice
          if (pathname === "/login" || pathname === "/") {
            if (storedProfileId && profiles.some((p: any) => p.id === storedProfileId)) {
              router.push("/browse");
            } else {
              router.push("/profiles");
            }
          }
        } else {
          setDbUser(null);
          setActiveProfile(null);
          
          // Protect browse and profile selection pages
          if (pathname !== "/login" && pathname !== "/") {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Auth sync error:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setDbUser, setActiveProfile, setIsLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#141414] z-50">
        <div className="flex flex-col items-center">
          <h1 className="text-[#E50914] text-5xl font-black tracking-widest animate-pulse mb-6 select-none font-sans">
            MEMORYFLIX
          </h1>
          <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
