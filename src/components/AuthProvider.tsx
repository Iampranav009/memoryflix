"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { getCookie, safeLocalStorage } from "@/lib/cookies";

// Register global Axios interceptor to automatically attach Supabase Auth JWT token to all API requests
let isInterceptorRegistered = false;
if (typeof window !== "undefined" && !isInterceptorRegistered) {
  isInterceptorRegistered = true;
  axios.interceptors.request.use(
    async (config) => {
      try {
        const isS3Request = config.url?.includes("amazonaws.com");
        const isAbsoluteUrl = config.url?.startsWith("http://") || config.url?.startsWith("https://");
        
        if (!isS3Request && (!isAbsoluteUrl || (typeof window !== "undefined" && config.url?.startsWith(window.location.origin)))) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        }
      } catch (err) {
        console.error("Axios interceptor error getting session:", err);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { dbUser, setDbUser, activeProfile, setActiveProfile, setIsLoading, isLoading } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Listen for auth state changes in Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
          if (session?.user) {
            const supabaseUser = session.user;
          
            // Clean hash from browser address bar if it contains OAuth tokens (synchronous, no await)
            if (typeof window !== "undefined" && (window.location.hash.includes("access_token") || window.location.hash.includes("id_token") || window.location.hash.includes("refresh_token"))) {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          
            // Sync user to DB and fetch profiles in the most parallel way possible:
            // sync must complete first to get the user ID, then immediately fetch profiles
            const response = await axios.post("/api/auth/sync", {
              firebaseUid: supabaseUser.id,
              email: supabaseUser.email || "",
              name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
              photoUrl: supabaseUser.user_metadata?.avatar_url || null,
            });
          
            const syncedUser = response.data;
            setDbUser(syncedUser);

            // Fetch profiles immediately after sync (not after any other work)
            const profilesResponse = await axios.get(`/api/profiles?userId=${syncedUser.id}`);
            const profiles = profilesResponse.data;

            const storedProfileId = getCookie("memoryflix_active_profile_id") || safeLocalStorage.getItem("memoryflix_active_profile_id");
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
              const searchParams = new URLSearchParams(window.location.search);
              const redirectParam = searchParams.get("redirect");
              const planParam = searchParams.get("plan");
              const showPricing = searchParams.get("showpricing") === "true" || (typeof window !== "undefined" && window.location.hash === "#pricing");

              if (redirectParam === "checkout" && planParam) {
                router.push(`/?redirect=checkout&plan=${planParam}`);
              } else if (showPricing) {
                // Allow logged-in user to stay on landing page to view/change pricing plans
              } else {
                if (storedProfileId && profiles.some((p: any) => p.id === storedProfileId)) {
                  router.push("/browse");
                } else {
                  router.push("/profiles");
                }
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

  useEffect(() => {
    // If auth loading is finished and user is logged in, check profile selection status
    if (!isLoading && dbUser) {
      const isPublicPage = pathname === "/login" || pathname === "/" || pathname?.startsWith("/season/share");
      // If the route is protected (non-public), and we're not already on the profiles page,
      // and they haven't selected an active profile, redirect them to the profiles selection screen
      if (!isPublicPage && pathname !== "/profiles" && !activeProfile) {
        router.push("/profiles");
      }
    }
  }, [isLoading, dbUser, activeProfile, pathname, router]);

  const isPublicPage = pathname === "/login" || pathname === "/" || pathname?.startsWith("/season/share");

  // Pages that manage their own loading/skeleton UI — don't double-show the auth skeleton for them
  const pagesWithOwnSkeleton = [
    "/browse",
    "/profiles",
    "/settings",
    "/memories",
    "/series",
    "/season",
    "/video",
  ];
  const pageHasOwnSkeleton = pagesWithOwnSkeleton.some((p) => pathname?.startsWith(p));

  if (isLoading && !isPublicPage && !pageHasOwnSkeleton) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans select-none overflow-hidden">
        {/* Shimmer Header */}
        <header className="h-16 border-b border-white/5 bg-black/60 px-6 md:px-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse"></div>
          <div className="flex gap-4">
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse"></div>
          </div>
        </header>

        {/* Shimmer Hero Banner */}
        <div className="h-[45vh] md:h-[60vh] bg-zinc-900/40 relative flex flex-col justify-end p-6 md:p-16 space-y-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="relative space-y-3 max-w-xl">
            <div className="h-4 w-28 bg-[#E50914]/20 rounded animate-pulse"></div>
            <div className="h-10 w-[70%] bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-6 w-[90%] bg-zinc-850 rounded animate-pulse"></div>
            <div className="h-6 w-[80%] bg-zinc-850 rounded animate-pulse"></div>
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Shimmer Rows */}
        <main className="p-6 md:p-16 space-y-10">
          {[1, 2].map((rowIdx) => (
            <div key={rowIdx} className="space-y-4">
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((cardIdx) => (
                  <div 
                    key={cardIdx} 
                    className="aspect-video bg-zinc-900/60 border border-white/5 rounded-md p-2 flex flex-col justify-end space-y-2 animate-pulse"
                  >
                    <div className="h-4 w-[60%] bg-zinc-800 rounded"></div>
                    <div className="h-3 w-[40%] bg-zinc-850 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
