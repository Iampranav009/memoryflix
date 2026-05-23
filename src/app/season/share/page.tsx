"use client";

import { useEffect, useState, use } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import MediaPlayer from "@/components/MediaPlayer";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Film, 
  Image as ImageIcon, 
  UploadCloud, 
  Calendar, 
  Clock, 
  Loader2, 
  FileVideo,
  CheckCircle2,
  X,
  AlertTriangle,
  HelpCircle,
  Play,
  GripVertical
} from "lucide-react";
import axios from "axios";
import { DbSeason, DbEpisode } from "@/types";
import { safeLocalStorage } from "@/lib/cookies";

const VIBE_PRESETS = [
  { name: "Love Vibes", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=500" },
  { name: "Nature Vibes", url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=500" },
  { name: "Sunset Chill", url: "https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=500" },
  { name: "Party Vibe", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=500" },
  { name: "Adventure", url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=500" },
  { name: "Ocean Breeze", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=500" },
  { name: "Family Cozy", url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=500" }
];

const extractVideoFrame = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
    } catch (err) {
      reject(err);
      return;
    }
    
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas conversion to blob failed."));
            }
          }, "image/jpeg", 0.85);
        } else {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to get 2D context from canvas."));
        }
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};

export default function ShareSeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const seasonId = typeof resolvedSearchParams.id === "string" ? resolvedSearchParams.id : "";
  const access = typeof resolvedSearchParams.access === "string" ? resolvedSearchParams.access.toLowerCase() : "viewer";
  const ownerName = typeof resolvedSearchParams.ownerName === "string" ? resolvedSearchParams.ownerName : "Vault";
  const ownerAvatar = typeof resolvedSearchParams.ownerAvatar === "string" ? resolvedSearchParams.ownerAvatar : "";

  const { dbUser, activeProfile, setActivePlayback } = useStore();
  const router = useRouter();

  // Navigation state
  const [hasEntered, setHasEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<DbSeason | null>(null);
  const [episodes, setEpisodes] = useState<DbEpisode[]>([]);
  
  // Drawer & Form states
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Thumbnail options states
  const [thumbnailMode, setThumbnailMode] = useState<"auto" | "vibe" | "custom">("custom");
  const [selectedVibeUrl, setSelectedVibeUrl] = useState(VIBE_PRESETS[0].url);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [extractedFrameBlob, setExtractedFrameBlob] = useState<Blob | null>(null);
  const [extractingFrame, setExtractingFrame] = useState(false);

  const mediaType = selectedFile ? (selectedFile.type.startsWith("video/") ? "video" : "photo") : "photo";
  
  // Upload progress states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Premium Error states
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    troubleshooting?: string[];
  } | null>(null);

  // Drag and Drop states for Episodes reordering
  const [draggedEpisodeIdx, setDraggedEpisodeIdx] = useState<number | null>(null);
  const [dragOverEpisodeIdx, setDragOverEpisodeIdx] = useState<number | null>(null);

  // Fetch season details
  const fetchSeasonDetails = async () => {
    if (!seasonId) return;
    try {
      const res = await axios.get(`/api/seasons?id=${seasonId}`);
      setSeason(res.data);
      setEpisodes(res.data.episodes || []);
    } catch (err: any) {
      console.error("Error loading shared season details:", err);
      setErrorDetails({
        title: "Load Shared Collection Failed",
        message: err.message || "Could not retrieve collection details from database.",
        troubleshooting: [
          "Verify the share link is valid.",
          "Check your network connection.",
          "Confirm that this season ID is valid in the database."
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seasonId) {
      fetchSeasonDetails();
    }
  }, [seasonId]);

  // Handle entry and persistent registry in localStorage
  const handleEnterProfile = () => {
    if (!season) return;
    setHasEntered(true);

    if (typeof window !== "undefined") {
      try {
        const sharedListString = safeLocalStorage.getItem("memoryflix_shared_seasons") || "[]";
        const sharedList = JSON.parse(sharedListString);
        
        // Filter out duplicate IDs
        const updatedList = sharedList.filter((item: any) => item.id !== season.id);
        
        // Register current shared season with metadata
        updatedList.push({
          id: season.id,
          access,
          ownerName,
          ownerAvatar,
          title: season.title,
          thumbnailUrl: season.thumbnailUrl,
          description: season.description,
          createdAt: season.createdAt,
          shareUrl: window.location.href
        });
        
        safeLocalStorage.setItem("memoryflix_shared_seasons", JSON.stringify(updatedList));
      } catch (err) {
        console.error("Error writing to shared seasons registry:", err);
      }
    }
  };

  // Form submit & S3 upload handlers (mirroring [id]/page.tsx)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-populate title if empty
      if (!title) {
        const baseName = file.name.split(".").slice(0, -1).join(".");
        setTitle(baseName.replace(/[-_]/g, " "));
      }

      // Auto-extract first frame if video
      if (file.type.startsWith("video/")) {
        setExtractingFrame(true);
        setExtractedFrameBlob(null);
        try {
          const blob = await extractVideoFrame(file);
          setExtractedFrameBlob(blob);
        } catch (err) {
          console.error("Frame extraction error:", err);
        } finally {
          setExtractingFrame(false);
        }
      } else {
        setExtractedFrameBlob(null);
      }
    }
  };

  const handleUploadMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!season || !selectedFile || !title.trim()) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Requesting S3 Upload Ticket...");

    try {
      const mediaType = selectedFile.type.startsWith("video/") ? "video" : "photo";

      // 1. Size constraints
      const maxVideoSize = 2 * 1024 * 1024 * 1024; // 2GB
      const maxImageSize = 50 * 1024 * 1024; // 50MB
      
      if (mediaType === "video" && selectedFile.size > maxVideoSize) {
        throw new Error("Video file exceeds the maximum size limit of 2GB.");
      }
      if (mediaType === "photo" && selectedFile.size > maxImageSize) {
        throw new Error("Image file exceeds the maximum size limit of 50MB.");
      }

      // 2. Resolve parameters safely for guest editors
      const presignUserId = dbUser?.id || season.profileId || "shared_editor";
      const presignProfileId = activeProfile?.id || season.profileId;

      // 3. Request presigned ticket
      const presignResponse = await axios.post("/api/s3/presign", {
        userId: presignUserId,
        profileId: presignProfileId,
        seasonId: season.id,
        filename: selectedFile.name,
        contentType: selectedFile.type
      });

      const { uploadUrl, mediaUrl } = presignResponse.data;

      // 4. Stream upload directly to S3 via AXIOS PUT
      setUploadStatusText("Streaming file contents to vault...");
      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        }
      });

      // 5. Video duration extract
      setUploadStatusText("Saving memory catalog...");
      let durationSeconds = null;
      if (mediaType === "video") {
        durationSeconds = await getVideoDuration(selectedFile);
      }

      // 5.1 Resolve and upload Thumbnail if applicable
      let thumbnailUrl = mediaType === "photo" ? mediaUrl : null;

      if (thumbnailMode === "vibe") {
        thumbnailUrl = selectedVibeUrl;
      } else if (thumbnailMode === "custom" && customThumbnailFile) {
        setUploadStatusText("Uploading custom thumbnail...");
        const thumbPresign = await axios.post("/api/s3/presign", {
          userId: presignUserId,
          profileId: presignProfileId,
          seasonId: season.id,
          filename: `thumb_${Date.now()}_${customThumbnailFile.name}`,
          contentType: customThumbnailFile.type
        });
        await axios.put(thumbPresign.data.uploadUrl, customThumbnailFile, {
          headers: {
            "Content-Type": customThumbnailFile.type
          }
        });
        thumbnailUrl = thumbPresign.data.mediaUrl;
      } else if (thumbnailMode === "auto" && mediaType === "video" && extractedFrameBlob) {
        setUploadStatusText("Uploading video cover frame...");
        const frameFile = new File([extractedFrameBlob], `frame_${Date.now()}.jpg`, { type: "image/jpeg" });
        const thumbPresign = await axios.post("/api/s3/presign", {
          userId: presignUserId,
          profileId: presignProfileId,
          seasonId: season.id,
          filename: frameFile.name,
          contentType: frameFile.type
        });
        await axios.put(thumbPresign.data.uploadUrl, frameFile, {
          headers: {
            "Content-Type": frameFile.type
          }
        });
        thumbnailUrl = thumbPresign.data.mediaUrl;
      }

      // 6. Create episode entry
      const createResponse = await axios.post("/api/episodes", {
        seasonId: season.id,
        title: title.trim(),
        description: description.trim() || null,
        mediaUrl,
        mediaType,
        memoryDate,
        durationSeconds,
        thumbnailUrl,
      });

      setEpisodes(prev => [...prev, createResponse.data]);
      setShowAddDrawer(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setMemoryDate(new Date().toISOString().split("T")[0]);
      setSelectedFile(null);
      setThumbnailMode("custom");
      setCustomThumbnailFile(null);
      setExtractedFrameBlob(null);

    } catch (err: any) {
      console.error("Upload error:", err);
      
      let errorTitle = "Memory Upload Failed";
      let errorMessage = err.message || "An unexpected error occurred during direct upload to S3.";
      let suggestions = [
        "Ensure S3 upload policies support PUT requests.",
        "Check S3 CORS configurations.",
        "Confirm your network is connected and stable."
      ];

      if (err.message?.includes("Network Error") || err.code === "ERR_NETWORK" || !err.response) {
        errorTitle = "S3 Connection Blocked (CORS)";
        errorMessage = "A client-side Axios Network Error was caught during upload to AWS S3.";
        suggestions = [
          "AWS S3 rejected the direct pre-signed PUT request because of missing CORS policies.",
          "SOLUTION: Paste CORS JSON array allowing AllowedMethods: [PUT, POST, GET, HEAD] and AllowedOrigins: [*] in your S3 Bucket Permissions.",
          "Ensure Block Public Access is appropriately configured."
        ];
      }

      setErrorDetails({
        title: errorTitle,
        message: errorMessage,
        troubleshooting: suggestions
      });
    } finally {
      setUploading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    if (access !== "editor") return;
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= episodes.length) return;

    const listCopy = [...episodes];
    const temp = listCopy[index];
    listCopy[index] = listCopy[nextIdx];
    listCopy[nextIdx] = temp;

    const reorderedPayload = listCopy.map((ep, idx) => ({
      id: ep.id,
      episodeNumber: idx + 1
    }));

    setEpisodes(listCopy);

    try {
      await axios.put("/api/episodes", {
        reorderedEpisodes: reorderedPayload
      });
    } catch (err: any) {
      console.error("Error saving episode order:", err);
      setErrorDetails({
        title: "Reorder Sync Failed",
        message: err.message || "Could not synchronize the new episode rank order to database.",
        troubleshooting: [
          "Verify connectivity to the database.",
          "Ensure no RLS policies are blocking the write operation."
        ]
      });
      fetchSeasonDetails();
    }
  };

  const handleEpisodeDrop = async (draggedIdx: number, targetIdx: number) => {
    if (access !== "editor") return;
    if (draggedIdx === targetIdx) return;
    const listCopy = [...episodes];
    const draggedItem = listCopy[draggedIdx];
    listCopy.splice(draggedIdx, 1);
    listCopy.splice(targetIdx, 0, draggedItem);

    const reorderedPayload = listCopy.map((ep, idx) => ({
      id: ep.id,
      episodeNumber: idx + 1
    }));

    setEpisodes(listCopy);

    try {
      await axios.put("/api/episodes", {
        reorderedEpisodes: reorderedPayload
      });
    } catch (err: any) {
      console.error("Error saving episode order:", err);
      setErrorDetails({
        title: "Reorder Sync Failed",
        message: err.message || "Could not synchronize the new episode rank order to database.",
        troubleshooting: [
          "Verify connectivity to the database.",
          "Ensure no RLS policies are blocking the write operation."
        ]
      });
      fetchSeasonDetails();
    }
  };

  const handleDeleteEpisode = async (episodeId: string, episodeTitle: string) => {
    if (access !== "editor") return;
    const confirmDelete = window.confirm(`Are you sure you want to delete memory "${episodeTitle}"?`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/episodes?id=${episodeId}`);
      setEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
    } catch (err: any) {
      console.error("Error deleting episode:", err);
      setErrorDetails({
        title: "Delete Memory Failed",
        message: err.message || "Could not delete episode from database or clean up associated S3 media file.",
        troubleshooting: [
          "Ensure your AWS credentials have delete permissions for S3 objects.",
          "Verify your Supabase database connectivity."
        ]
      });
    }
  };

  const handlePlayEpisode = (episode: DbEpisode) => {
    setActivePlayback(episode, episodes);
  };

  const handlePlaySeason = () => {
    if (episodes.length > 0) {
      setActivePlayback(episodes[0], episodes);
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "—";
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // 1. LOADING SCREEN
  if (loading || !season) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center font-sans">
        <Navbar />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
          <span className="text-sm text-white/50 tracking-wider">Syncing Shared Vault...</span>
        </div>
      </div>
    );
  }

  // 2. PROFILE ONBOARDING SPLASH SCREEN
  if (!hasEntered) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden select-none animate-fade-in">
        
        {/* Minimal header */}
        <div className="absolute top-8 left-8 md:left-16 flex items-center justify-between w-[90%] pointer-events-none">
          <img 
            src="/long_logo.png" 
            alt="MemoryFlix Logo"
            className="h-8 sm:h-10 md:h-12 lg:h-14 object-contain"
          />
        </div>

        <div className="text-center space-y-10 max-w-xl px-6 relative z-10">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wide leading-tight uppercase">
              Who&apos;s Watching?
            </h2>
            <p className="text-white/55 text-sm sm:text-base font-semibold max-w-md mx-auto">
              <span className="text-netflix-red font-bold">{ownerName}</span> has shared a memory collection with you!
            </p>
          </div>

          {/* Profile Card Container */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div 
              onClick={handleEnterProfile}
              className="group cursor-pointer flex flex-col items-center gap-4 transition-all duration-300"
            >
              {/* Profile Card Frame */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-md overflow-hidden border-[3px] border-transparent group-hover:border-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 transform group-hover:scale-105 active:scale-98 group-hover:shadow-[0_0_20px_#E50914]">
                <img 
                  src={ownerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400"} 
                  alt={ownerName} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
              </div>
              
              {/* Sender profile name */}
              <span className="text-white/60 group-hover:text-white text-base sm:text-lg font-bold tracking-wider uppercase transition-colors">
                {ownerName}&apos;s Show
              </span>
            </div>
          </div>

          <p className="text-xs text-white/30 tracking-widest uppercase font-bold animate-pulse">
            Click Profile Card to Enter Collection
          </p>
        </div>

        {/* Cinematic abstract background elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-black/80"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 brightness-[0.25] blur-sm scale-102"
          style={{ backgroundImage: `url(${season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800"})` }}
        ></div>
      </div>
    );
  }

  // 3. MAIN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-[#000000] text-white pb-24 font-sans select-none overflow-x-hidden relative">
      
      {/* Navbar rendered if logged in. Minimal custom back header otherwise */}
      {activeProfile ? (
        <Navbar />
      ) : (
        <header className="fixed top-0 left-0 w-full z-40 bg-[#000000]/90 backdrop-blur-md shadow-lg border-b border-white/5 py-4 px-6 md:px-16 flex items-center justify-between">
          <img 
            src="/long_logo.png" 
            alt="MemoryFlix Logo"
            onClick={() => router.push("/browse")}
            className="h-8 sm:h-10 md:h-12 lg:h-14 cursor-pointer object-contain"
          />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
            Shared {access === "editor" ? "Editor Scope" : "Viewer Scope"}
          </span>
        </header>
      )}

      {/* Floating Close Button in top right */}
      <button 
        onClick={() => router.push(activeProfile ? "/memories" : "/browse")}
        className="absolute top-28 right-4 md:right-8 lg:right-12 z-40 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all duration-200 cursor-pointer border border-white/10 hover:scale-105 shadow-md flex items-center justify-center hover:border-red-500/50"
        title="Close View"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto pt-28 px-4 md:px-8 space-y-8 animate-fade-in">
        
        {/* Back and Page Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/browse")}
              className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors border border-white/10"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide leading-tight">
                  {season.title}
                </h1>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded border border-[#E50914]/30 bg-[#E50914]/10 text-[#E50914] shadow-sm">
                  Shared
                </span>
              </div>
              <p className="text-white/40 text-xs md:text-sm mt-1 font-semibold flex items-center gap-1.5">
                <span>Created by {ownerName}</span>
                <span>•</span>
                <span>{access === "editor" ? "Collaborator Admin" : "Guest Viewer"} ({episodes.length} Episodes)</span>
              </p>
            </div>
          </div>

          {/* Add Memory Button: Visible only to EDITOR access link */}
          {access === "editor" && (
            <button
              onClick={() => setShowAddDrawer(true)}
              className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] font-bold text-white rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Add Memory (Episode)
            </button>
          )}
        </div>

        {/* Content Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Collection details */}
          <div className="space-y-4 bg-[#181818] p-6 rounded-lg border border-white/5 h-fit shadow-md">
            <h3 className="text-lg font-bold border-b border-white/10 pb-2">Collection Overview</h3>
            
            <div className="aspect-video w-full rounded overflow-hidden relative bg-black/40 border border-white/10 shadow-inner group">
              <img 
                src={season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400"} 
                alt={season.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                <button
                  onClick={handlePlaySeason}
                  disabled={episodes.length === 0}
                  className="p-4 bg-[#E50914] rounded-full hover:scale-108 transition-all hover:bg-[#b80710] shadow-xl flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
                >
                  <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3.5 pt-2 text-sm text-white/70">
              <p className="text-sm italic leading-relaxed text-white/60 bg-black/20 p-3 rounded">
                &quot;{season.description || "No description provided."}&quot;
              </p>
              
              <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/40">Shared By:</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  {ownerAvatar && <img src={ownerAvatar} alt={ownerName} className="w-4 h-4 rounded-full object-cover" />}
                  {ownerName}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/40">Established:</span>
                <span className="font-semibold text-white">{new Date(season.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/40">Access Level:</span>
                <span className="font-bold text-white capitalize text-xs tracking-wider">{access} Mode</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/40">Total Memories:</span>
                <span className="font-semibold text-white">{episodes.length} Episodes</span>
              </div>
            </div>
          </div>

          {/* Right panel: Episode table list */}
          <div className="lg:col-span-2 space-y-4 bg-[#181818] p-6 rounded-lg border border-white/5 shadow-md">
            <h3 className="text-lg font-bold border-b border-white/10 pb-2">Episodes Catalog</h3>
            
            {episodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded border border-dashed border-white/10 bg-black/10">
                <UploadCloud className="w-12 h-12 text-white/20 animate-bounce" />
                <div>
                  <h4 className="font-bold text-white text-base">This shared collection is empty</h4>
                  {access === "editor" ? (
                    <p className="text-xs text-white/40 mt-1">Click the &quot;Add Memory&quot; button above to upload videos or images!</p>
                  ) : (
                    <p className="text-xs text-white/40 mt-1">Check back later once the owner uploads memories.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 font-bold uppercase text-[11px] tracking-widest bg-black/20">
                      <th className="py-3 px-4 w-12 text-center">Ep</th>
                      <th className="py-3 px-4">Info</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-center">Duration</th>
                      {access === "editor" && (
                        <>
                          <th className="py-3 px-4 text-center w-24">Reorder</th>
                          <th className="py-3 px-4 text-center w-12">Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {episodes.map((ep, idx) => (
                      <tr 
                        key={ep.id} 
                        draggable={access === "editor"}
                        onDragStart={(e) => {
                          if (access !== "editor") return;
                          setDraggedEpisodeIdx(idx);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          if (access !== "editor") return;
                          e.preventDefault();
                          if (draggedEpisodeIdx !== idx) {
                            setDragOverEpisodeIdx(idx);
                          }
                        }}
                        onDragLeave={() => setDragOverEpisodeIdx(null)}
                        onDrop={(e) => {
                          if (access !== "editor") return;
                          e.preventDefault();
                          if (draggedEpisodeIdx !== null && draggedEpisodeIdx !== idx) {
                            handleEpisodeDrop(draggedEpisodeIdx, idx);
                          }
                          setDraggedEpisodeIdx(null);
                          setDragOverEpisodeIdx(null);
                        }}
                        onDragEnd={() => {
                          setDraggedEpisodeIdx(null);
                          setDragOverEpisodeIdx(null);
                        }}
                        className={`transition-all duration-200 border-b border-white/5 ${
                          draggedEpisodeIdx === idx 
                            ? "opacity-30 bg-zinc-800/80 border-dashed border-[#E50914]" 
                            : dragOverEpisodeIdx === idx 
                            ? "bg-red-950/20 border-t-2 border-t-[#E50914] scale-[1.01] shadow-lg" 
                            : "hover:bg-white/5"
                        } group`}
                      >
                        
                        {/* Episode number */}
                        <td className="py-4 px-4 text-center font-black text-white/40 group-hover:text-white text-base">
                          <div className="flex items-center justify-center gap-1">
                            {access === "editor" && (
                              <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing text-[#808080] transition-opacity flex-shrink-0" />
                            )}
                            <span>{ep.episodeNumber}</span>
                          </div>
                        </td>
                        
                        {/* Poster and Title details */}
                        <td 
                          className="py-4 px-4 flex gap-3 items-center cursor-pointer"
                          onClick={() => handlePlayEpisode(ep)}
                        >
                          <div className="relative w-16 aspect-video rounded overflow-hidden border border-white/10 bg-black/40 flex-shrink-0 group-hover:scale-102 transition-transform duration-300">
                            <img 
                              src={ep.thumbnailUrl || season.thumbnailUrl || "https://images.unsplash.com/photo-1542204172-e7052809f85e?q=80&w=150"} 
                              alt={ep.title} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-4.5 h-4.5 text-white fill-current ml-0.5" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white group-hover:text-[#E50914] transition-colors truncate max-w-[180px] sm:max-w-[280px]">
                              {ep.title}
                            </h4>
                            <p className="text-white/40 text-[11px] flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(ep.memoryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        
                        {/* Format Indicator tag */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-black/50 border ${
                            ep.mediaType === "video" ? "text-red-400 border-red-500/20" : "text-emerald-400 border-emerald-500/20"
                          }`}>
                            {ep.mediaType === "video" ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                            {ep.mediaType}
                          </span>
                        </td>
                        
                        {/* Play Duration */}
                        <td className="py-4 px-4 text-center text-white/60 font-semibold">
                          <span className="flex items-center justify-center gap-1.5 text-xs text-[#808080]">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(ep.durationSeconds)}
                          </span>
                        </td>
                        
                        {/* Admin triggers: Only visible to Editors */}
                        {access === "editor" && (
                          <>
                            {/* Order adjusters */}
                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex rounded border border-white/10 bg-black/20 overflow-hidden shadow-inner">
                                <button
                                  onClick={() => handleReorder(idx, "up")}
                                  disabled={idx === 0}
                                  className="p-2 hover:bg-white/10 disabled:opacity-20 text-white transition-colors cursor-pointer disabled:cursor-not-allowed border-r border-white/5"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReorder(idx, "down")}
                                  disabled={idx === episodes.length - 1}
                                  className="p-2 hover:bg-white/10 disabled:opacity-20 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            
                            {/* Trash Delete */}
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => handleDeleteEpisode(ep.id, ep.title)}
                                className="p-2 rounded text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Delete Memory"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </>
                        )}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ADD MEMORY PORTAL SLIDE OUT PANEL: Only available to Editors */}
      {access === "editor" && showAddDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end font-sans overflow-hidden select-none backdrop-blur-sm animate-fade-in">
          <div onClick={() => !uploading && setShowAddDrawer(false)} className="absolute inset-0 cursor-pointer"></div>
          
          <div className="relative w-full max-w-[500px] h-full bg-[#000000] border-l border-white/10 shadow-2xl p-6 md:p-8 flex flex-col justify-between z-10 overflow-y-auto animate-slide-in">
            
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wider text-[#E50914]">Add Memory (Episode)</h3>
                <button 
                  onClick={() => !uploading && setShowAddDrawer(false)}
                  disabled={uploading}
                  className="p-1 rounded hover:bg-white/5 border border-white/10 text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadMemory} className="space-y-6">
                {/* File input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory File (Video / Photo)</label>
                  <div className="relative border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg p-6 bg-black/20 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      required
                      disabled={uploading}
                      accept="video/*,image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    {selectedFile ? (
                      <div className="space-y-2">
                        {selectedFile.type.startsWith("video/") ? (
                          <FileVideo className="w-10 h-10 text-red-500 mx-auto" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-emerald-500 mx-auto" />
                        )}
                        <p className="text-sm font-semibold text-white break-all max-w-[300px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-10 h-10 text-white/40 mx-auto group-hover:text-white" />
                        <span className="text-xs font-semibold text-white/60 group-hover:text-white">Choose a file or drag here</span>
                        <p className="text-[9px] text-[#808080] font-bold">Videos &le; 2GB • Images &le; 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory Title</label>
                  <input
                    type="text"
                    required
                    disabled={uploading}
                    placeholder="Enter memory title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Description Notes (Optional)</label>
                  <textarea
                    rows={3}
                    disabled={uploading}
                    placeholder="Capture stories or details about this memory..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                  />
                </div>

                {/* Captured date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory Captured Date</label>
                  <input
                    type="date"
                    required
                    disabled={uploading}
                    value={memoryDate}
                    onChange={(e) => setMemoryDate(e.target.value)}
                    className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                  />
                </div>

                {/* Cover Thumbnail Selection */}
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center justify-between">
                    <span>Cover Thumbnail</span>
                    {thumbnailMode === "auto" && mediaType === "video" && (
                      <span className="text-[10px] text-red-400 font-medium">
                        {extractingFrame ? "Extracting frame..." : extractedFrameBlob ? "✓ First frame extracted" : "Select video first"}
                      </span>
                    )}
                  </label>
                  
                  {/* Segmented Tab Selector */}
                  <div className="grid grid-cols-3 gap-2 bg-[#222]/60 p-1 rounded border border-white/5 text-xs text-center font-bold">
                    <button
                      type="button"
                      onClick={() => setThumbnailMode("custom")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${thumbnailMode === "custom" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                    >
                      Custom File
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailMode("vibe")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${thumbnailMode === "vibe" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                    >
                      Vibe Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailMode("auto")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${thumbnailMode === "auto" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                    >
                      Auto Frame
                    </button>
                  </div>

                  {/* Option 1: Custom Upload File */}
                  {thumbnailMode === "custom" && (
                    <div className="space-y-3 p-3 bg-black/30 border border-white/5 rounded">
                      <div className="relative border border-dashed border-white/20 hover:border-white/40 rounded p-4 text-center cursor-pointer transition-colors bg-[#2f2f2f]/20 hover:bg-[#2f2f2f]/40">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCustomThumbnailFile(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {customThumbnailFile ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">{customThumbnailFile.name}</p>
                            <p className="text-[9px] text-[#808080] font-semibold uppercase">{(customThumbnailFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-white/55">
                            <UploadCloud className="w-6 h-6 text-white/40 mx-auto" />
                            <p className="text-[11px] font-bold">Choose a cover image</p>
                            <p className="text-[9px] text-[#808080]">JPG, PNG under 5MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Option 2: Vibe Preset */}
                  {thumbnailMode === "vibe" && (
                    <div className="space-y-3 p-3 bg-black/30 border border-white/5 rounded">
                      <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {VIBE_PRESETS.map((vibe, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedVibeUrl(vibe.url)}
                            className={`cursor-pointer rounded overflow-hidden aspect-video border-2 transition-all relative group/vibe ${
                              selectedVibeUrl === vibe.url ? "border-[#E50914] scale-105" : "border-transparent hover:scale-102"
                            }`}
                            title={vibe.name}
                          >
                            <img src={vibe.url} className="w-full h-full object-cover" alt={vibe.name} />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 py-0.5 text-[8px] text-center font-bold truncate text-white border-t border-white/5">
                              {vibe.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Option 3: Auto Frame */}
                  {thumbnailMode === "auto" && (
                    <div className="p-3 bg-black/30 border border-white/5 rounded text-xs text-white/50 leading-relaxed space-y-2">
                      <p>
                        {selectedFile?.type.startsWith("video/") 
                          ? "The system will capture the first frame of your video automatically to use as the cover preview."
                          : "For images, the uploaded image itself is automatically used as the thumbnail."}
                      </p>
                      {selectedFile?.type.startsWith("video/") && extractedFrameBlob && (
                        <div className="relative w-32 aspect-video rounded overflow-hidden border border-white/15 bg-black">
                          <img 
                            src={URL.createObjectURL(extractedFrameBlob)} 
                            className="w-full h-full object-cover" 
                            alt="Extracted frame preview" 
                          />
                          <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/80 text-[8px] text-green-400 font-bold uppercase rounded border border-green-500/10">
                            Auto Extracted
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !title.trim() || extractingFrame}
                  className="w-full py-3.5 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 disabled:opacity-50 text-white font-bold rounded shadow-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  Save To Vault
                </button>
              </form>
            </div>

            {/* Upload progress meter overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 space-y-6 z-20">
                <div className="text-center space-y-2 animate-pulse">
                  <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mx-auto mb-2" />
                  <h4 className="text-lg font-bold tracking-wide uppercase text-white">{uploadStatusText}</h4>
                  <p className="text-white/40 text-xs">Do not close this panel or navigate away.</p>
                </div>
                
                <div className="w-full max-w-[300px]">
                  <div className="flex justify-between text-xs text-white/50 font-bold mb-1">
                    <span>PROGRESS</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#666]/30 rounded-lg overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-[#E50914] rounded-lg transition-all duration-300 shadow-[0_0_10px_#E50914]"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* PREMIUM INTERACTIVE ERROR OVERLAY */}
      {errorDetails && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-[550px] bg-[#181818] border border-red-600/30 rounded-lg p-6 md:p-8 relative shadow-2xl animate-zoom-in">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E50914] rounded-t-lg"></div>

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

      {/* Renders global MediaPlayer portal at bottom */}
      <MediaPlayer />
    </div>
  );
}
