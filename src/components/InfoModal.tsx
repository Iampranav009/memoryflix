"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { X, Play, Heart, HeartOff, Clock, Calendar, Film, Share2, Copy, Check, Plus, ThumbsUp } from "lucide-react";
import axios from "axios";
import { DbEpisode } from "@/types";

export default function InfoModal() {
  const { activeInfoSeason, setActiveInfoSeason, activeProfile, setActivePlayback } = useStore();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  
  // Sharing States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAccess, setShareAccess] = useState<"viewer" | "editor">("viewer");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!activeProfile || !activeInfoSeason) return;
      try {
        const res = await axios.get(
          `/api/mylist?profileId=${activeProfile.id}&seasonId=${activeInfoSeason.id}`
        );
        setIsBookmarked(res.data.isBookmarked);
      } catch (err) {
        console.error("Error checking bookmark status:", err);
      }
    };

    checkBookmarkStatus();
  }, [activeInfoSeason, activeProfile]);

  if (!activeInfoSeason) return null;

  const episodes = activeInfoSeason.episodes || [];
  
  // Calculate date range of memories inside season
  let dateRangeText = "";
  if (episodes.length > 0) {
    const dates = episodes
      .map(e => new Date(e.memoryDate).getTime())
      .filter(t => !isNaN(t));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      const format = (d: Date) => d.toLocaleDateString("en-US", { year: 'numeric', month: 'short' });
      dateRangeText = minDate.getTime() === maxDate.getTime() 
        ? format(minDate) 
        : `${format(minDate)} — ${format(maxDate)}`;
    }
  }

  const handleToggleBookmark = async () => {
    if (!activeProfile || !activeInfoSeason || loadingBookmark) return;
    setLoadingBookmark(true);
    try {
      if (isBookmarked) {
        await axios.delete(
          `/api/mylist?profileId=${activeProfile.id}&seasonId=${activeInfoSeason.id}`
        );
        setIsBookmarked(false);
      } else {
        await axios.post("/api/mylist", {
          profileId: activeProfile.id,
          seasonId: activeInfoSeason.id
        });
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handlePlaySeason = () => {
    if (episodes.length > 0) {
      setActivePlayback(episodes[0], episodes);
      setActiveInfoSeason(null); // Close modal on play
    }
  };

  const handlePlayEpisode = (episode: DbEpisode) => {
    setActivePlayback(episode, episodes);
    setActiveInfoSeason(null); // Close modal on play
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "0s";
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Helper to generate the exact Google Drive style access link
  const getShareLink = () => {
    if (typeof window === "undefined" || !activeInfoSeason) return "";
    const origin = window.location.origin;
    const id = activeInfoSeason.id;
    const access = shareAccess;
    const ownerName = activeProfile?.name || "Vault";
    const ownerAvatar = activeProfile?.avatarUrl || "";
    return `${origin}/season/share?id=${id}&access=${access}&ownerName=${encodeURIComponent(ownerName)}&ownerAvatar=${encodeURIComponent(ownerAvatar)}`;
  };

  const handleCopyLink = async () => {
    const link = getShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div 
      onClick={() => setActiveInfoSeason(null)}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md select-none font-sans animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[850px] bg-[#181818] rounded-[18px] overflow-hidden my-8 shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-zoom-in"
      >
        
        {/* Hero Banner Header */}
        <div className="relative h-64 sm:h-[480px] w-full">
          <img
            src={activeInfoSeason.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800"}
            alt={activeInfoSeason.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#181818]/60 via-transparent to-transparent"></div>
          
          {/* Close Button */}
          <button
            onClick={() => setActiveInfoSeason(null)}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-[#181818]/60 hover:bg-[#181818] text-white transition-all duration-200 cursor-pointer"
            title="Close Details"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Hero Overlay text & triggers */}
          <div className="absolute bottom-10 left-8 md:left-12 right-8 md:right-12">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black mb-6 tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              {activeInfoSeason.title}
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePlaySeason}
                disabled={episodes.length === 0}
                className="px-6 py-2 sm:px-8 sm:py-2.5 rounded font-bold bg-white text-black hover:bg-white/80 disabled:opacity-50 transition-all duration-300 flex items-center gap-3 cursor-pointer text-base tracking-wide"
              >
                <Play className="w-7 h-7 fill-current" />
                Play
              </button>
              
              <button
                onClick={handleToggleBookmark}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-white/50 text-white hover:border-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer bg-[#2a2a2a]/60"
                title={isBookmarked ? "Remove from My List" : "Add to My List"}
              >
                {isBookmarked ? (
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                ) : (
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                )}
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-white/50 text-white hover:border-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer bg-[#2a2a2a]/60"
                title="Share Collection"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
              </button>
            </div>
          </div>
        </div>

        {/* Show Information */}
        <div className="px-8 md:px-12 py-4 space-y-10 bg-[#181818]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left side details */}
            <div className="md:col-span-2 space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base text-white">
                <span className="text-[#46d369] font-bold">New</span>
                {dateRangeText && (
                  <span className="font-medium">
                    {dateRangeText}
                  </span>
                )}
                <span className="border border-white/40 text-[#a3a3a3] px-1.5 rounded-sm text-xs font-medium">
                  U/A 16+
                </span>
                <span className="font-medium text-[#a3a3a3]">
                  {episodes.length} Episodes
                </span>
                <span className="border border-white/40 text-[#a3a3a3] px-1.5 rounded-sm text-xs font-medium">
                  HD
                </span>
              </div>
              <p className="text-white text-sm sm:text-base leading-relaxed">
                {activeInfoSeason.description || "A dogged police officer investigates a journalist's murder, even as trouble brews close to home."}
              </p>
            </div>

            {/* Right side attributes */}
            <div className="text-sm space-y-3">
              <div>
                <span className="text-[#777] font-medium mr-1">Cast:</span>
                <span className="text-white font-medium hover:underline cursor-pointer">{activeProfile?.name || "User"},</span>
                <span className="text-white font-medium italic ml-1 hover:underline cursor-pointer">more</span>
              </div>
              <div>
                <span className="text-[#777] font-medium mr-1">Genres:</span>
                <span className="text-white font-medium hover:underline cursor-pointer">Memories, Life Events, Home Videos</span>
              </div>
              <div>
                <span className="text-[#777] font-medium mr-1">This Collection Is:</span>
                <span className="text-white font-medium hover:underline cursor-pointer">Nostalgic, Emotional</span>
              </div>
            </div>
          </div>

          {/* Episode List Section */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-wide text-white">Episodes</h3>
              <span className="text-xs sm:text-sm font-bold text-white/40 uppercase tracking-widest">{episodes.length} Episodes</span>
            </div>

            {episodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 rounded-xl border border-dashed border-white/15 bg-black/20">
                <Film className="w-12 h-12 text-white/15 mb-3" />
                <p className="text-white/60 font-bold text-center text-sm sm:text-base">
                  No memories in this collection yet.
                </p>
                <p className="text-white/35 text-xs text-center mt-1">
                  Click the &quot;Add Memory&quot; button inside the season page to capture your story!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 bg-black/10 rounded-xl border border-white/5 overflow-hidden">
                {episodes.map((episode, idx) => (
                  <div
                    key={episode.id}
                    onClick={() => handlePlayEpisode(episode)}
                    className="flex flex-col sm:flex-row items-start gap-4 p-5 sm:p-6 hover:bg-white/5 transition-all duration-300 group cursor-pointer border-b border-white/5 last:border-b-0"
                  >
                    {/* Index */}
                    <span className="text-xl sm:text-2xl font-black text-netflix-gray group-hover:text-white transition-colors w-6 sm:w-8 hidden sm:block self-center text-center">
                      {idx + 1}
                    </span>

                    {/* Thumbnail box */}
                    <div className="relative w-full sm:w-40 md:w-48 aspect-video rounded-md overflow-hidden shadow-lg flex-shrink-0 bg-[#222] border border-white/10">
                      <img
                        src={episode.thumbnailUrl || activeInfoSeason.thumbnailUrl || "https://images.unsplash.com/photo-1542204172-e7052809f85e?q=80&w=400"}
                        alt={episode.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-all duration-500"
                      />
                      
                      {/* Play overlay button on thumbnail hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <div className="p-2.5 rounded-full bg-black/70 border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Video/Photo Tag */}
                      <span className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase font-black tracking-widest bg-black/85 text-white border ${
                        episode.mediaType === "video" ? "text-red-400 border-red-500/20" : "text-emerald-400 border-emerald-500/20"
                      }`}>
                        {episode.mediaType}
                      </span>
                    </div>

                    {/* Description Area */}
                    <div className="flex-grow space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2">
                        <h4 className="text-base sm:text-lg font-extrabold text-white group-hover:text-netflix-red transition-colors leading-tight">
                          {episode.title}
                        </h4>
                        
                        <div className="flex items-center gap-2.5 text-xs text-white/40 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(episode.durationSeconds)}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(episode.memoryDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-white/55 text-xs sm:text-sm leading-relaxed line-clamp-3 md:line-clamp-2">
                        {episode.description || "No description provided for this memory."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Elegant Glassmorphic Pop-up Share Dialog */}
      {showShareModal && (
        <div 
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] bg-[#181818] rounded-xl border border-white/10 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-zoom-in"
          >
            {/* Crimson accent line top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E50914] rounded-t-xl"></div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Share Memory Collection</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded hover:bg-white/5 border border-white/10 text-white cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Access dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-netflix-gray block">Access Permission</label>
                <div className="relative">
                  <select
                    value={shareAccess}
                    onChange={(e) => setShareAccess(e.target.value as "viewer" | "editor")}
                    className="w-full py-2.5 px-4 bg-[#2f2f2f]/60 hover:bg-[#2f2f2f]/90 border border-white/10 focus:border-white focus:outline-none rounded text-white text-sm transition-all cursor-pointer appearance-none uppercase font-bold tracking-wider"
                  >
                    <option value="viewer">Viewer (Stream and Read Only)</option>
                    <option value="editor">Editor (Full Edit, Add, Reorder & Delete)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed font-medium">
                  {shareAccess === "viewer" 
                    ? "Anyone with the link can view description and stream episodes. No edits allowed."
                    : "Anyone with the link gets complete administrative rights (edit info, add episodes, reorder list, delete)."}
                </p>
              </div>

              {/* URL with interactive copy */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-netflix-gray block">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareLink()}
                    className="flex-grow py-2 px-3 bg-black/40 border border-white/10 rounded text-xs text-white/80 focus:outline-none font-mono select-all truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-white text-black font-extrabold hover:bg-white/80 transition-all rounded text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600 stroke-[3]" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Done button */}
              <div className="flex justify-end pt-3 border-t border-white/5">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded text-xs uppercase tracking-widest cursor-pointer shadow active:scale-95 transition-all text-center"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
