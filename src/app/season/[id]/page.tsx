"use client";

import { useEffect, useState, use } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
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
  Edit,
  Settings,
  GripVertical
} from "lucide-react";
import axios from "axios";
import { DbSeason, DbEpisode } from "@/types";

const VIBE_PRESETS = [
  { name: "Love Vibes", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=500" },
  { name: "Nature Vibes", url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=500" },
  { name: "Sunset Chill", url: "https://images.unsplash.com/photo-1515462277126-270d878326e5?q=80&w=500" },
  { name: "Party Vibe", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=500" },
  { name: "Adventure", url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=500" },
  { name: "Ocean Breeze", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=500" },
  { name: "Family Cozy", url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=500" }
];

const COVER_PRESETS = [
  { name: "Romantic Vibe", url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200" },
  { name: "Nature-Loving Vibe", url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1200" },
  { name: "Adventure Vibe", url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200" },
  { name: "Cozy Vibe", url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=1200" }
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

export default function SeasonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dbUser, activeProfile } = useStore();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<DbSeason | null>(null);
  const [episodes, setEpisodes] = useState<DbEpisode[]>([]);
  
  // Drawer & Form states
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractedFrameBlobs, setExtractedFrameBlobs] = useState<{ [fileName: string]: string }>({});
  const [previewUrls, setPreviewUrls] = useState<{ [fileName: string]: string }>({});
  const [previewingVideoFile, setPreviewingVideoFile] = useState<File | null>(null);
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (previewingVideoFile) {
      const url = URL.createObjectURL(previewingVideoFile);
      setLocalVideoPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setLocalVideoPreviewUrl(null);
      };
    }
  }, [previewingVideoFile]);
  
  const selectedFile = selectedFiles[0] || null;
  
  // Thumbnail options states
  const [thumbnailMode, setThumbnailMode] = useState<"auto" | "vibe" | "custom">("custom");
  const [selectedVibeUrl, setSelectedVibeUrl] = useState(VIBE_PRESETS[0].url);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [extractedFrameBlob, setExtractedFrameBlob] = useState<Blob | null>(null);
  const [extractingFrame, setExtractingFrame] = useState(false);

  const mediaType = selectedFiles.some(f => f.type.startsWith("video/")) ? "video" : "photo";
  
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

  // Edit Collection states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCoverMode, setEditCoverMode] = useState<"preset" | "custom">("preset");
  const [editSelectedCover, setEditSelectedCover] = useState(COVER_PRESETS[0].url);
  const [editCustomCoverFile, setEditCustomCoverFile] = useState<File | null>(null);
  const [editFeatured, setEditFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit Chapter (Episode) states
  const [showEditEpisodeModal, setShowEditEpisodeModal] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<DbEpisode | null>(null);
  const [editEpisodeTitle, setEditEpisodeTitle] = useState("");
  const [editEpisodeDescription, setEditEpisodeDescription] = useState("");
  const [editEpisodeMemoryDate, setEditEpisodeMemoryDate] = useState("");
  const [editEpisodeThumbnailMode, setEditEpisodeThumbnailMode] = useState<"current" | "vibe" | "custom">("current");
  const [editEpisodeSelectedVibeUrl, setEditEpisodeSelectedVibeUrl] = useState(VIBE_PRESETS[0].url);
  const [editEpisodeCustomThumbnailFile, setEditEpisodeCustomThumbnailFile] = useState<File | null>(null);
  const [savingEpisode, setSavingEpisode] = useState(false);
  // Media segment reorder state (populated when episode mediaUrl is a JSON array)
  const [editMediaSegments, setEditMediaSegments] = useState<{ url: string; duration: number; low?: string; medium?: string; high?: string }[]>([]);
  // Additional states for Edit Chapter inline uploading and segment previews
  const [editMediaUploading, setEditMediaUploading] = useState(false);
  const [editMediaUploadProgress, setEditMediaUploadProgress] = useState(0);
  const [editMediaUploadStatus, setEditMediaUploadStatus] = useState("");
  const [previewingSegmentUrl, setPreviewingSegmentUrl] = useState<string | null>(null);
  const [previewingSegmentName, setPreviewingSegmentName] = useState("");

  // Drag and Drop states for Episodes and Segments
  const [draggedEpisodeIdx, setDraggedEpisodeIdx] = useState<number | null>(null);
  const [dragOverEpisodeIdx, setDragOverEpisodeIdx] = useState<number | null>(null);
  const [draggedSegmentIdx, setDraggedSegmentIdx] = useState<number | null>(null);
  const [dragOverSegmentIdx, setDragOverSegmentIdx] = useState<number | null>(null);


  const fetchSeasonDetails = async () => {
    try {
      const res = await axios.get(`/api/seasons?id=${id}`);
      setSeason(res.data);
      setEpisodes(res.data.episodes || []);
      
      // Initialize edit states with current season details
      setEditTitle(res.data.title);
      setEditDescription(res.data.description || "");
      setEditSelectedCover(res.data.thumbnailUrl || COVER_PRESETS[0].url);
      setEditCoverMode(COVER_PRESETS.some(p => p.url === res.data.thumbnailUrl) ? "preset" : "custom");
      setEditFeatured(res.data.featured || false);
    } catch (err: any) {
      console.error("Error loading season details:", err);
      setErrorDetails({
        title: "Load Collection Failed",
        message: err.message || "Could not retrieve collection details from database.",
        troubleshooting: [
          "Verify that your Supabase instance is running and has the required schema.",
          "Check your network connection.",
          "Confirm that this season ID is valid for the active profile."
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !season || !editTitle.trim() || saving) return;

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
          seasonId: season.id,
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
        id: season.id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        thumbnailUrl: finalCoverUrl,
        featured: editFeatured
      });

      // Update local state
      setSeason(prev => prev ? {
        ...prev,
        title: res.data.title,
        description: res.data.description,
        thumbnailUrl: res.data.thumbnailUrl,
        featured: res.data.featured
      } : null);

      // Close modal
      setShowEditModal(false);
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

  const handleEditEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser || !activeProfile || !editingEpisode || !editEpisodeTitle.trim() || savingEpisode) return;

    setSavingEpisode(true);
    try {
      let finalThumbnailUrl = editingEpisode.thumbnailUrl;

      if (editEpisodeThumbnailMode === "vibe") {
        finalThumbnailUrl = editEpisodeSelectedVibeUrl;
      } else if (editEpisodeThumbnailMode === "custom" && editEpisodeCustomThumbnailFile) {
        // Upload custom cover image for episode
        const presignRes = await axios.post("/api/s3/presign", {
          userId: dbUser.id,
          profileId: activeProfile.id,
          seasonId: editingEpisode.seasonId,
          filename: `thumb_${Date.now()}_${editEpisodeCustomThumbnailFile.name}`,
          contentType: editEpisodeCustomThumbnailFile.type,
          fileSize: editEpisodeCustomThumbnailFile.size
        });

        const { uploadUrl, mediaUrl } = presignRes.data;

        await axios.put(uploadUrl, editEpisodeCustomThumbnailFile, {
          headers: {
            "Content-Type": editEpisodeCustomThumbnailFile.type
          }
        });

        finalThumbnailUrl = mediaUrl;
      }

      // Recalculate duration and construct final mediaUrl
      const finalDurationSeconds = editMediaSegments.length > 0
        ? editMediaSegments.reduce((acc, s) => acc + s.duration, 0)
        : 0;

      let finalMediaUrl = "";
      if (editMediaSegments.length > 1) {
        finalMediaUrl = JSON.stringify(editMediaSegments.map(s => ({
          url: s.url,
          duration: s.duration,
          low: s.low,
          medium: s.medium,
          high: s.high
        })));
      } else if (editMediaSegments.length === 1) {
        const seg = editMediaSegments[0];
        if (seg.low || seg.medium || seg.high) {
          finalMediaUrl = JSON.stringify({
            low: seg.low || null,
            medium: seg.medium || null,
            high: seg.high || null
          });
        } else {
          finalMediaUrl = seg.url || "";
        }
      }

      const res = await axios.put("/api/episodes", {
        id: editingEpisode.id,
        title: editEpisodeTitle.trim(),
        description: editEpisodeDescription.trim() || null,
        memoryDate: editEpisodeMemoryDate,
        thumbnailUrl: finalThumbnailUrl,
        mediaUrl: finalMediaUrl,
        durationSeconds: finalDurationSeconds
      });

      // Update state
      setEpisodes(prev => prev.map(ep => {
        if (ep.id === editingEpisode.id) {
          const finalMediaType = editMediaSegments.some(s => {
            const ext = s.url.split("?")[0].split(".").pop()?.toUpperCase() || "";
            return ["MP4","MOV","AVI","MKV","WEBM"].includes(ext);
          }) ? "video" : "photo";
          
          return {
            ...ep,
            title: res.data.title,
            description: res.data.description,
            memoryDate: res.data.memoryDate,
            thumbnailUrl: res.data.thumbnailUrl,
            mediaUrl: res.data.mediaUrl,
            durationSeconds: res.data.durationSeconds,
            mediaType: finalMediaType
          };
        }
        return ep;
      }));

      // Close modal
      setShowEditEpisodeModal(false);
      setEditingEpisode(null);
      setEditEpisodeCustomThumbnailFile(null);
    } catch (err: any) {
      console.error("Error editing episode:", err);
      setErrorDetails({
        title: "Chapter Edit Failed",
        message: err.message || "Failed to update chapter properties.",
        troubleshooting: [
          "Verify the connection to Supabase and database tables.",
          "Check that your internet connection is active."
        ]
      });
    } finally {
      setSavingEpisode(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSeasonDetails();
    }
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newFilesList = [...selectedFiles, ...files];
      setSelectedFiles(newFilesList);
      
      // Manual title entry is preserved (auto-population removed)

      setExtractingFrame(true);
      const updatedFrames = { ...extractedFrameBlobs };
      const updatedPreviews = { ...previewUrls };
      
      for (const file of files) {
        if (file.type.startsWith("video/")) {
          if (!updatedFrames[file.name]) {
            try {
              const blob = await extractVideoFrame(file);
              const url = URL.createObjectURL(blob);
              updatedFrames[file.name] = url;
              
              if (file.name === newFilesList.find(f => f.type.startsWith("video/"))?.name) {
                setExtractedFrameBlob(blob);
              }
            } catch (err) {
              console.error(`Frame extraction error for ${file.name}:`, err);
            }
          }
        } else if (file.type.startsWith("image/")) {
          if (!updatedPreviews[file.name]) {
            const url = URL.createObjectURL(file);
            updatedPreviews[file.name] = url;
          }
        }
      }
      
      setExtractedFrameBlobs(updatedFrames);
      setPreviewUrls(updatedPreviews);
      setExtractingFrame(false);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const fileToRemove = selectedFiles[indexToRemove];
    const newFilesList = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(newFilesList);
    
    if (fileToRemove) {
      if (extractedFrameBlobs[fileToRemove.name]) {
        URL.revokeObjectURL(extractedFrameBlobs[fileToRemove.name]);
        const newFrames = { ...extractedFrameBlobs };
        delete newFrames[fileToRemove.name];
        setExtractedFrameBlobs(newFrames);
      }
      if (previewUrls[fileToRemove.name]) {
        URL.revokeObjectURL(previewUrls[fileToRemove.name]);
        const newPreviews = { ...previewUrls };
        delete newPreviews[fileToRemove.name];
        setPreviewUrls(newPreviews);
      }
    }
    
    const firstVideo = newFilesList.find(f => f.type.startsWith("video/"));
    if (firstVideo) {
      if (extractedFrameBlobs[firstVideo.name]) {
        fetch(extractedFrameBlobs[firstVideo.name])
          .then(res => res.blob())
          .then(blob => setExtractedFrameBlob(blob))
          .catch(e => console.error("Error setting first video blob:", e));
      }
    } else {
      setExtractedFrameBlob(null);
    }
  };

  const handleUploadMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser || !activeProfile || !season || selectedFiles.length === 0 || !title.trim()) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Validating files...");

    try {
      // 1. Validate size limits (Video <= 2GB, Image <= 50MB)
      const maxVideoSize = 2 * 1024 * 1024 * 1024; // 2GB
      const maxImageSize = 50 * 1024 * 1024; // 50MB
      let totalBytes = 0;

      for (const file of selectedFiles) {
        const isVideoFile = file.type.startsWith("video/");
        if (isVideoFile && file.size > maxVideoSize) {
          throw new Error(`Video file "${file.name}" exceeds the maximum size limit of 2GB.`);
        }
        if (!isVideoFile && file.size > maxImageSize) {
          throw new Error(`Image file "${file.name}" exceeds the maximum size limit of 50MB.`);
        }
        totalBytes += file.size;
      }

      // 2. Upload segments in sequence
      const uploadedSegments: { url: string; duration: number }[] = [];
      let totalBytesUploaded = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const isVideoFile = file.type.startsWith("video/");
        
        setUploadStatusText(`Requesting upload ticket for file ${i + 1} of ${selectedFiles.length}...`);
        
        const presignResponse = await axios.post("/api/s3/presign", {
          userId: dbUser.id,
          profileId: activeProfile.id,
          seasonId: season.id,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size
        });

        const { uploadUrl, mediaUrl } = presignResponse.data;

        setUploadStatusText(`Uploading file ${i + 1} of ${selectedFiles.length}...`);
        
        await axios.put(uploadUrl, file, {
          headers: {
            "Content-Type": file.type
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const currentUploaded = progressEvent.loaded;
              const pct = Math.round(((totalBytesUploaded + currentUploaded) * 100) / totalBytes);
              setUploadProgress(Math.min(99, pct));
            }
          }
        });

        totalBytesUploaded += file.size;

        let duration = 0;
        if (isVideoFile) {
          duration = await getVideoDuration(file);
        }

        uploadedSegments.push({
          url: mediaUrl,
          duration: duration
        });
      }

      // 3. Finalize media details
      const isMulti = selectedFiles.length > 1;
      const finalMediaType = selectedFiles.some(f => f.type.startsWith("video/")) ? "video" : "photo";
      const finalMediaUrl = isMulti ? JSON.stringify(uploadedSegments) : uploadedSegments[0].url;
      const durationSeconds = isMulti
        ? uploadedSegments.reduce((acc, s) => acc + s.duration, 0)
        : (uploadedSegments[0].duration || null);

      // 4. Resolve and upload Thumbnail
      let thumbnailUrl = finalMediaType === "photo" && !isMulti ? uploadedSegments[0].url : null;
      
      setUploadStatusText("Processing episode thumbnail cover...");

      if (thumbnailMode === "vibe") {
        thumbnailUrl = selectedVibeUrl;
      } else if (thumbnailMode === "custom" && customThumbnailFile) {
        setUploadStatusText("Uploading custom thumbnail...");
        const thumbPresign = await axios.post("/api/s3/presign", {
          userId: dbUser.id,
          profileId: activeProfile.id,
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
      } else if (thumbnailMode === "auto") {
        if (finalMediaType === "video" && extractedFrameBlob) {
          setUploadStatusText("Uploading cover frame...");
          const frameFile = new File([extractedFrameBlob], `frame_${Date.now()}.jpg`, { type: "image/jpeg" });
          const thumbPresign = await axios.post("/api/s3/presign", {
            userId: dbUser.id,
            profileId: activeProfile.id,
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
        } else if (finalMediaType === "photo" && isMulti) {
          // Multi-photo fallback to first photo
          thumbnailUrl = uploadedSegments[0].url;
        }
      }

      setUploadStatusText("Cataloging memory inside secure vault...");
      setUploadProgress(99);

      // 5. Create database entry
      const createResponse = await axios.post("/api/episodes", {
        seasonId: season.id,
        title: title.trim(),
        description: description.trim() || null,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        memoryDate,
        durationSeconds,
        thumbnailUrl,
      });

      // 6. Update lists and close drawer
      setEpisodes(prev => [...prev, createResponse.data]);
      setShowAddDrawer(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setMemoryDate(new Date().toISOString().split("T")[0]);
      setSelectedFiles([]);
      setPreviewUrls({});
      setExtractedFrameBlobs({});
      setThumbnailMode("custom");
      setCustomThumbnailFile(null);
      setExtractedFrameBlob(null);

    } catch (err: any) {
      console.error("Upload error:", err);
      
      let errorTitle = "Memory Upload Failed";
      let errorMessage = err.message || "An unexpected error occurred during direct upload to S3.";
      let suggestions = [
        "Ensure your AWS IAM user has PutObject permissions on the bucket.",
        "Verify your .env file has valid AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
        "Check that the AWS_REGION matches your bucket's physical location."
      ];

      if (err.response && err.response.status === 403 && err.response.data?.error === "LIMIT_EXCEEDED") {
        errorTitle = "Storage Limit Reached";
        errorMessage = err.response.data.message || "Your 50 GB storage capacity has been exceeded.";
        suggestions = [
          "Go to Account Settings -> Storage Vault to view your space allocation.",
          "Delete older episodes or large files to reclaim storage immediately.",
          "Verify if the file you're uploading is unnecessarily large."
        ];
      } else if (err.message?.includes("Network Error") || err.code === "ERR_NETWORK" || !err.response) {
        errorTitle = "S3 Connection Blocked (CORS)";
        errorMessage = "A client-side Axios Network Error was caught during upload to AWS S3.";
        suggestions = [
          "AWS S3 rejected the direct pre-signed PUT request because of missing or misconfigured CORS policies.",
          "SOLUTION: Go to AWS S3 Console -> memory-netflix bucket -> Permissions tab -> scroll to CORS at the very bottom -> Paste the CORS JSON array allowing AllowedMethods: [PUT, POST, GET, HEAD] and AllowedOrigins: [*].",
          "Ensure S3 Block Public Access is disabled on the bucket settings if you want anonymous reads.",
          "Check that your internet connection is active."
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

  // Helper to extract duration of selected video file
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

  // Helper to dynamically add and upload video files inside the Edit Chapter modal
  const handleEditEpisodeAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!dbUser || !activeProfile || !editingEpisode || editMediaUploading || savingEpisode) return;
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setEditMediaUploading(true);
      setEditMediaUploadProgress(0);
      
      try {
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        let uploadedSize = 0;
        const newSegments = [...editMediaSegments];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const isVideoFile = file.type.startsWith("video/");
          
          setEditMediaUploadStatus(`Preparing file ${i + 1} of ${files.length}...`);
          
          const presignRes = await axios.post("/api/s3/presign", {
            userId: dbUser.id,
            profileId: activeProfile.id,
            seasonId: editingEpisode.seasonId,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size
          });
          
          const { uploadUrl, mediaUrl } = presignRes.data;
          
          setEditMediaUploadStatus(`Uploading file ${i + 1} of ${files.length}...`);
          
          await axios.put(uploadUrl, file, {
            headers: {
              "Content-Type": file.type
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const currentUploaded = progressEvent.loaded;
                const totalUploaded = uploadedSize + currentUploaded;
                const pct = Math.round((totalUploaded * 100) / totalSize);
                setEditMediaUploadProgress(Math.min(99, pct));
              }
            }
          });
          
          uploadedSize += file.size;
          
          let duration = 0;
          if (isVideoFile) {
            try {
              duration = await getVideoDuration(file);
            } catch (err) {
              console.warn("Failed to retrieve segment video duration, falling back to 0:", err);
            }
          }
          
          newSegments.push({
            url: mediaUrl,
            duration: duration
          });
          
          // Dynamically update UI list as files upload
          setEditMediaSegments([...newSegments]);
        }
        
        setEditMediaUploadProgress(100);
        setEditMediaUploadStatus("All files uploaded successfully!");
        setTimeout(() => {
          setEditMediaUploadStatus("");
          setEditMediaUploading(false);
        }, 1500);
      } catch (err: any) {
        console.error("Inline segment upload failed:", err);
        setEditMediaUploading(false);
        setErrorDetails({
          title: "File Upload Failed",
          message: err.message || "Failed to upload new segment videos to S3 Vault.",
          troubleshooting: [
            "Verify your S3 Vault credentials and policies.",
            "Check that your internet connection is fast and stable.",
            "Confirm that video size does not exceed the limit."
          ]
        });
      }
    }
  };

  // Reorder episode positions
  const handleReorder = async (index: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= episodes.length) return;

    const listCopy = [...episodes];
    
    // Swap items
    const temp = listCopy[index];
    listCopy[index] = listCopy[nextIdx];
    listCopy[nextIdx] = temp;

    // Recalculate episodeNumber rankings (1-indexed)
    const reorderedPayload = listCopy.map((ep, idx) => ({
      id: ep.id,
      episodeNumber: idx + 1
    }));

    // Update state immediately for zero-latency feel
    setEpisodes(listCopy);

    try {
      // Sync reordered index positions to PostgreSQL Database
      await axios.put("/api/episodes", {
        reorderedEpisodes: reorderedPayload
      });
    } catch (err: any) {
      console.error("Error saving episode order:", err);
      setErrorDetails({
        title: "Reorder Sync Failed",
        message: err.message || "Could not synchronize the new episode rank order to Supabase.",
        troubleshooting: [
          "Check if your Supabase schema has Row-Level Security (RLS) enabled that blocks UPDATEs.",
          "Confirm your session is valid and the backend connection is stable."
        ]
      });
      // Rollback to original details
      fetchSeasonDetails();
    }
  };

  // Handle Episode drag & drop reordering
  const handleEpisodeDrop = async (draggedIdx: number, targetIdx: number) => {
    if (draggedIdx === targetIdx) return;
    const listCopy = [...episodes];
    const draggedItem = listCopy[draggedIdx];
    listCopy.splice(draggedIdx, 1);
    listCopy.splice(targetIdx, 0, draggedItem);

    // Recalculate episodeNumber rankings (1-indexed)
    const reorderedPayload = listCopy.map((ep, idx) => ({
      id: ep.id,
      episodeNumber: idx + 1
    }));

    // Update state immediately for zero-latency feel
    setEpisodes(listCopy);

    try {
      // Sync reordered index positions to PostgreSQL Database
      await axios.put("/api/episodes", {
        reorderedEpisodes: reorderedPayload
      });
    } catch (err: any) {
      console.error("Error saving episode order:", err);
      setErrorDetails({
        title: "Reorder Sync Failed",
        message: err.message || "Could not synchronize the new episode rank order to Supabase.",
        troubleshooting: [
          "Check if your Supabase schema has Row-Level Security (RLS) enabled that blocks UPDATEs.",
          "Confirm your session is valid and the backend connection is stable."
        ]
      });
      // Rollback to original details
      fetchSeasonDetails();
    }
  };

  // Handle segment reordering in Edit Chapter modal
  const handleSegmentDrop = (draggedIdx: number, targetIdx: number) => {
    if (draggedIdx === targetIdx) return;
    const copy = [...editMediaSegments];
    const draggedItem = copy[draggedIdx];
    copy.splice(draggedIdx, 1);
    copy.splice(targetIdx, 0, draggedItem);
    setEditMediaSegments(copy);
  };

  const handleDeleteEpisode = async (episodeId: string, title: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete memory "${title}"?`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/episodes?id=${episodeId}`);
      setEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
    } catch (err: any) {
      console.error("Error deleting episode:", err);
      setErrorDetails({
        title: "Delete Memory Failed",
        message: err.message || "Could not delete episode from Supabase database or clean up associated S3 media file.",
        troubleshooting: [
          "Ensure your AWS credentials have delete permissions for S3 objects.",
          "Verify the connection to Supabase DB has not timed out."
        ]
      });
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "—";
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loading || !season) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-24 font-sans select-none overflow-x-hidden relative">
      <Navbar />

      {/* Floating Close Button in top right */}
      <button 
        onClick={() => router.push("/memories")}
        className="absolute top-28 right-4 md:right-8 lg:right-12 z-40 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all duration-200 cursor-pointer border border-white/10 hover:scale-105 shadow-md flex items-center justify-center hover:border-red-500/50"
        title="Close View"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto pt-28 px-4 md:px-8 space-y-8">
        
        {/* Back and Page Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/memories")}
              className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors border border-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wide leading-tight">
                {season.title}
              </h1>
              <p className="text-white/40 text-xs md:text-sm mt-1">
                Collection Admin Vault ({episodes.length} Episodes)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditTitle(season.title);
                setEditDescription(season.description || "");
                setEditSelectedCover(season.thumbnailUrl || COVER_PRESETS[0].url);
                setEditCoverMode(COVER_PRESETS.some(p => p.url === season.thumbnailUrl) ? "preset" : "custom");
                setEditFeatured(season.featured || false);
                setShowEditModal(true);
              }}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 font-bold text-white rounded border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md w-full sm:w-auto"
            >
              <Settings className="w-5 h-5" />
              Edit Collection
            </button>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="px-5 py-2.5 bg-[#E50914] hover:bg-[#b80710] font-bold text-white rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Add Memory (Episode)
            </button>
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Collection details */}
          <div className="space-y-4 bg-[#181818] p-6 rounded-lg border border-white/5 h-fit shadow-md">
            <h3 className="text-lg font-bold border-b border-white/10 pb-2">Collection Metadata</h3>
            
            <div className="aspect-video w-full rounded overflow-hidden relative bg-black/40 border border-white/10 shadow-inner">
              <img 
                src={season.thumbnailUrl || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400"} 
                alt={season.title} 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3.5 pt-2 text-sm text-white/70">
              <p className="text-sm italic leading-relaxed text-white/60 bg-black/20 p-3 rounded">
                &quot;{season.description || "No description provided."}&quot;
              </p>
              
              <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/40">Profile Scoped:</span>
                <span className="font-semibold text-white">{activeProfile.name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-white/40">Established:</span>
                <span className="font-semibold text-white">{new Date(season.createdAt).toLocaleDateString()}</span>
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
                <UploadCloud className="w-12 h-12 text-zinc-500/60 transition-transform duration-300" />
                <div>
                  <h4 className="font-bold text-white text-base">This collection is empty</h4>
                  <p className="text-xs text-white/40 mt-1">Click the &quot;Add Memory&quot; button above to upload videos or images!</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop view table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 font-bold uppercase text-[11px] tracking-widest bg-black/20">
                        <th className="py-3 px-4 w-12 text-center">Ep</th>
                        <th className="py-3 px-4">Info</th>
                        <th className="py-3 px-4 text-center">Type</th>
                        <th className="py-3 px-4 text-center">Duration</th>
                        <th className="py-3 px-4 text-center w-24">Reorder</th>
                        <th className="py-3 px-4 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {episodes.map((ep, idx) => (
                        <tr 
                          key={ep.id} 
                          draggable
                          onDragStart={(e) => {
                            setDraggedEpisodeIdx(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedEpisodeIdx !== idx) {
                              setDragOverEpisodeIdx(idx);
                            }
                          }}
                          onDragLeave={() => setDragOverEpisodeIdx(null)}
                          onDrop={(e) => {
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
                              <GripVertical className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing text-[#808080] transition-opacity flex-shrink-0" />
                              <span>{ep.episodeNumber}</span>
                            </div>
                          </td>
                          
                          {/* Poster and Title details */}
                          <td className="py-4 px-4 flex gap-3 items-center">
                            <img 
                              src={ep.thumbnailUrl || season.thumbnailUrl || "https://images.unsplash.com/photo-1542204172-e7052809f85e?q=80&w=150"} 
                              alt={ep.title} 
                              className="w-16 aspect-video rounded object-cover border border-white/10 bg-black/40 flex-shrink-0"
                            />
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
                          
                          {/* Order arrow adjusters */}
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
                          
                          {/* Edit / Trash Action */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingEpisode(ep);
                                  setEditEpisodeTitle(ep.title);
                                  setEditEpisodeDescription(ep.description || "");
                                  setEditEpisodeMemoryDate(new Date(ep.memoryDate).toISOString().split("T")[0]);
                                  setEditEpisodeThumbnailMode("custom");
                                  setEditEpisodeSelectedVibeUrl(VIBE_PRESETS[0].url);
                                  setEditEpisodeCustomThumbnailFile(null);
                                  // Parse multi-segment mediaUrl for reordering/previews
                                  try {
                                    const mu = ep.mediaUrl;
                                    if (mu) {
                                      if (mu.startsWith("[")) {
                                        const parsed = JSON.parse(mu);
                                        const segments = parsed.map((item: any) => ({
                                          url: item.url || item.medium || item.high || item.low || "",
                                          duration: item.duration || 0,
                                          low: item.low,
                                          medium: item.medium,
                                          high: item.high
                                        }));
                                        setEditMediaSegments(segments);
                                      } else if (mu.startsWith("{")) {
                                        const parsed = JSON.parse(mu);
                                        setEditMediaSegments([{
                                          url: parsed.medium || parsed.high || parsed.low || "",
                                          duration: ep.durationSeconds || 0,
                                          low: parsed.low,
                                          medium: parsed.medium,
                                          high: parsed.high
                                        }]);
                                      } else {
                                        setEditMediaSegments([{ url: mu, duration: ep.durationSeconds || 0 }]);
                                      }
                                    } else {
                                      setEditMediaSegments([]);
                                    }
                                  } catch (err) { 
                                    console.error("Error parsing mediaUrl:", err);
                                    setEditMediaSegments([]); 
                                  }
                                  setShowEditEpisodeModal(true);
                                }}
                                className="p-2 rounded text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                title="Edit Chapter"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEpisode(ep.id, ep.title)}
                                className="p-2 rounded text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Delete Memory"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile-optimized view (cards list) */}
                <div className="block md:hidden space-y-4">
                  {episodes.map((ep, idx) => (
                    <div 
                      key={ep.id} 
                      draggable
                      onDragStart={(e) => {
                        setDraggedEpisodeIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedEpisodeIdx !== idx) {
                          setDragOverEpisodeIdx(idx);
                        }
                      }}
                      onDragLeave={() => setDragOverEpisodeIdx(null)}
                      onDrop={(e) => {
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
                      className={`p-4 bg-black/30 border rounded-lg flex flex-col gap-3 relative transition-all duration-200 ${
                        draggedEpisodeIdx === idx 
                          ? "opacity-30 bg-zinc-800/80 border-dashed border-[#E50914]" 
                          : dragOverEpisodeIdx === idx 
                          ? "bg-red-950/20 border-2 border-[#E50914] scale-[1.02] shadow-lg" 
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* Drag Handle Icon for mobile */}
                      <div className="absolute top-2.5 right-2 px-1 py-0.5 rounded cursor-grab active:cursor-grabbing text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="w-24 aspect-video rounded overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 relative">
                          <img 
                            src={ep.thumbnailUrl || season.thumbnailUrl || "https://images.unsplash.com/photo-1542204172-e7052809f85e?q=80&w=150"} 
                            alt={ep.title} 
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest bg-black/80 text-white border border-white/5">
                            EP {ep.episodeNumber}
                          </span>
                        </div>
                        
                        {/* Title / Info */}
                        <div className="min-w-0 flex-grow">
                          <h4 className="font-bold text-white text-sm line-clamp-2">
                            {ep.title}
                          </h4>
                          <p className="text-white/40 text-[10px] flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ep.memoryDate).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest bg-black/50 border ${
                              ep.mediaType === "video" ? "text-red-400 border-red-500/20" : "text-emerald-400 border-emerald-500/20"
                            }`}>
                              {ep.mediaType === "video" ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                              {ep.mediaType}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#808080]">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDuration(ep.durationSeconds)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Bar inside Mobile Card */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                        {/* Reorder Buttons */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReorder(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReorder(idx, "down")}
                            disabled={idx === episodes.length - 1}
                            className="p-1.5 rounded border border-white/10 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Edit/Delete Buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEpisode(ep);
                              setEditEpisodeTitle(ep.title);
                              setEditEpisodeDescription(ep.description || "");
                              setEditEpisodeMemoryDate(new Date(ep.memoryDate).toISOString().split("T")[0]);
                              setEditEpisodeThumbnailMode("custom");
                              setEditEpisodeSelectedVibeUrl(VIBE_PRESETS[0].url);
                              setEditEpisodeCustomThumbnailFile(null);
                              // Parse multi-segment mediaUrl for reordering/previews
                              try {
                                const mu = ep.mediaUrl;
                                if (mu) {
                                  if (mu.startsWith("[")) {
                                    const parsed = JSON.parse(mu);
                                    const segments = parsed.map((item: any) => ({
                                      url: item.url || item.medium || item.high || item.low || "",
                                      duration: item.duration || 0,
                                      low: item.low,
                                      medium: item.medium,
                                      high: item.high
                                    }));
                                    setEditMediaSegments(segments);
                                  } else if (mu.startsWith("{")) {
                                    const parsed = JSON.parse(mu);
                                    setEditMediaSegments([{
                                      url: parsed.medium || parsed.high || parsed.low || "",
                                      duration: ep.durationSeconds || 0,
                                      low: parsed.low,
                                      medium: parsed.medium,
                                      high: parsed.high
                                    }]);
                                  } else {
                                    setEditMediaSegments([{ url: mu, duration: ep.durationSeconds || 0 }]);
                                  }
                                } else {
                                  setEditMediaSegments([]);
                                }
                              } catch (err) { 
                                console.error("Error parsing mediaUrl:", err);
                                setEditMediaSegments([]); 
                              }
                              setShowEditEpisodeModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Edit Chapter"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEpisode(ep.id, ep.title)}
                            className="p-1.5 rounded text-white/40 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 cursor-pointer"
                            title="Delete Memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ADD MEMORY PORTAL SLIDE OUT PANEL */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-center md:justify-end font-sans overflow-hidden select-none backdrop-blur-sm p-4 md:p-0">
          {/* Backdrop Closer */}
          <div onClick={() => !uploading && setShowAddDrawer(false)} className="absolute inset-0 cursor-pointer"></div>
          
          {/* Drawer container */}
          <div className="relative w-full max-w-[500px] h-auto max-h-[90vh] md:h-full bg-[#000000] rounded-lg md:rounded-none border border-white/10 md:border-t-0 md:border-r-0 md:border-b-0 md:border-l shadow-2xl p-6 md:p-8 flex flex-col justify-between z-10 overflow-y-auto md:overflow-y-auto animate-zoom-in md:animate-slide-in">
            
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
                
                {/* Form Fields: File Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory Files (Video / Photo)</label>
                  <div className="relative border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg p-6 bg-black/20 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      multiple
                      required={selectedFiles.length === 0}
                      disabled={uploading}
                      accept="video/*,image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    {selectedFiles.length > 0 ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto transition-transform duration-300 scale-100" />
                        <p className="text-sm font-semibold text-white">
                          {selectedFiles.length} files ready for S3 Vault
                        </p>
                        <span className="text-[10px] text-[#808080] font-bold uppercase tracking-wider block">
                          Click or drag to add more
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-10 h-10 text-white/40 mx-auto group-hover:text-white" />
                        <span className="text-xs font-semibold text-white/60 group-hover:text-white">Choose files or drag here</span>
                        <p className="text-[9px] text-[#808080] font-bold">Videos &le; 2GB • Images &le; 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Files Grid */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">
                      Selected Files ({selectedFiles.length})
                    </label>
                    <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {selectedFiles.map((file, idx) => {
                        const isVideoFile = file.type.startsWith("video/");
                        const frameUrl = extractedFrameBlobs[file.name];
                        const previewUrl = isVideoFile ? frameUrl : previewUrls[file.name];
                        return (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-black/40 border border-white/10 rounded-md relative group/card hover:border-white/20 transition-all">
                            <div className="w-20 aspect-video rounded overflow-hidden relative bg-black flex-shrink-0 border border-white/10">
                              {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover" alt={file.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                  {isVideoFile ? (
                                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-emerald-500" />
                                  )}
                                </div>
                              )}
                              {isVideoFile && previewUrl && (
                                <button 
                                  type="button" 
                                  onClick={() => setPreviewingVideoFile(file)} 
                                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 cursor-pointer z-20"
                                >
                                  <div className="p-1.5 bg-[#E50914] text-white rounded-full scale-90 group-hover/card:scale-100 transition-transform shadow-lg">
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </div>
                                </button>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="text-xs font-bold text-white truncate pr-6" title={file.name}>{file.name}</p>
                              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFile(idx)} 
                              className="absolute top-2 right-2 text-white/40 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 cursor-pointer p-1 rounded hover:bg-white/5 z-20"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Form Fields: Title */}
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

                {/* Form Fields: Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Description Notes (Optional)</label>
                  <textarea
                    rows={3}
                    disabled={uploading}
                    placeholder="Capture a story notes about this memory..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                  />
                </div>

                {/* Form Fields: Date picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory Captured Date</label>
                  <input
                    type="date"
                    required
                    disabled={uploading}
                    value={memoryDate}
                    onChange={(e) => setMemoryDate(e.target.value)}
                    className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all disabled:opacity-40"
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
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
                        {selectedFiles[0]?.type.startsWith("video/") 
                          ? "The system will capture the first frame of your video automatically to use as the cover preview."
                          : "For images, the uploaded image itself is automatically used as the thumbnail."}
                      </p>
                      {selectedFiles[0]?.type.startsWith("video/") && extractedFrameBlob && (
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

                {/* Action Submit */}
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0 || !title.trim() || extractingFrame}
                  className="w-full py-3.5 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 disabled:opacity-50 text-white font-bold rounded shadow-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  Save To Vault
                </button>

              </form>
            </div>

            {/* UPLOAD PROGRESS METER DISPLAY */}
            {uploading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 space-y-6 z-20">
                <div className="text-center space-y-2 animate-pulse">
                  <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mx-auto mb-2" />
                  <h4 className="text-lg font-bold tracking-wide uppercase text-white">{uploadStatusText}</h4>
                  <p className="text-white/40 text-xs">Do not close this panel or navigate away.</p>
                </div>
                
                {/* Horizontal Red Progress Line */}
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

      {/* LOCAL VIDEO PREVIEW OVERLAY */}
      {previewingVideoFile && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-[800px] bg-[#000000] border border-white/10 rounded-lg p-4 relative shadow-2xl animate-zoom-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h4 className="font-bold text-white text-base truncate max-w-[600px] flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-red-500" /> Local Video Preview: {previewingVideoFile.name}
              </h4>
              <button 
                onClick={() => setPreviewingVideoFile(null)} 
                className="text-white/40 hover:text-white cursor-pointer transition-colors p-1.5 hover:bg-white/5 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full rounded overflow-hidden bg-black border border-white/5">
              {localVideoPreviewUrl && <video src={localVideoPreviewUrl} controls autoPlay className="w-full h-full object-contain" />}
            </div>
            <div className="flex justify-end pt-3 mt-1 text-[11px] text-[#808080] font-medium">Note: Playing local file directly from browser.</div>
          </div>
        </div>
      )}

      {/* SEGMENT PLAYBACK LIGHTBOX MODAL */}
      {previewingSegmentUrl && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-[850px] bg-black border border-white/10 rounded-lg p-5 relative shadow-2xl animate-zoom-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h4 className="font-bold text-white text-base truncate max-w-[650px] flex items-center gap-2">
                <Film className="w-5 h-5 text-[#E50914]" />
                Media Segment Preview: {previewingSegmentName}
              </h4>
              <button 
                onClick={() => {
                  setPreviewingSegmentUrl(null);
                  setPreviewingSegmentName("");
                }} 
                className="text-white/40 hover:text-white cursor-pointer transition-colors p-1.5 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="aspect-video w-full rounded overflow-hidden bg-black border border-white/5 relative">
              {(() => {
                const ext = previewingSegmentUrl.split("?")[0].split(".").pop()?.toUpperCase() || "";
                const isVideo = ["MP4","MOV","AVI","MKV","WEBM"].includes(ext);
                return isVideo ? (
                  <video 
                    src={previewingSegmentUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <img 
                    src={previewingSegmentUrl} 
                    className="w-full h-full object-contain" 
                    alt={previewingSegmentName} 
                  />
                );
              })()}
            </div>
            
            <div className="flex justify-end pt-3 mt-1 text-[11px] text-[#808080] font-medium font-sans">
              Stream preview loaded directly from secure S3 Vault.
            </div>
          </div>
        </div>
      )}


      {/* EDIT COLLECTION INTERACTIVE MODAL */}
      {showEditModal && (
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

      {/* EDIT CHAPTER INTERACTIVE MODAL */}
      {showEditEpisodeModal && editingEpisode && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[600px] bg-[#000000] border border-white/10 rounded-lg px-6 py-8 md:p-10 relative shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => !savingEpisode && setShowEditEpisodeModal(false)}
              disabled={savingEpisode}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide mb-2 flex items-center gap-2.5">
              <Edit className="w-8 h-8 text-[#E50914]" />
              Edit Chapter
            </h2>
            <p className="text-white/50 text-sm mb-6">Modify chapter details and customize thumbnail cover.</p>

            <form onSubmit={handleEditEpisode} className="space-y-6">
              
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Chapter Title</label>
                <input
                  type="text"
                  required
                  disabled={savingEpisode}
                  placeholder="Enter chapter title..."
                  value={editEpisodeTitle}
                  onChange={(e) => setEditEpisodeTitle(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-base focus:outline-none transition-all disabled:opacity-40"
                />
              </div>

              {/* Description input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Description Notes (Optional)</label>
                <textarea
                  rows={3}
                  disabled={savingEpisode}
                  placeholder="Provide a quick summary or notes..."
                  value={editEpisodeDescription}
                  onChange={(e) => setEditEpisodeDescription(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all resize-none disabled:opacity-40"
                />
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080]">Memory Captured Date</label>
                <input
                  type="date"
                  required
                  disabled={savingEpisode}
                  value={editEpisodeMemoryDate}
                  onChange={(e) => setEditEpisodeMemoryDate(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#666]/30 border border-transparent focus:border-white focus:bg-[#666]/50 rounded text-white text-sm focus:outline-none transition-all disabled:opacity-40"
                />
              </div>

              {/* Thumbnail / Cover selection */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center justify-between">
                  <span>Cover Thumbnail</span>
                </label>
                
                {/* Segmented Selector */}
                <div className="grid grid-cols-3 gap-2 bg-[#222]/60 p-1 rounded border border-white/5 text-xs text-center font-bold">
                  <button
                    type="button"
                    onClick={() => setEditEpisodeThumbnailMode("custom")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${editEpisodeThumbnailMode === "custom" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Custom Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEpisodeThumbnailMode("vibe")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${editEpisodeThumbnailMode === "vibe" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Vibe Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEpisodeThumbnailMode("current")}
                    className={`py-1.5 rounded transition-all cursor-pointer ${editEpisodeThumbnailMode === "current" ? "bg-white text-black font-extrabold shadow" : "text-white/60 hover:text-white"}`}
                  >
                    Keep Current
                  </button>
                </div>

                {/* Option 1: Custom Upload */}
                {editEpisodeThumbnailMode === "custom" && (
                  <div className="space-y-3 p-3 bg-black/30 border border-white/5 rounded">
                    <div className="relative border border-dashed border-white/20 hover:border-white/40 rounded p-4 text-center cursor-pointer transition-colors bg-[#2f2f2f]/20 hover:bg-[#2f2f2f]/40">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setEditEpisodeCustomThumbnailFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {editEpisodeCustomThumbnailFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">{editEpisodeCustomThumbnailFile.name}</p>
                          <p className="text-[9px] text-[#808080] font-semibold uppercase">{(editEpisodeCustomThumbnailFile.size / (1024 * 1024)).toFixed(2)} MB</p>
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

                {/* Option 2: Vibe Presets */}
                {editEpisodeThumbnailMode === "vibe" && (
                  <div className="space-y-3 p-3 bg-black/30 border border-white/5 rounded">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {VIBE_PRESETS.map((vibe, idx) => (
                        <div
                          key={idx}
                          onClick={() => setEditEpisodeSelectedVibeUrl(vibe.url)}
                          className={`cursor-pointer rounded overflow-hidden aspect-video border-2 transition-all relative group/vibe ${
                            editEpisodeSelectedVibeUrl === vibe.url ? "border-[#E50914] scale-105" : "border-transparent hover:scale-102"
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

                {/* Option 3: Keep Current */}
                {editEpisodeThumbnailMode === "current" && (
                  <div className="p-3 bg-black/30 border border-white/5 rounded text-xs text-white/50 leading-relaxed space-y-2">
                    <p>Keeping the current thumbnail cover image for this memory.</p>
                    {(editingEpisode.thumbnailUrl || season.thumbnailUrl) && (
                      <div className="relative w-32 aspect-video rounded overflow-hidden border border-white/15 bg-black">
                        <img 
                          src={editingEpisode.thumbnailUrl || season.thumbnailUrl || ""} 
                          className="w-full h-full object-cover" 
                          alt="Current cover preview" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Media Segment Manager — previews, reordering, deleting, and adding files */}
              {editMediaSegments.length >= 1 && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#808080] flex items-center gap-2">
                      <Film className="w-3.5 h-3.5 text-[#E50914]" />
                      Media Files & Segments
                    </label>
                    <span className="text-[10px] text-white/30 font-medium font-mono">{editMediaSegments.length} segments</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed -mt-1">
                    Manage videos inside this chapter. Drag/reorder playback sequence or play to review them.
                  </p>
                  
                  {/* Visual Segments List */}
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {editMediaSegments.map((seg, idx) => {
                      const urlPath = seg.url.split("?")[0];
                      const ext = urlPath.split(".").pop()?.toUpperCase() || "FILE";
                      const isVideo = ["MP4","MOV","AVI","MKV","WEBM"].includes(ext);
                      const name = urlPath.split("/").pop() || `Segment ${idx + 1}`;
                      
                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => {
                            setDraggedSegmentIdx(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggedSegmentIdx !== idx) {
                              setDragOverSegmentIdx(idx);
                            }
                          }}
                          onDragLeave={() => setDragOverSegmentIdx(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedSegmentIdx !== null && draggedSegmentIdx !== idx) {
                              handleSegmentDrop(draggedSegmentIdx, idx);
                            }
                            setDraggedSegmentIdx(null);
                            setDragOverSegmentIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedSegmentIdx(null);
                            setDragOverSegmentIdx(null);
                          }}
                          className={`flex items-center gap-3 rounded-md p-2 transition-all duration-200 ${
                            draggedSegmentIdx === idx 
                              ? "opacity-30 bg-zinc-800/80 border border-dashed border-[#E50914]" 
                              : dragOverSegmentIdx === idx 
                              ? "bg-red-950/20 border border-[#E50914] scale-[1.02] shadow-lg" 
                              : "bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60"
                          } group/segment`}
                        >
                          {/* Visual drag handle grip */}
                          <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white transition-colors pl-1">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          {/* Segment Index Cover Thumbnail Box */}
                          <div className="w-20 aspect-video rounded overflow-hidden relative bg-black flex-shrink-0 border border-white/10 group-hover/segment:border-white/20 transition-colors">
                            {isVideo ? (
                              <>
                                <video 
                                  src={seg.url} 
                                  className="w-full h-full object-cover" 
                                  preload="metadata" 
                                  muted
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setPreviewingSegmentUrl(seg.url);
                                    setPreviewingSegmentName(name);
                                  }} 
                                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/segment:opacity-100 transition-opacity duration-200 cursor-pointer z-10"
                                >
                                  <div className="p-1.5 bg-[#E50914] text-white rounded-full scale-90 group-hover/segment:scale-100 transition-transform shadow-lg">
                                    <Play className="w-3 h-3 fill-current" />
                                  </div>
                                </button>
                              </>
                            ) : (
                              <>
                                <img 
                                  src={seg.url} 
                                  className="w-full h-full object-cover" 
                                  alt={name} 
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setPreviewingSegmentUrl(seg.url);
                                    setPreviewingSegmentName(name);
                                  }} 
                                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/segment:opacity-100 transition-opacity duration-200 cursor-pointer z-10"
                                >
                                  <div className="p-1.5 bg-neutral-800 text-white rounded-full scale-90 group-hover/segment:scale-100 transition-transform shadow-lg border border-white/10">
                                    <ImageIcon className="w-3 h-3 text-emerald-400" />
                                  </div>
                                </button>
                              </>
                            )}
                            
                            {/* Position Badge overlay */}
                            <span className="absolute bottom-1 left-1 px-1 bg-black/80 text-[8px] font-black font-mono text-zinc-400 rounded border border-white/5 pointer-events-none">
                              {idx + 1}
                            </span>
                          </div>

                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/90 font-semibold truncate select-all" title={name}>{name}</p>
                            <div className="flex gap-2 mt-1 items-center">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 bg-black/45 border ${
                                isVideo ? "text-blue-400 border-blue-500/20" : "text-emerald-400 border-emerald-500/20"
                              } rounded text-[8px] uppercase font-bold tracking-widest`}>
                                {isVideo ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                {isVideo ? "video" : "photo"}
                              </span>
                              {seg.duration > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 font-medium font-mono">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(seg.duration / 60)}m {Math.floor(seg.duration % 60)}s
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reordering and Actions control buttons group */}
                          <div className="flex items-center gap-1 flex-shrink-0 pr-1">
                            <button
                              type="button"
                              disabled={idx === 0 || savingEpisode || editMediaUploading}
                              onClick={() => {
                                const copy = [...editMediaSegments];
                                [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                setEditMediaSegments(copy);
                              }}
                              className="p-1.5 rounded bg-zinc-900 border border-white/5 text-white/40 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-105 active:scale-95"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === editMediaSegments.length - 1 || savingEpisode || editMediaUploading}
                              onClick={() => {
                                const copy = [...editMediaSegments];
                                [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                setEditMediaSegments(copy);
                              }}
                              className="p-1.5 rounded bg-zinc-900 border border-white/5 text-white/40 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-105 active:scale-95"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={editMediaSegments.length <= 1 || savingEpisode || editMediaUploading}
                              onClick={() => {
                                const copy = editMediaSegments.filter((_, sIdx) => sIdx !== idx);
                                setEditMediaSegments(copy);
                              }}
                              className="p-1.5 rounded bg-zinc-900 border border-white/5 text-white/30 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-105 active:scale-95 ml-1"
                              title="Remove Video Segment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Inline S3 Uploader to ADD new segment videos */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#808080] font-bold uppercase tracking-wider">Modify Content Files</span>
                      {editMediaUploading && (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {editMediaUploadStatus} ({editMediaUploadProgress}%)
                        </span>
                      )}
                    </div>
                    
                    <div className="relative border border-dashed border-white/15 hover:border-white/30 rounded-md p-3 text-center cursor-pointer transition-colors bg-zinc-900/20 hover:bg-zinc-900/40">
                      <input
                        type="file"
                        multiple
                        accept="video/*,image/*"
                        disabled={savingEpisode || editMediaUploading}
                        onChange={handleEditEpisodeAddFiles}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                      />
                      <div className="flex items-center justify-center gap-2 text-white/50 hover:text-white transition-colors">
                        <UploadCloud className="w-4 h-4 text-[#E50914]" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add Videos or Photos</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              )}

              {/* Action triggers */}

              <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditEpisodeModal(false)}
                  disabled={savingEpisode}
                  className="px-5 py-2 border border-white/30 text-white/70 hover:border-white hover:text-white rounded transition-colors text-sm cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEpisode || !editEpisodeTitle.trim()}
                  className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] disabled:bg-zinc-800 disabled:text-white/40 text-white font-bold rounded transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
                >
                  {savingEpisode && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
