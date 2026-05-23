"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Play, Heart, HeartOff, Info, Clock, Calendar } from "lucide-react";
import { DbSeason, DbEpisode, DbSeries } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { safeLocalStorage } from "@/lib/cookies";

interface MemoryCardProps {
  item: DbSeason | DbEpisode | DbSeries;
  type: "season" | "episode" | "series";
  rowTitle?: string;
}

export default function MemoryCard({ item, type, rowTitle }: MemoryCardProps) {
  const { setActiveInfoSeason, setActivePlayback, activeProfile } = useStore();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [watchCount, setWatchCount] = useState(0);

  // Check if bookmarked (only for seasons)
  useEffect(() => {
    const checkBookmark = async () => {
      if (type !== "season" || !activeProfile || !item.id) return;
      try {
        const res = await axios.get(
          `/api/mylist?profileId=${activeProfile.id}&seasonId=${item.id}`
        );
        setIsBookmarked(res.data.isBookmarked);
      } catch (err) {
        console.error("Error checking card bookmark:", err);
      }
    };
    
    checkBookmark();
  }, [item.id, type, activeProfile]);

  // Sync watch count from localStorage
  useEffect(() => {
    const fetchWatchCount = () => {
      if (typeof window === "undefined" || !item.id) return;
      const profileId = activeProfile ? activeProfile.id : "default";
      const key = type === "season"
        ? `memoryflix_watch_count_${profileId}_season_${item.id}`
        : `memoryflix_watch_count_${profileId}_ep_${item.id}`;
      const count = parseInt(safeLocalStorage.getItem(key) || "0", 10);
      setWatchCount(count);
    };

    fetchWatchCount();

    // Listen for watch count increments to keep cards updated in real-time
    const handleWatchIncrement = () => fetchWatchCount();
    window.addEventListener("memoryflix_watch_incremented", handleWatchIncrement);
    return () => {
      window.removeEventListener("memoryflix_watch_incremented", handleWatchIncrement);
    };
  }, [item.id, type, activeProfile]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Developer convenience: hold shift to instantly watch 11 times
    if (e.shiftKey && typeof window !== "undefined" && activeProfile) {
      const profileId = activeProfile.id;
      if (type === "season" && item.id) {
        safeLocalStorage.setItem(`memoryflix_watch_count_${profileId}_season_${item.id}`, "11");
        const firstEpId = (item as DbSeason).episodes?.[0]?.id;
        if (firstEpId) {
          safeLocalStorage.setItem(`memoryflix_watch_count_${profileId}_ep_${firstEpId}`, "11");
        }
      } else if (type === "episode" && item.id) {
        safeLocalStorage.setItem(`memoryflix_watch_count_${profileId}_ep_${item.id}`, "11");
        const seasonId = (item as DbEpisode).seasonId;
        if (seasonId) {
          safeLocalStorage.setItem(`memoryflix_watch_count_${profileId}_season_${seasonId}`, "11");
        }
      }
      window.dispatchEvent(new Event("memoryflix_watch_incremented"));
    }
    
    // Intercept if this is a shared season
    if (type === "season" && (item as DbSeason).isShared && (item as DbSeason).shareUrl) {
      router.push((item as DbSeason).shareUrl!);
      return;
    }

    if (type === "series") {
      router.push(`/series/${item.id}`);
      return;
    }

    if (type === "episode") {
      const episode = item as DbEpisode;
      setActivePlayback(episode, [episode]);
    } else {
      const season = item as DbSeason;
      const episodes = season.episodes || [];
      if (episodes.length > 0) {
        setActivePlayback(episodes[0], episodes);
      }
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Intercept if this is a shared season
    if (type === "season" && (item as DbSeason).isShared && (item as DbSeason).shareUrl) {
      router.push((item as DbSeason).shareUrl!);
      return;
    }

    if (type === "series") {
      router.push(`/series/${item.id}`);
      return;
    }

    if (type === "season") {
      setActiveInfoSeason(item as DbSeason);
    } else {
      const episode = item as DbEpisode;
      // Load parent season details for info modal
      const loadParentSeason = async () => {
        try {
          const res = await axios.get(`/api/seasons?id=${episode.seasonId}`);
          setActiveInfoSeason(res.data);
        } catch (err) {
          console.error("Failed to load parent season:", err);
        }
      };
      loadParentSeason();
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== "season" || !activeProfile || loadingBookmark) return;
    setLoadingBookmark(true);
    try {
      if (isBookmarked) {
        await axios.delete(`/api/mylist?profileId=${activeProfile.id}&seasonId=${item.id}`);
        setIsBookmarked(false);
      } else {
        await axios.post("/api/mylist", {
          profileId: activeProfile.id,
          seasonId: item.id
        });
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error("Error toggling card bookmark:", err);
    } finally {
      setLoadingBookmark(false);
    }
  };

  const title = item.title;
  const description = item.description || "";
  const thumbnail = item.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400";
  
  // Format items dates
  let dateText = "";
  if (type === "episode") {
    const episode = item as DbEpisode;
    dateText = new Date(episode.memoryDate).toLocaleDateString("en-US", { year: 'numeric', month: 'short' });
  } else if (type === "series") {
    const series = item as DbSeries;
    dateText = new Date(series.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } else {
    const season = item as DbSeason;
    const episodes = season.episodes || [];
    if (episodes.length > 0) {
      const years = episodes.map(e => new Date(e.memoryDate).getFullYear()).filter(y => !isNaN(y));
      if (years.length > 0) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        dateText = minYear === maxYear ? `${minYear}` : `${minYear} - ${maxYear}`;
      }
    }
  }

  // Dynamic sizes based on Season vs Chapter (Episode)
  const sizeClasses = type === "season" || type === "series"
    ? "w-52 sm:w-64 md:w-72"
    : "w-44 sm:w-52 md:w-60";

  const hoverSizeClasses = type === "season" || type === "series"
    ? "w-60 sm:w-72 md:w-80"
    : "w-52 sm:w-60 md:w-68";

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleInfoClick}
      className={`relative flex-shrink-0 ${sizeClasses} aspect-video bg-[#181818] rounded-md select-none cursor-pointer border border-white/5 transition-all duration-300 hover:z-30 group`}
    >
      {/* Standard Card view */}
      <div className="w-full h-full relative rounded-md overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-[0.85]"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent"></div>

        {/* Dynamic Top-Left Most Viewed Tag */}
        {watchCount > 10 && (
          <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-sm font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-md bg-[#E50914] text-white border border-white/10 select-none">
            Most Viewed
          </div>
        )}

        {/* Header Label inside standard view */}
        <div className="absolute bottom-2.5 left-3 right-3 text-xs md:text-sm font-extrabold truncate tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
          {title}
        </div>
      </div>

      {/* Hover Popup Overlay (Cinematic Netflix-Style zoom preview) */}
      {hovered && (
        <div className={`absolute -top-12 -left-4 ${hoverSizeClasses} bg-[#181818] rounded-lg shadow-[0_15px_35px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden z-40 animate-zoom-in scale-[1.08] transition-all duration-300`}>
          {/* Card Media Header */}
          <div className="relative aspect-video w-full">
            <img 
              src={thumbnail} 
              alt={title} 
              className="w-full h-full object-cover"
            />
            {type === "episode" && (
              <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-black/85 text-white border ${
                (item as DbEpisode).mediaType === "video" ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"
              }`}>
                {(item as DbEpisode).mediaType}
              </span>
            )}
          </div>

          {/* Interactive metadata body */}
          <div className="p-4 space-y-3 font-sans bg-[#181818]">
            
            {/* Buttons Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayClick}
                  className="p-2 bg-white text-black rounded-full hover:bg-white/80 hover:scale-108 transition-all flex items-center justify-center cursor-pointer shadow-lg"
                  title="Play"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
                
                {type === "season" && (
                  <button
                    onClick={handleToggleBookmark}
                    className="p-1.5 border border-white/35 text-white/80 rounded-full hover:border-white hover:text-white hover:bg-white/5 hover:scale-108 transition-all flex items-center justify-center cursor-pointer"
                    title={isBookmarked ? "Remove from list" : "Add to list"}
                  >
                    {isBookmarked ? (
                      <HeartOff className="w-4 h-4 text-netflix-red fill-current" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={handleInfoClick}
                className="p-1.5 border border-white/35 text-white/80 rounded-full hover:border-white hover:text-white hover:bg-white/5 hover:scale-108 transition-all flex items-center justify-center cursor-pointer"
                title="More Info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <h4 className="text-sm font-extrabold tracking-wide truncate text-white/95">{title}</h4>

            {/* Dynamic Tags Row on Hover */}
            {watchCount > 10 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border bg-emerald-950/40 text-emerald-400 border-emerald-500/20">
                  Most Viewed
                </span>
              </div>
            )}

            {/* Description Snippet */}
            {description && (
              <p className="text-white/60 text-[10px] leading-snug line-clamp-2">
                {description}
              </p>
            )}

            {/* Metadata Footer */}
            <div className="flex items-center gap-3 text-[9px] text-white/40 font-bold border-t border-white/5 pt-2 select-none">
              {dateText && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {dateText}
                </span>
              )}
              {type === "season" ? (
                <span className="border border-white/25 px-1.5 py-0.2 rounded text-[8px] font-black text-white/85">
                  {(item as DbSeason).episodes?.length || 0} EPISODES
                </span>
              ) : type === "series" ? (
                <span className="border border-white/25 px-1.5 py-0.2 rounded text-[8px] font-black text-white/85">
                  {((item as DbSeries).seasons?.length || 0)} SEASONS
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#808080] font-black">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(((item as DbEpisode).durationSeconds || 0) / 60) || 0}m
                </span>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
