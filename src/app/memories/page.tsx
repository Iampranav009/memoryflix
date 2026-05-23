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
  HelpCircle,
  Edit,
  Sliders,
  Grid,
  UploadCloud,
  Check,
  Layers,
  ListPlus,
  Trash2,
  ChevronDown
} from "lucide-react";
import axios from "axios";
import { DbSeason, DbSeries } from "@/types";

const COVER_PRESETS = [
  { name: "Romantic Vibe", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200" },
  { name: "Nature-Loving Vibe", url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1200" },
  { name: "Adventure Vibe", url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200" },
  { name: "Cozy Vibe", url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=1200" }
];

export default function MemoriesPage() {
  const { dbUser, activeProfile } = useStore();
  const router = useRouter();

  const [seasons, setSeasons] = useState<DbSeason[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"collections" | "feature" | "series">("collections");

  // Series state
  const [seriesList, setSeriesList] = useState<DbSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [creatingSeriesId, setCreatingSeriesId] = useState<string | null>(null);
  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<DbSeries | null>(null);
  const [editSeriesTitle, setEditSeriesTitle] = useState("");
  const [editSeriesDescription, setEditSeriesDescription] = useState("");
  const [editSeriesAssignedIds, setEditSeriesAssignedIds] = useState<Set<string>>(new Set());
  const [savingSeries, setSavingSeries] = useState(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  // Create modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [coverMode, setCoverMode] = useState<"preset" | "custom">("preset");
  const [selectedCover, setSelectedCover] = useState(COVER_PRESETS[0].url);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSeason, setEditSeason] = useState<DbSeason | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCoverMode, setEditCoverMode] = useState<"preset" | "custom">("preset");
  const [editSelectedCover, setEditSelectedCover] = useState(COVER_PRESETS[0].url);
  const [editCustomCoverFile, setEditCustomCoverFile] = useState<File | null>(null);
  const [editFeatured, setEditFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const fetchSeries = async () => {
    if (!activeProfile) return;
    setSeriesLoading(true);
    try {
      const res = await axios.get(`/api/series?profileId=${activeProfile.id}`);
      setSeriesList(res.data);
    } catch (err: any) {
      console.error("Error loading series:", err);
    } finally {
      setSeriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeProfile) {
      fetchSeasons();
      fetchSeries();
    }
  }, [activeProfile]);

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newTitle.trim() || creating) return;

    setCreating(true);
    try {
      let finalCoverUrl = selectedCover;

      if (coverMode === "custom" && customCoverFile) {
        if (!dbUser) {
          throw new Error("Unable to identify the authenticated database user.");
        }
        // 1. Get S3 upload pre-signed URL (using 'covers' as seasonId since it is not created yet)
        const presignRes = await axios.post("/api/s3/presign", {
          userId: dbUser.id,
          profileId: activeProfile.id,
          seasonId: "covers",
          filename: `cover_${Date.now()}_${customCoverFile.name}`,
          contentType: customCoverFile.type,
          fileSize: customCoverFile.size
        });

        const { uploadUrl, mediaUrl } = presignRes.data;

        // 2. Put file to AWS S3 directly
        await axios.put(uploadUrl, customCoverFile, {
          headers: {
            "Content-Type": customCoverFile.type
          }
        });

        finalCoverUrl = mediaUrl;
      }

      const res = await axios.post("/api/seasons", {
        profileId: activeProfile.id,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        thumbnailUrl: finalCoverUrl
      });

      // Close modal and redirect straight to the new season's upload view
      setShowCreateModal(false);
      setCustomCoverFile(null);
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

  const handleEditSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !editSeason || !editTitle.trim() || saving) return;

    setSaving(true);
    try {
      let finalCoverUrl = editSelectedCover;

      if (editCoverMode === "custom" && editCustomCoverFile) {
        if (!dbUser) {
          throw new Error("Unable to identify the authenticated database user.");
        }
        // 1. Get S3 upload pre-signed URL
        const presignRes = await axios.post("/api/s3/presign", {
          userId: dbUser.id,
          profileId: activeProfile.id,
          seasonId: editSeason.id,
          filename: `cover_${Date.now()}_${editCustomCoverFile.name}`,
          contentType: editCustomCoverFile.type,
          fileSize: editCustomCoverFile.size
        });

        const { uploadUrl, mediaUrl } = presignRes.data;

        // 2. Put file to AWS S3 directly
        await axios.put(uploadUrl, editCustomCoverFile, {
          headers: {
            "Content-Type": editCustomCoverFile.type
          }
        });

        finalCoverUrl = mediaUrl;
      }

      const res = await axios.put("/api/seasons", {
        id: editSeason.id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        thumbnailUrl: finalCoverUrl,
        featured: editFeatured
      });

      // Update state
      setSeasons(prev => prev.map(s => {
        if (s.id === editSeason.id) {
          return {
            ...s,
            title: res.data.title,
            description: res.data.description,
            thumbnailUrl: res.data.thumbnailUrl,
            featured: res.data.featured
          };
        }
        return s;
      }));

      // Close modal
      setShowEditModal(false);
      setEditSeason(null);
      setEditCustomCoverFile(null);
    } catch (err: any) {
      console.error("Error editing season:", err);
      setErrorDetails({
        title: "Collection Edit Failed",
        message: err.message || "Failed to update collection properties.",
        troubleshooting: [
          "Verify the connection to Supabase and database tables.",
          "Check that your internet connection is active."
        ]
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (e: React.MouseEvent | null, seasonId: string) => {
    if (e) e.stopPropagation();
    
    // Toggle active state
    const currentSeason = seasons.find(s => s.id === seasonId);
    if (!currentSeason) return;

    const nextFeatured = !currentSeason.featured;

    // Optimistic UI update: only toggle the specific season
    setSeasons(prev => prev.map(s => 
      s.id === seasonId ? { ...s, featured: nextFeatured } : s
    ));

    try {
      await axios.put("/api/seasons", {
        id: seasonId,
        featured: nextFeatured
      });
    } catch (err: any) {
      console.error("Error updating featured status:", err);
      // Rollback by refetching
      fetchSeasons();
    }
  };

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newSeriesTitle.trim() || savingSeries) return;
    setSavingSeries(true);
    try {
      const res = await axios.post("/api/series", {
        profileId: activeProfile.id,
        title: newSeriesTitle.trim(),
        description: newSeriesDescription.trim() || null,
      });
      setSeriesList(prev => [...prev, res.data]);
      setShowCreateSeriesModal(false);
      setNewSeriesTitle("");
      setNewSeriesDescription("");
    } catch (err: any) {
      console.error("Error creating series:", err);
      setErrorDetails({
        title: "Series Creation Failed",
        message: err.message || "Failed to create series.",
      });
    } finally {
      setSavingSeries(false);
    }
  };

  const handleOpenEditSeries = (series: DbSeries) => {
    setEditingSeries(series);
    setEditSeriesTitle(series.title);
    setEditSeriesDescription(series.description || "");
    const alreadyAssigned = seasons
      .filter(s => s.seriesId === series.id)
      .map(s => s.id);
    setEditSeriesAssignedIds(new Set(alreadyAssigned));
    setShowEditSeriesModal(true);
  };

  const handleSaveEditSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeries || !editSeriesTitle.trim() || savingSeries) return;
    setSavingSeries(true);
    try {
      await axios.put("/api/series", {
        id: editingSeries.id,
        title: editSeriesTitle.trim(),
        description: editSeriesDescription.trim() || null,
      });
      const previouslyAssigned = new Set(seasons.filter(s => s.seriesId === editingSeries.id).map(s => s.id));
      const toAdd = [...editSeriesAssignedIds].filter(id => !previouslyAssigned.has(id));
      const toRemove = [...previouslyAssigned].filter(id => !editSeriesAssignedIds.has(id));

      await Promise.all([
        ...toAdd.map(id => axios.put("/api/seasons", { id, seriesId: editingSeries.id })),
        ...toRemove.map(id => axios.put("/api/seasons", { id, seriesId: null })),
      ]);

      await Promise.all([fetchSeries(), fetchSeasons()]);
      setShowEditSeriesModal(false);
      setEditingSeries(null);
    } catch (err: any) {
      console.error("Error saving series:", err);
      setErrorDetails({
        title: "Series Update Failed",
        message: err.message || "Failed to save series changes.",
      });
    } finally {
      setSavingSeries(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string, title: string) => {
    if (!window.confirm(`Delete series "${title}"? All grouped collections will remain, just un-grouped.`)) return;
    try {
      await axios.delete(`/api/series?id=${seriesId}`);
      setSeriesList(prev => prev.filter(s => s.id !== seriesId));
      setSeasons(prev => prev.map(s => s.seriesId === seriesId ? { ...s, seriesId: null } : s));
    } catch (err: any) {
      console.error("Error deleting series:", err);
      setErrorDetails({
        title: "Delete Series Failed",
        message: err.message || "Could not delete series.",
      });
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
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans select-none overflow-hidden animate-fade-in">
        <Navbar />
        
        <main className="max-w-6xl mx-auto pt-28 px-4 md:px-8 space-y-8 w-full">
          {/* Shimmer Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-zinc-800 rounded"></div>
              <div className="h-4 w-96 bg-zinc-850 rounded"></div>
            </div>
            <div className="h-10 w-44 bg-[#E50914]/20 rounded"></div>
          </div>

          {/* Shimmer Switcher */}
          <div className="flex gap-6 border-b border-white/10 pb-4 animate-pulse">
            <div className="h-5 w-28 bg-zinc-800 rounded"></div>
            <div className="h-5 w-28 bg-zinc-800 rounded"></div>
            <div className="h-5 w-28 bg-zinc-800 rounded"></div>
          </div>

          {/* Shimmer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((cardIdx) => (
              <div 
                key={cardIdx} 
                className="bg-[#181818] border border-white/5 rounded-md overflow-hidden animate-pulse h-[280px] flex flex-col justify-between"
              >
                <div className="aspect-video w-full bg-zinc-900"></div>
                <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-[70%] bg-zinc-800 rounded"></div>
                    <div className="h-3 w-[90%] bg-zinc-850 rounded"></div>
                    <div className="h-3 w-[80%] bg-zinc-850 rounded"></div>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex justify-between">
                    <div className="h-3 w-16 bg-zinc-850 rounded"></div>
                    <div className="h-3 w-12 bg-[#E50914]/20 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const filteredSeasons = getFilteredSeasons();

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-24 font-sans select-none overflow-x-hidden relative">
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

        {/* Tab view switcher */}
        <div className="flex gap-6 border-b border-white/10 pb-4 text-xs md:text-sm font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex items-center gap-2 pb-2 transition-all cursor-pointer border-b-2 ${
              activeTab === "collections"
                ? "border-[#E50914] text-white"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <Grid className="w-4 h-4" />
            My Collections
          </button>
          <button
            onClick={() => setActiveTab("series")}
            className={`flex items-center gap-2 pb-2 transition-all cursor-pointer border-b-2 ${
              activeTab === "series"
                ? "border-[#E50914] text-white"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Series Groups
          </button>
          <button
            onClick={() => setActiveTab("feature")}
            className={`flex items-center gap-2 pb-2 transition-all cursor-pointer border-b-2 ${
              activeTab === "feature"
                ? "border-[#E50914] text-white"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Feature Settings
          </button>
        </div>

        {activeTab === "collections" ? (
          <>
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
                      


                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSeason(season);
                          setEditTitle(season.title);
                          setEditDescription(season.description || "");
                          setEditSelectedCover(season.thumbnailUrl || COVER_PRESETS[0].url);
                          setEditCoverMode(COVER_PRESETS.some(p => p.url === season.thumbnailUrl) ? "preset" : "custom");
                          setEditFeatured(season.featured || false);
                          setShowEditModal(true);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 hover:bg-zinc-800 text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-20 cursor-pointer shadow flex items-center justify-center"
                        title="Edit Collection Settings"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Episode Count indicator tag */}
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-black/80 text-white/90 border border-white/10 z-10 flex items-center gap-1.5 shadow">
                        <Film className="w-3.5 h-3.5 text-[#E50914]" />
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
          </>
        ) : activeTab === "series" ? (
          /* SERIES GROUPS TAB */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Series Groups</h3>
                <p className="text-xs text-white/40 mt-0.5">Bundle multiple collections into a named series — like Season 1, Season 2, Season 3.</p>
              </div>
              <button
                onClick={() => setShowCreateSeriesModal(true)}
                className="px-4 py-2 bg-[#E50914] hover:bg-[#b80710] font-bold text-white rounded transition-colors flex items-center gap-2 cursor-pointer shadow text-sm"
              >
                <ListPlus className="w-4 h-4" />
                New Series
              </button>
            </div>

            {seriesLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
              </div>
            ) : seriesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center space-y-4 rounded-lg border border-dashed border-white/10 bg-black/10">
                <Layers className="w-16 h-16 text-white/20 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-white">No series yet</h3>
                  <p className="text-sm text-white/40 max-w-sm mt-1 mx-auto">Create a series to group multiple collections together — great for multi-season memories.</p>
                </div>
                <button
                  onClick={() => setShowCreateSeriesModal(true)}
                  className="px-5 py-2.5 bg-[#E50914] text-white font-bold rounded hover:bg-[#b80710] transition-colors shadow cursor-pointer mt-2"
                >
                  Create First Series
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {seriesList.map((series) => {
                  const assignedSeasons = seasons.filter(s => s.seriesId === series.id);
                  return (
                    <div key={series.id} className="bg-[#181818] rounded-lg border border-white/5 hover:border-white/15 shadow-lg transition-all overflow-hidden">
                      {/* Series header */}
                      <div className="p-5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 bg-[#E50914]/10 border border-[#E50914]/20 rounded-lg flex-shrink-0">
                            <Layers className="w-5 h-5 text-[#E50914]" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-white text-lg uppercase tracking-wide truncate">{series.title}</h4>
                            <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{series.description || "No description."}</p>
                            <p className="text-white/25 text-[10px] mt-1 font-bold uppercase tracking-wider">
                              {assignedSeasons.length} collection{assignedSeasons.length !== 1 ? "s" : ""} grouped
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleOpenEditSeries(series)}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white border border-white/10 cursor-pointer transition-all"
                            title="Edit Series"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSeries(series.id, series.title)}
                            className="p-1.5 rounded bg-zinc-800 hover:bg-red-900/60 text-white/40 hover:text-red-400 border border-white/10 hover:border-red-500/30 cursor-pointer transition-all"
                            title="Delete Series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Grouped seasons preview */}
                      {assignedSeasons.length > 0 ? (
                        <div className="px-5 pb-5 space-y-2 border-t border-white/5 pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Collections in this series</p>
                          <div className="space-y-1.5">
                            {assignedSeasons.map((s, i) => (
                              <div
                                key={s.id}
                                onClick={() => router.push(`/season/${s.id}`)}
                                className="flex items-center gap-3 p-2.5 rounded bg-black/30 hover:bg-black/50 cursor-pointer group/sc transition-all border border-transparent hover:border-white/10"
                              >
                                <img
                                  src={s.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=60"}
                                  alt={s.title}
                                  className="w-14 aspect-video rounded object-cover border border-white/10 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white group-hover/sc:text-[#E50914] transition-colors truncate">{s.title}</p>
                                  <p className="text-[10px] text-white/30">{(s.episodes || []).length} chapters</p>
                                </div>
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider flex-shrink-0">S{i + 1}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover/sc:text-white/50 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 pb-5 border-t border-white/5 pt-3">
                          <button
                            onClick={() => handleOpenEditSeries(series)}
                            className="w-full py-3 rounded border border-dashed border-white/10 hover:border-white/25 text-white/30 hover:text-white/60 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Assign collections to this series
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* FEATURE SETTINGS TAB VIEW */
          <div className="bg-[#181818] rounded-lg border border-white/5 shadow-md p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wide text-white">Featured Status Manager</h3>
              <p className="text-xs text-white/40 mt-1">
                Toggle a collection ON to feature it in the home page hero section. Toggling a collection ON will automatically disable featured status on other collections.
              </p>
            </div>

            {seasons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded border border-dashed border-white/10 bg-black/10">
                <FolderOpen className="w-12 h-12 text-white/20 animate-pulse" />
                <div>
                  <h4 className="font-bold text-white text-base">No collections available</h4>
                  <p className="text-xs text-white/40 mt-1">Create a season collection first to manage featured status.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 font-bold uppercase text-[11px] tracking-widest bg-black/20">
                      <th className="py-3 px-4">Cover Image</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4 text-center">Episodes</th>
                      <th className="py-3 px-4 text-center">Created At</th>
                      <th className="py-3 px-4 text-center w-48">Featured Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {seasons.map((season) => (
                      <tr key={season.id} className="hover:bg-white/5 transition-colors group">
                        
                        {/* Cover Image */}
                        <td className="py-4 px-4">
                          <img 
                            src={season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=150"} 
                            alt={season.title} 
                            className="w-20 aspect-video rounded object-cover border border-white/10 bg-black/40 flex-shrink-0"
                          />
                        </td>

                        {/* Title & Description */}
                        <td className="py-4 px-4">
                          <div className="min-w-0">
                            <h4 className="font-bold text-white group-hover:text-[#E50914] transition-colors truncate max-w-[200px] sm:max-w-[320px]">
                              {season.title}
                            </h4>
                            <p className="text-white/40 text-xs truncate max-w-[200px] sm:max-w-[320px] mt-0.5">
                              {season.description || "No description provided."}
                            </p>
                          </div>
                        </td>

                        {/* Episodes Count */}
                        <td className="py-4 px-4 text-center font-semibold text-white/60">
                          {(season.episodes || []).length} Ep
                        </td>

                        {/* Creation Date */}
                        <td className="py-4 px-4 text-center text-white/60">
                          {new Date(season.createdAt).toLocaleDateString()}
                        </td>

                        {/* Toggle Switch */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-wide ${season.featured ? "text-yellow-500" : "text-white/30"}`}>
                              {season.featured ? "Featured" : "Not Featured"}
                            </span>
                            <button
                              onClick={() => handleToggleFeatured(null, season.id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                season.featured ? "bg-[#E50914]" : "bg-zinc-700"
                              }`}
                              title={season.featured ? "Click to disable feature" : "Click to feature this collection"}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                  season.featured ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE COLLECTION INTERACTIVE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[600px] bg-[#000000] border border-white/10 rounded-lg px-6 py-8 md:p-10 relative shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center justify-between">
                  <span>Cover Background Image</span>
                  <span className="text-[10px] text-zinc-500 font-medium lowercase">
                    Recommended: 1920x1080 (16:9 ratio)
                  </span>
                </label>
                
                {/* Segmented Selector between Presets and Custom */}
                <div className="grid grid-cols-2 gap-2 bg-[#222]/60 p-1 rounded border border-white/5 text-xs text-center font-bold">
                  <button
                    type="button"
                    onClick={() => setCoverMode("preset")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${coverMode === "preset" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Vibe Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverMode("custom")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${coverMode === "custom" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Custom Upload
                  </button>
                </div>

                {coverMode === "preset" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 bg-black/40 rounded border border-white/5">
                    {COVER_PRESETS.map((preset, idx) => (
                      <div 
                        key={idx}
                        onClick={() => !creating && setSelectedCover(preset.url)}
                        className={`cursor-pointer rounded overflow-hidden aspect-video border-2 transition-all relative group/vibe ${
                          selectedCover === preset.url ? "border-[#E50914] scale-105" : "border-transparent hover:scale-102"
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} className="w-full h-full object-cover" alt={preset.name} />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 py-0.5 text-[8px] text-center font-bold truncate text-white border-t border-white/5">
                          {preset.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border border-dashed border-white/20 hover:border-white/40 rounded p-4 text-center cursor-pointer transition-colors bg-[#2f2f2f]/20 hover:bg-[#2f2f2f]/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCustomCoverFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {customCoverFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">{customCoverFile.name}</p>
                        <p className="text-[9px] text-[#808080] font-semibold uppercase">{(customCoverFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-white/55">
                        <UploadCloud className="w-6 h-6 text-white/40 mx-auto" />
                        <p className="text-[11px] font-bold">Choose a cover image file</p>
                        <p className="text-[9px] text-[#808080]">JPG, PNG under 5MB (16:9 ratio)</p>
                      </div>
                    )}
                  </div>
                )}
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
                  disabled={creating || (coverMode === "custom" && !customCoverFile) || !newTitle.trim()}
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

      {/* EDIT COLLECTION INTERACTIVE MODAL */}
      {showEditModal && editSeason && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[600px] bg-[#000000] border border-white/10 rounded-lg px-6 py-8 md:p-10 relative shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => !saving && setShowEditModal(false)}
              disabled={saving}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide mb-2 flex items-center gap-2.5">
              <Edit className="w-8 h-8 text-[#E50914]" />
              Edit Collection
            </h2>
            <p className="text-white/50 text-sm mb-6">Modify show catalog settings and customize cover assets.</p>

            <form onSubmit={handleEditSeason} className="space-y-6">
              
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Show Title</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  disabled={saving}
                  placeholder="e.g. Europe Trip 2025, Family Gatherings"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Show Description</label>
                <textarea
                  rows={3}
                  disabled={saving}
                  placeholder="Provide a quick summary or tags..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                />
              </div>

              {/* Cover presets visual selector picker */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center justify-between">
                  <span>Cover Background Image</span>
                  <span className="text-[10px] text-zinc-500 font-medium lowercase">
                    Recommended: 1920x1080 (16:9 ratio)
                  </span>
                </label>
                
                {/* Segmented Selector between Presets and Custom */}
                <div className="grid grid-cols-2 gap-2 bg-[#222]/60 p-1 rounded border border-white/5 text-xs text-center font-bold">
                  <button
                    type="button"
                    onClick={() => setEditCoverMode("preset")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${editCoverMode === "preset" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Vibe Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCoverMode("custom")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${editCoverMode === "custom" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Custom Upload
                  </button>
                </div>

                {editCoverMode === "preset" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 bg-black/40 rounded border border-white/5">
                    {COVER_PRESETS.map((preset, idx) => (
                      <div 
                        key={idx}
                        onClick={() => !saving && setEditSelectedCover(preset.url)}
                        className={`cursor-pointer rounded overflow-hidden aspect-video border-2 transition-all relative group/vibe ${
                          editSelectedCover === preset.url ? "border-[#E50914] scale-105" : "border-transparent hover:scale-102"
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} className="w-full h-full object-cover" alt={preset.name} />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 py-0.5 text-[8px] text-center font-bold truncate text-white border-t border-white/5">
                          {preset.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border border-dashed border-white/20 hover:border-white/40 rounded p-4 text-center cursor-pointer transition-colors bg-[#2f2f2f]/20 hover:bg-[#2f2f2f]/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditCustomCoverFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {editCustomCoverFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">{editCustomCoverFile.name}</p>
                        <p className="text-[9px] text-[#808080] font-semibold uppercase">{(editCustomCoverFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-white/55">
                        <UploadCloud className="w-6 h-6 text-white/40 mx-auto" />
                        <p className="text-[11px] font-bold">Choose a cover image file</p>
                        <p className="text-[9px] text-[#808080]">JPG, PNG under 5MB (16:9 ratio)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Featured switch toggle in edit modal */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <label className="text-sm font-bold text-white uppercase tracking-wider block">Featured Season</label>
                  <span className="text-white/40 text-xs">Display this collection inside home hero banner.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase tracking-wide ${editFeatured ? "text-yellow-500" : "text-white/30"}`}>
                    {editFeatured ? "Featured" : "Not Featured"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditFeatured(!editFeatured)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      editFeatured ? "bg-[#E50914]" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        editFeatured ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="px-5 py-2 border border-white/30 text-white/70 hover:border-white hover:text-white rounded transition-colors text-sm cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editTitle.trim()}
                  className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 text-white font-bold rounded transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* CREATE SERIES MODAL */}
      {showCreateSeriesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] bg-[#000000] border border-white/10 rounded-lg px-6 py-8 relative shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => !savingSeries && setShowCreateSeriesModal(false)}
              disabled={savingSeries}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:opacity-30"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-extrabold uppercase tracking-wide mb-1.5 flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-[#E50914]" />
              New Series
            </h2>
            <p className="text-white/50 text-sm mb-6">Create a series to bundle related collections (e.g. Season 1 through 4 of a trip).</p>

            <form onSubmit={handleCreateSeries} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Series Title</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  disabled={savingSeries}
                  placeholder="e.g. Baby Leo's Journey, Europe Adventures"
                  value={newSeriesTitle}
                  onChange={(e) => setNewSeriesTitle(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Description (optional)</label>
                <textarea
                  rows={3}
                  disabled={savingSeries}
                  placeholder="Brief description of this series..."
                  value={newSeriesDescription}
                  onChange={(e) => setNewSeriesDescription(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                />
              </div>
              <div className="flex justify-end gap-4 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowCreateSeriesModal(false)} disabled={savingSeries}
                  className="px-5 py-2 border border-white/30 text-white/70 hover:border-white hover:text-white rounded transition-colors text-sm cursor-pointer disabled:opacity-40">
                  Cancel
                </button>
                <button type="submit" disabled={savingSeries || !newSeriesTitle.trim()}
                  className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 text-white font-bold rounded transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-lg flex items-center gap-2">
                  {savingSeries && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Series
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SERIES MODAL */}
      {showEditSeriesModal && editingSeries && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] bg-[#000000] border border-white/10 rounded-lg px-6 py-8 relative shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => !savingSeries && setShowEditSeriesModal(false)}
              disabled={savingSeries}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:opacity-30"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-extrabold uppercase tracking-wide mb-1.5 flex items-center gap-2.5">
              <Edit className="w-7 h-7 text-[#E50914]" />
              Edit Series
            </h2>
            <p className="text-white/50 text-sm mb-6">Update the series name and assign which collections belong to it.</p>

            <form onSubmit={handleSaveEditSeries} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Series Title</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  disabled={savingSeries}
                  value={editSeriesTitle}
                  onChange={(e) => setEditSeriesTitle(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Description (optional)</label>
                <textarea
                  rows={2}
                  disabled={savingSeries}
                  value={editSeriesDescription}
                  onChange={(e) => setEditSeriesDescription(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                />
              </div>

              {/* Season assignment picker */}
              <div className="space-y-2.5 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Assign Collections</label>
                  <span className="text-[10px] text-white/30">{editSeriesAssignedIds.size} selected</span>
                </div>
                <p className="text-[10px] text-white/30 -mt-1">Check each collection that should be part of this series.</p>
                {seasons.length === 0 ? (
                  <p className="text-xs text-white/30 py-3 text-center">No collections available to assign.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {seasons.map((s) => {
                      const isChecked = editSeriesAssignedIds.has(s.id);
                      const isInOtherSeries = s.seriesId && s.seriesId !== editingSeries?.id;
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-2.5 rounded cursor-pointer transition-all border ${
                            isChecked
                              ? "bg-[#E50914]/10 border-[#E50914]/30"
                              : "bg-black/20 border-white/5 hover:border-white/15"
                          } ${isInOtherSeries ? "opacity-50" : ""}`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all ${
                            isChecked ? "bg-[#E50914] border-[#E50914]" : "border-white/30"
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            disabled={savingSeries || (isInOtherSeries || false)}
                            onChange={() => {
                              const copy = new Set(editSeriesAssignedIds);
                              if (copy.has(s.id)) copy.delete(s.id);
                              else copy.add(s.id);
                              setEditSeriesAssignedIds(copy);
                            }}
                          />
                          <img
                            src={s.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=60"}
                            alt={s.title}
                            className="w-12 aspect-video rounded object-cover border border-white/10 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{s.title}</p>
                            {isInOtherSeries && (
                              <p className="text-[10px] text-yellow-400/60">Already in another series</p>
                            )}
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">{(s.episodes || []).length} ep</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowEditSeriesModal(false)} disabled={savingSeries}
                  className="px-5 py-2 border border-white/30 text-white/70 hover:border-white hover:text-white rounded transition-colors text-sm cursor-pointer disabled:opacity-40">
                  Cancel
                </button>
                <button type="submit" disabled={savingSeries || !editSeriesTitle.trim()}
                  className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 text-white font-bold rounded transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-lg flex items-center gap-2">
                  {savingSeries && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Series
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
