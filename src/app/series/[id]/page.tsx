"use client";

import { useEffect, useState, use } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  ArrowLeft, 
  Layers, 
  Settings, 
  Play, 
  FolderHeart,
  Loader2, 
  Film, 
  X, 
  Edit3,
  Trash2,
  Sparkles
} from "lucide-react";
import axios from "axios";
import { DbSeries, DbSeason } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeriesDetailPage(props: PageProps) {
  const params = use(props.params);
  const seriesId = params.id;

  const { activeProfile } = useStore();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<DbSeries | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSeriesDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/series?id=${seriesId}`);
      setSeries(res.data);
      if (res.data) {
        setEditTitle(res.data.title || "");
        setEditDescription(res.data.description || "");
        setEditThumbnail(res.data.thumbnailUrl || "");
      }
    } catch (err: any) {
      console.error("Error fetching series details:", err);
      setErrorMsg("Failed to load this series collection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seriesId) {
      fetchSeriesDetails();
    }
  }, [seriesId]);

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setUpdating(true);
    try {
      const res = await axios.put("/api/series", {
        id: seriesId,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        thumbnailUrl: editThumbnail.trim() || null,
      });

      setSeries((prev) => prev ? { ...prev, ...res.data } : null);
      setShowEditModal(false);
    } catch (err: any) {
      console.error("Failed to update series:", err);
      alert(err.response?.data?.error || "Failed to update series metadata.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!confirm("Are you sure you want to delete this Series? The grouped season collections will NOT be deleted, but they will be un-assigned from this series.")) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/series?id=${seriesId}`);
      router.push("/memories?tab=series");
    } catch (err: any) {
      console.error("Failed to delete series:", err);
      alert("Failed to delete series.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
            <span className="text-sm text-white/50 tracking-wider">Syncing Series Vault...</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !series) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-4">
          <Layers className="w-16 h-16 text-[#E50914]/40" />
          <h2 className="text-2xl font-black">{errorMsg || "Series Not Found"}</h2>
          <p className="text-white/50 text-sm max-w-md">This series may have been deleted, or you might not have access to it.</p>
          <button
            onClick={() => router.push("/browse")}
            className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded transition-colors"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const seasons = series.seasons || [];

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-24 font-sans select-none overflow-x-hidden">
      <Navbar />

      {/* Hero Banner Header */}
      <div className="relative w-full h-[45vh] md:h-[55vh] flex items-end select-none overflow-hidden border-b border-white/5">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] scale-102"
          style={{
            backgroundImage: `url(${series.thumbnailUrl || "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1200"})`
          }}
        />
        {/* Cinematic Netflix Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-black/40 to-transparent z-[1]" />
        <div className="absolute inset-0 bg-black/20 z-[1]" />
        
        {/* Back and Edit Triggers */}
        <div className="absolute top-24 left-6 md:left-16 right-6 md:right-16 flex items-center justify-between z-10">
          <button
            onClick={() => router.push("/browse")}
            className="flex items-center gap-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full border border-white/10 transition-all font-semibold text-xs md:text-sm shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            Back to Browse
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 text-white/70 hover:text-white bg-[#808080]/30 hover:bg-[#808080]/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur transition-all font-semibold text-xs md:text-sm shadow-lg cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Edit Details
            </button>
            <button
              onClick={handleDeleteSeries}
              disabled={deleting}
              className="flex items-center justify-center p-2 text-white/60 hover:text-white bg-black/40 hover:bg-red-950/40 hover:border-red-500/20 rounded-full border border-white/10 transition-all cursor-pointer"
              title="Delete Series Grouping"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Hero Overlay Info */}
        <div className="absolute bottom-8 left-6 md:left-16 right-6 md:right-1/3 space-y-3 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#E50914] bg-[#E50914]/15 border border-[#E50914]/30 px-2 py-0.5 rounded shadow">
              Series Grouping
            </span>
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
              {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wide leading-tight uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {series.title}
          </h1>

          {series.description && (
            <p className="text-white/80 text-sm sm:text-base leading-relaxed drop-shadow max-w-2xl line-clamp-3">
              {series.description}
            </p>
          )}
        </div>
      </div>

      {/* Season Cards Container */}
      <div className="px-6 md:px-16 pt-12 space-y-8 relative z-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-wide uppercase">Grouped Seasons</h2>
          <span className="text-xs md:text-sm font-bold text-white/40 uppercase tracking-widest">
            {seasons.length} Season {seasons.length === 1 ? "Collection" : "Collections"}
          </span>
        </div>

        {seasons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl border border-dashed border-white/10 bg-black/30 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No collections grouped under this series yet.</h3>
              <p className="text-sm text-white/50">Assign existing seasons to this series inside the memories control panel.</p>
            </div>
            <button
              onClick={() => router.push("/memories?tab=series")}
              className="px-6 py-2.5 bg-[#E50914] text-white hover:bg-[#b80710] font-bold rounded text-sm transition-all shadow-md cursor-pointer uppercase tracking-wider"
            >
              Assign Season Collections
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {seasons.map((season) => (
              <div
                key={season.id}
                onClick={() => router.push(`/season/${season.id}`)}
                className="group bg-[#141414] rounded-xl border border-white/5 hover:border-white/15 overflow-hidden transition-all duration-300 shadow-lg cursor-pointer transform hover:-translate-y-1 hover:shadow-2xl flex flex-col"
              >
                {/* Season Cover */}
                <div className="relative aspect-video bg-[#222] overflow-hidden">
                  <img
                    src={season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400"}
                    alt={season.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/25 to-transparent"></div>
                  
                  {/* Floating Play Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  {season.featured && (
                    <span className="absolute top-3 left-3 bg-[#E50914] text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md border border-white/10">
                      Featured
                    </span>
                  )}
                </div>

                {/* Season Metadata */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold tracking-wide text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                      {season.title}
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-2">
                      {season.description || "Stream your life experiences and high definition home videos in this cinematic memory collection folder."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3.5 text-[9px] text-white/40 font-black tracking-wider uppercase select-none">
                    <span>
                      {(season as any).episodesCount || (season.episodes?.length || 0)} Episodes
                    </span>
                    <span className="text-[#E50914] font-black">
                      View Collection &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT SERIES MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] bg-[#141414] border border-white/10 rounded-xl p-6 md:p-8 shadow-2xl animate-zoom-in relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/10">
              <Layers className="w-6 h-6 text-[#E50914]" />
              <h3 className="text-lg font-black tracking-wider uppercase">Edit Series Details</h3>
            </div>

            <form onSubmit={handleUpdateSeries} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/60">Series Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#222] border border-white/10 rounded focus:border-white focus:outline-none text-white text-sm"
                  placeholder="e.g. Baby Leo's Journey"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/60">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#222] border border-white/10 rounded focus:border-white focus:outline-none text-white text-sm resize-none"
                  placeholder="Describe this series group..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest uppercase text-white/60">Thumbnail / Cover URL</label>
                <input
                  type="url"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#222] border border-white/10 rounded focus:border-white focus:outline-none text-white text-sm"
                  placeholder="https://images.unsplash.com/..."
                />
                <span className="text-[10px] text-white/30 block">Provide a custom image URL to serve as the series poster cover art.</span>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/2 py-2.5 rounded border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/80 hover:text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="w-1/2 py-2.5 rounded bg-[#E50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest transition-all shadow cursor-pointer text-center"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
