"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Row from "@/components/Row";
import MemoryCard from "@/components/MemoryCard";
import InfoModal from "@/components/InfoModal";
import MediaPlayer from "@/components/MediaPlayer";
import { Play, Info, Plus, Check, Loader2, Sparkles, FolderHeart } from "lucide-react";
import axios from "axios";
import { DbSeason, DbEpisode } from "@/types";

export default function BrowsePage() {
  const { 
    dbUser, 
    activeProfile, 
    setActiveInfoSeason, 
    setActivePlayback 
  } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const filterMyList = searchParams.get("myList") === "true";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    hero: DbSeason | null;
    seasons: DbSeason[];
    recentlyAdded: DbEpisode[];
    myList: DbSeason[];
    continueWatching: DbEpisode[];
  }>({
    hero: null,
    seasons: [],
    recentlyAdded: [],
    myList: [],
    continueWatching: []
  });

  const [sharedSeasons, setSharedSeasons] = useState<DbSeason[]>([]);

  const [isHeroBookmarked, setIsHeroBookmarked] = useState(false);
  const [loadingHeroBookmark, setLoadingHeroBookmark] = useState(false);

  const fetchDashboardData = async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/browse?profileId=${activeProfile.id}`);
      setData(res.data);

      // Check if the hero season is bookmarked
      if (res.data.hero) {
        const bmRes = await axios.get(
          `/api/mylist?profileId=${activeProfile.id}&seasonId=${res.data.hero.id}`
        );
        setIsHeroBookmarked(bmRes.data.isBookmarked);
      }
    } catch (err) {
      console.error("Error fetching browse dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      fetchDashboardData();
    }
  }, [activeProfile]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sharedListString = localStorage.getItem("memoryflix_shared_seasons") || "[]";
        const sharedList = JSON.parse(sharedListString);
        const mapped = sharedList.map((item: any) => ({
          ...item,
          isShared: true
        }));
        setSharedSeasons(mapped);
      } catch (err) {
        console.error("Error reading shared seasons from storage:", err);
      }
    }
  }, [activeProfile]);

  const handlePlayHero = () => {
    if (data.hero) {
      const episodes = data.hero.episodes || [];
      if (episodes.length > 0) {
        setActivePlayback(episodes[0], episodes);
      }
    }
  };

  const handleHeroBookmarkToggle = async () => {
    if (!activeProfile || !data.hero || loadingHeroBookmark) return;
    setLoadingHeroBookmark(true);
    try {
      if (isHeroBookmarked) {
        await axios.delete(`/api/mylist?profileId=${activeProfile.id}&seasonId=${data.hero.id}`);
        setIsHeroBookmarked(false);
        // Refresh myList data dynamically
        const bmUpdate = await axios.get(`/api/mylist?profileId=${activeProfile.id}`);
        setData(prev => ({ ...prev, myList: bmUpdate.data }));
      } else {
        await axios.post("/api/mylist", {
          profileId: activeProfile.id,
          seasonId: data.hero.id
        });
        setIsHeroBookmarked(true);
        // Refresh myList data dynamically
        const bmUpdate = await axios.get(`/api/mylist?profileId=${activeProfile.id}`);
        setData(prev => ({ ...prev, myList: bmUpdate.data }));
      }
    } catch (err) {
      console.error("Error toggling hero bookmark:", err);
    } finally {
      setLoadingHeroBookmark(false);
    }
  };

  // Perform search query filtering client-side for immediate lightning-fast responses
  const getFilteredResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const matchedSeasons: { item: DbSeason; score: number; type: "season" }[] = [];
    const matchedEpisodes: { item: DbEpisode; score: number; type: "episode" }[] = [];

    // Search seasons
    data.seasons.forEach((season) => {
      let score = 0;
      if (season.title.toLowerCase().includes(q)) score += 10;
      if (season.description?.toLowerCase().includes(q)) score += 3;
      
      if (score > 0) {
        matchedSeasons.push({ item: season, score, type: "season" });
      }
    });

    // Search episodes
    const allEpisodes = data.seasons.flatMap(s => s.episodes || []);
    allEpisodes.forEach((episode) => {
      let score = 0;
      if (episode.title.toLowerCase().includes(q)) score += 10;
      if (episode.description?.toLowerCase().includes(q)) score += 3;
      
      if (score > 0) {
        matchedEpisodes.push({ item: episode, score, type: "episode" });
      }
    });

    // Combine and sort by score
    const combined = [
      ...matchedSeasons,
      ...matchedEpisodes
    ].sort((a, b) => b.score - a.score);

    return combined;
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#E50914] animate-spin mx-auto" />
          <p className="text-white/60">Redirecting to profile selection...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
            <span className="text-sm text-white/50 tracking-wider">Syncing Vault...</span>
          </div>
        </div>
      </div>
    );
  }

  const searchResults = getFilteredResults();
  const isSearchActive = !!searchQuery;

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 font-sans select-none overflow-x-hidden">
      <Navbar />

      {/* RENDER DYNAMIC VIEW PANEL */}
      {isSearchActive ? (
        // 1. Search Results Layout Grid
        <div className="pt-28 px-6 md:px-16 space-y-6">
          <h2 className="text-lg md:text-2xl text-white/60 font-semibold tracking-wide">
            Search results for: <span className="text-white font-bold">&quot;{searchQuery}&quot;</span>
          </h2>
          
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white/2 rounded-lg border border-white/5">
              <Sparkles className="w-12 h-12 text-white/20" />
              <p className="text-white/70 font-semibold text-lg">No matching memories found.</p>
              <p className="text-white/40 text-sm max-w-md">Try searching for other terms, folder names, people tags, or describe the specific content you are looking for.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-16 py-6 overflow-visible">
              {searchResults.map((result, idx) => (
                <div key={`${result.type}-${result.item.id}-${idx}`} className="relative h-28 overflow-visible flex justify-center">
                  <MemoryCard item={result.item} type={result.type} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filterMyList ? (
        // 2. Bookmark My List Grid View
        <div className="pt-28 px-6 md:px-16 space-y-6">
          <div className="flex items-center gap-3">
            <FolderHeart className="w-7 h-7 text-[#E50914]" />
            <h2 className="text-xl md:text-3xl font-black tracking-wide">My Saved Memory Collections</h2>
          </div>
          
          {data.myList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white/2 rounded-lg border border-white/5">
              <Sparkles className="w-12 h-12 text-white/20 animate-pulse" />
              <p className="text-white/70 font-semibold text-lg">Your List is currently empty.</p>
              <p className="text-white/40 text-sm max-w-sm">Tap the Heart icon on any memory card or detail banner to add collections to your list.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-16 py-6 overflow-visible">
              {data.myList.map((season) => (
                <div key={season.id} className="relative h-28 overflow-visible flex justify-center">
                  <MemoryCard item={season} type="season" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // 3. Normal Home Layout Dashboard
        <div className="space-y-10 overflow-visible">
          
          {/* A. Hero Banner Section */}
          {data.hero ? (
            <div className="relative w-full h-[65vw] sm:h-[56.25vw] min-h-[400px] md:min-h-[350px] max-h-[85vh] flex items-end select-none font-sans overflow-hidden group">
              {/* Cinematic smooth zoom-in background thumbnail */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] cubic-bezier(0.25, 1, 0.5, 1) group-hover:scale-108"
                style={{
                  backgroundImage: `url(${data.hero.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600"})`
                }}
              />
              {/* Linear gradient overlays for premium Netflix look */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/30 to-transparent z-[1]" />
              <div className="absolute inset-0 bg-black/15 z-[1]" />

              {/* Left Overlay Content */}
              <div className="absolute bottom-10 md:bottom-20 left-6 md:left-16 right-6 md:right-1/3 space-y-4 z-10">
                
                {/* Special Tag */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 px-2.5 py-1 rounded w-fit text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
                  Featured Collection
                </div>

                {/* Massive Title */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wide drop-shadow-lg leading-tight uppercase">
                  {data.hero.title}
                </h1>

                {/* Description Snippet */}
                {data.hero.description && (
                  <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed drop-shadow line-clamp-3 md:line-clamp-4">
                    {data.hero.description}
                  </p>
                )}

                {/* Triggers */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 pt-2">
                  <button
                    onClick={handlePlayHero}
                    disabled={!data.hero.episodes || data.hero.episodes.length === 0}
                    className="px-5 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3.5 rounded font-bold bg-white text-black hover:bg-white/80 disabled:opacity-50 disabled:hover:bg-white transition-colors flex items-center gap-2 md:gap-2.5 shadow-xl cursor-pointer text-sm sm:text-base"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    Play
                  </button>
                  
                  <button
                    onClick={() => setActiveInfoSeason(data.hero)}
                    className="px-5 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3.5 rounded font-bold bg-[#808080]/30 hover:bg-[#808080]/40 text-white backdrop-blur border border-white/5 transition-colors flex items-center gap-2 md:gap-2.5 shadow-xl cursor-pointer text-sm sm:text-base"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                    More Info
                  </button>

                  <button
                    onClick={handleHeroBookmarkToggle}
                    disabled={loadingHeroBookmark}
                    className="p-2 sm:p-3 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 text-white transition-colors cursor-pointer flex-shrink-0"
                    title={isHeroBookmarked ? "Remove from List" : "Add to List"}
                  >
                    {isHeroBookmarked ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 font-bold" />
                    ) : (
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Empty Hero fallback (Initial Setup UI)
            <div className="h-[40vh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-red-950/20 to-[#141414] border-b border-white/5 pt-24 px-4 text-center">
              <h2 className="text-2xl md:text-4xl font-extrabold mb-3">Begin Your Streaming Vault</h2>
              <p className="text-white/60 text-sm md:text-base max-w-lg mb-6">
                Organize your life memories into Season collections and Episode memories. Click below to create your first collection!
              </p>
              <button 
                onClick={() => router.push("/memories")}
                className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#b80710] transition-colors shadow-lg cursor-pointer"
              >
                Create Season Collection
              </button>
            </div>
          )}

          {/* B. Horizontal lanes list */}
          <div className="space-y-12 md:space-y-16 pb-12 overflow-visible relative z-10 select-none">
            
            {/* 1. Continue watching */}
            {data.continueWatching.length > 0 && (
              <Row 
                title="Continue Watching" 
                items={data.continueWatching} 
                type="episode" 
              />
            )}

            {/* 2. Recently added memories */}
            {data.recentlyAdded.length > 0 && (
              <Row 
                title="Recently Added Memories" 
                items={data.recentlyAdded} 
                type="episode" 
              />
            )}

            {/* 3. My bookmark list */}
            {data.myList.length > 0 && (
              <Row 
                title="My List" 
                items={data.myList} 
                type="season" 
              />
            )}

            {/* Shared with Me Row */}
            {sharedSeasons.length > 0 && (
              <Row 
                title="Shared with Me" 
                items={sharedSeasons} 
                type="season" 
              />
            )}

            {/* 4. Complete seasons row */}
            {data.seasons.length > 0 ? (
              <Row 
                title="All Collections" 
                items={data.seasons} 
                type="season" 
              />
            ) : (
              data.hero && (
                <div className="px-6 md:px-16 text-white/40 text-sm font-medium py-4 select-none">
                  No other show collections added yet. Tap memories above or click Switch Profile.
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* LAYOUT FLOATING PORTALS */}
      <InfoModal />
      <MediaPlayer />
    </div>
  );
}
