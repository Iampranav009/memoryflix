"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Plus, 
  FolderPlus, 
  FolderOpen, 
  Search, 
  X, 
  Loader2, 
  Calendar, 
  Film,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  HelpCircle
} from "lucide-react";
import axios from "axios";
import { DbSeason } from "@/types";

const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=600",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600",
  "https://images.unsplash.com/photo-1472214222541-d510753a4907?q=80&w=600",
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?q=80&w=600",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600",
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=600",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=600",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600"
];

export default function MemoriesPage() {
  const { activeProfile } = useStore();
  const router = useRouter();

  const [seasons, setSeasons] = useState<DbSeason[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedCover, setSelectedCover] = useState(COVER_PRESETS[0]);
  const [creating, setCreating] = useState(false);

  // Premium Error states
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    troubleshooting?: string[];
  } | null>(null);

  const fetchSeasons = async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/seasons?profileId=${activeProfile.id}`);
      setSeasons(res.data);
    } catch (err: any) {
      console.error("Error loading seasons:", err);
      setErrorDetails({
        title: "Load Collections Failed",
        message: err.message || "Failed to load collections for the active profile.",
        troubleshooting: [
          "Check that your Supabase connection string is valid.",
          "Verify that the 'seasons' table has been created in your Supabase DB."
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      fetchSeasons();
    }
  }, [activeProfile]);

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newTitle.trim() || creating) return;

    setCreating(true);
    try {
      const res = await axios.post("/api/seasons", {
        profileId: activeProfile.id,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        thumbnailUrl: selectedCover
      });

      // Close modal and redirect straight to the new season's upload view
      setShowCreateModal(false);
      router.push(`/season/${res.data.id}`);
    } catch (err: any) {
      console.error("Error creating season:", err);
      setErrorDetails({
        title: "Collection Creation Failed",
        message: err.message || "Failed to save the new collection to Supabase.",
        troubleshooting: [
          "Verify the connection to Supabase and ensure RLS policies allow insertion on 'seasons' table.",
          "Check that your internet connection is active."
        ]
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleFeatured = async (e: React.MouseEvent, seasonId: string) => {
    e.stopPropagation();
    
    // Optimistic UI update: Set this one as true, all others as false
    setSeasons(prev => prev.map(s => ({
      ...s,
      featured: s.id === seasonId
    })));

    try {
      await axios.put("/api/seasons", {
        id: seasonId,
        featured: true
      });
    } catch (err: any) {
      console.error("Error updating featured status:", err);
      // Rollback by refetching
      fetchSeasons();
    }
  };

  const getFilteredSeasons = () => {
    let result = [...seasons];

    // 1. Search Query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) => 
          s.title.toLowerCase().includes(q) || 
          s.description?.toLowerCase().includes(q)
      );
    }

    // 2. Sort ordering
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
        </div>
      </div>
    );
  }

  const filteredSeasons = getFilteredSeasons();

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 font-sans select-none overflow-x-hidden relative">
      <Navbar />

      <main className="max-w-6xl mx-auto pt-28 px-4 md:px-8 space-y-8">
        
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide">
              Memory Collections
            </h1>
            <p className="text-white/40 text-xs md:text-sm mt-1">
              Organize your personal streaming library like premium Netflix shows.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] font-bold text-white rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg w-full md:w-auto"
          >
            <FolderPlus className="w-5 h-5" />
            Create Collection
          </button>
        </div>

        {/* Filters and search panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818] p-4 rounded border border-white/5 shadow">
          {/* Search box input */}
          <div className="relative flex-grow max-w-md bg-black/40 border border-white/10 rounded overflow-hidden flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-white/40 mr-2 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Search collections..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white text-sm outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white cursor-pointer ml-1.5">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort selection dropdown */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40 font-bold uppercase tracking-wider text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#242424] border border-white/10 rounded px-3 py-2 text-white font-semibold text-sm outline-none cursor-pointer focus:border-[#E50914] transition-colors"
            >
              <option value="newest">Recently Created</option>
              <option value="oldest">Oldest Created</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Collections Grid list */}
        {filteredSeasons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center space-y-4 rounded-lg border border-dashed border-white/10 bg-black/10">
            <FolderOpen className="w-16 h-16 text-white/20 animate-pulse" />
            <div>
              <h3 className="text-lg font-bold text-white">No collections found</h3>
              <p className="text-sm text-white/40 max-w-sm mt-1 mx-auto">
                {searchQuery ? "No matches for your search keywords." : "Begin adding memory collections scoped strictly to this profile."}
              </p>
            </div>
            {!searchQuery && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-[#E50914] text-white font-bold rounded hover:bg-[#b80710] transition-colors shadow cursor-pointer mt-2"
              >
                Create First Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredSeasons.map((season) => (
              <div 
                key={season.id}
                onClick={() => router.push(`/season/${season.id}`)}
                className="group relative bg-[#181818] rounded-md overflow-hidden border border-white/5 hover:border-white/20 shadow-lg cursor-pointer transition-all duration-300 flex flex-col h-[280px]"
              >
                {/* Visual Cover Poster */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40 flex-shrink-0">
                  <img 
                    src={season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400"} 
                    alt={season.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
                  
                  {/* Featured badge / button */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex gap-2">
                    {season.featured ? (
                      <span className="px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest bg-yellow-500 text-black border border-yellow-400 flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.4)] animate-pulse">
                        ★ Featured
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleToggleFeatured(e, season.id)}
                        className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest bg-black/70 text-white/70 hover:text-white hover:bg-yellow-500 hover:text-black border border-white/10 hover:border-yellow-400 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-1 shadow cursor-pointer"
                        title="Set as Featured Show on Home Screen"
                      >
                        ☆ Set Featured
                      </button>
                    )}
                  </div>

                  {/* Episode Count indicator tag */}
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-black/80 text-white/90 border border-white/10 z-10 flex items-center gap-1.5 shadow">
                    <Film className="w-3 h-3 text-[#E50914]" />
                    {(season.episodes || []).length} Ep
                  </span>
                </div>

                {/* Content details description */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-lg text-white group-hover:text-[#E50914] transition-colors line-clamp-1 uppercase tracking-wide">
                      {season.title}
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-3">
                      {season.description || "No description cataloged for this collection."}
                    </p>
                  </div>

                  {/* Metadata catalog footer */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2 text-[10px] text-white/40 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(season.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[#E50914] group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-extrabold">
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE COLLECTION INTERACTIVE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[600px] bg-[#141414] border border-white/10 rounded-lg px-6 py-8 md:p-10 relative shadow-2xl animate-zoom-in">
            <button 
              onClick={() => !creating && setShowCreateModal(false)}
              disabled={creating}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide mb-2 flex items-center gap-2.5">
              <FolderPlus className="w-8 h-8 text-[#E50914]" />
              New Collection
            </h2>
            <p className="text-white/50 text-sm mb-6">Create a show folder container to bundle related memory episodes.</p>

            <form onSubmit={handleCreateSeason} className="space-y-6">
              
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Show Title</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  disabled={creating}
                  placeholder="e.g. Europe Trip 2025, Family Gatherings"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Show Description</label>
                <textarea
                  rows={3}
                  disabled={creating}
                  placeholder="Provide a quick summary or tags..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                />
              </div>

              {/* Cover presets visual selector picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
                  Select Cover Background Presets
                </label>
                <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-black/40 rounded border border-white/5 max-h-[160px] overflow-y-auto">
                  {COVER_PRESETS.map((preset, idx) => (
                    <div 
                      key={idx}
                      onClick={() => !creating && setSelectedCover(preset)}
                      className={`cursor-pointer rounded overflow-hidden aspect-video border-2 transition-all relative ${
                        selectedCover === preset ? "border-[#E50914] scale-105" : "border-transparent hover:scale-105"
                      }`}
                    >
                      <img src={preset} className="w-full h-full object-cover" alt={`Preset Cover ${idx}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-5 py-2 border border-white/30 text-white/70 hover:border-white hover:text-white rounded transition-colors text-sm cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 text-white font-bold rounded transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create & Upload
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PREMIUM INTERACTIVE ERROR OVERLAY */}
      {errorDetails && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-[550px] bg-[#181818] border border-red-600/30 rounded-lg p-6 md:p-8 relative shadow-2xl animate-zoom-in">
            {/* Red accent line top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E50914] rounded-t-lg"></div>

            {/* Header */}
            <div className="flex items-start gap-4 mb-4 mt-2">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/25 flex-shrink-0 text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-extrabold text-white tracking-wide uppercase">
                  {errorDetails.title}
                </h3>
                <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mt-0.5">
                  Action Error Logged
                </p>
              </div>
              <button 
                onClick={() => setErrorDetails(null)}
                className="text-white/40 hover:text-white cursor-pointer transition-colors p-1.5 hover:bg-white/5 rounded border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Content */}
            <div className="space-y-5">
              <div className="bg-black/40 border border-white/5 p-4 rounded text-sm font-medium text-white/80 leading-relaxed break-all">
                <span className="text-red-400 font-bold block mb-1 uppercase tracking-wider text-xs">Error Message:</span>
                {errorDetails.message}
              </div>

              {errorDetails.troubleshooting && errorDetails.troubleshooting.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#E50914]" />
                    Troubleshooting & Recommended Fixes:
                  </span>
                  <ul className="text-xs text-white/60 space-y-2 bg-[#222]/50 border border-white/5 p-4 rounded leading-relaxed list-disc pl-5">
                    {errorDetails.troubleshooting.map((item, idx) => (
                      <li key={idx} className="marker:text-[#E50914]">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Close buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setErrorDetails(null)}
                  className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded text-xs uppercase tracking-widest cursor-pointer shadow active:scale-95 transition-all w-full sm:w-auto text-center"
                >
                  Close & Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
