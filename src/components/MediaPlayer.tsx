"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { Play, Pause, X, RotateCcw, Volume2, VolumeX, Maximize2, SkipForward, SkipBack, Image, ChevronLeft, ChevronRight, PauseOctagon } from "lucide-react";
import { DbEpisode } from "@/types";

export default function MediaPlayer() {
  const { activePlaybackEpisode, activePlaybackPlaylist, setActivePlayback } = useStore();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  
  // Netflix Intro states
  const [introActive, setIntroActive] = useState<boolean>(false);

  // Photo slideshow states
  const [slideshowActive, setSlideshowActive] = useState(true);
  const [slideshowProgress, setSlideshowProgress] = useState(0);

  // Multi-video sequence states
  const [currentSubVideoIndex, setCurrentSubVideoIndex] = useState(0);
  const pendingSeekTimeRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed Sub-videos List
  const subVideos = (() => {
    if (!activePlaybackEpisode) return [];
    if (activePlaybackEpisode.mediaType !== "video") return [];
    if (activePlaybackEpisode.mediaUrl.startsWith("[")) {
      try {
        return JSON.parse(activePlaybackEpisode.mediaUrl) as { url: string; duration: number }[];
      } catch (e) {
        console.error("Error parsing multi-video URL sequence:", e);
      }
    }
    return [{ url: activePlaybackEpisode.mediaUrl, duration: activePlaybackEpisode.durationSeconds || 0 }];
  })();

  const totalDuration = subVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
  const combinedDuration = subVideos.length > 1 ? totalDuration : (duration || activePlaybackEpisode?.durationSeconds || 0);

  const cumulativeTime = (() => {
    if (subVideos.length <= 1) return currentTime;
    const priorDuration = subVideos.slice(0, currentSubVideoIndex).reduce((acc, v) => acc + (v.duration || 0), 0);
    return priorDuration + currentTime;
  })();

  // Skip intro helper
  const skipIntro = () => {
    setIntroActive(false);
    setIsPlaying(true);
  };

  const handleVideoEnded = () => {
    if (introActive) {
      skipIntro();
    } else if (currentSubVideoIndex < subVideos.length - 1) {
      setCurrentSubVideoIndex(prev => prev + 1);
    } else {
      handleNext();
    }
  };

  useEffect(() => {
    // Reset play state when episode changes
    setIsPlaying(true);
    setCurrentTime(0);
    setCurrentSubVideoIndex(0);
    setSlideshowProgress(0);
    pendingSeekTimeRef.current = null;

    // Auto-enable intro if media is a video
    if (activePlaybackEpisode?.mediaType === "video") {
      setIntroActive(true);
    } else {
      setIntroActive(false);
    }
  }, [activePlaybackEpisode]);

  const isVideo = activePlaybackEpisode?.mediaType === "video";
  const videoSrc = (isVideo && introActive)
    ? "/netflix _intro_1080p.mp4"
    : (subVideos[currentSubVideoIndex]?.url || activePlaybackEpisode?.mediaUrl || "");

  // Handle dynamic source loading & play state
  useEffect(() => {
    if (isVideo && !introActive && videoRef.current) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(err => console.log("Video source change play error:", err));
      }
    }
  }, [videoSrc, introActive, isVideo]);

  // Handle controls hide timer
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && activePlaybackEpisode?.mediaType === "video") {
        setControlsVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, activePlaybackEpisode]);

  // Playlist navigation helpers
  const getIndex = () => {
    if (!activePlaybackPlaylist || !activePlaybackEpisode) return -1;
    return activePlaybackPlaylist.findIndex(e => e.id === activePlaybackEpisode.id);
  };

  const handleNext = () => {
    const idx = getIndex();
    if (activePlaybackPlaylist && idx !== -1 && idx < activePlaybackPlaylist.length - 1) {
      setActivePlayback(activePlaybackPlaylist[idx + 1], activePlaybackPlaylist);
    }
  };

  const handlePrev = () => {
    const idx = getIndex();
    if (activePlaybackPlaylist && idx > 0) {
      setActivePlayback(activePlaybackPlaylist[idx - 1], activePlaybackPlaylist);
    }
  };

  const triggerSeekToTime = (targetTime: number) => {
    if (subVideos.length <= 1) {
      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
      return;
    }

    let accumulatedTime = 0;
    let targetSegmentIndex = 0;
    let relativeTime = targetTime;

    for (let i = 0; i < subVideos.length; i++) {
      const segmentDuration = subVideos[i].duration || 0;
      if (accumulatedTime + segmentDuration >= targetTime) {
        targetSegmentIndex = i;
        relativeTime = targetTime - accumulatedTime;
        break;
      }
      accumulatedTime += segmentDuration;
      if (i === subVideos.length - 1) {
        targetSegmentIndex = i;
        relativeTime = segmentDuration;
      }
    }

    if (targetSegmentIndex !== currentSubVideoIndex) {
      pendingSeekTimeRef.current = relativeTime;
      setCurrentSubVideoIndex(targetSegmentIndex);
      setCurrentTime(relativeTime);
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = relativeTime;
        setCurrentTime(relativeTime);
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePlaybackEpisode) return;
      
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          if (introActive) break;
          if (activePlaybackEpisode.mediaType === "video") {
            const target = Math.max(0, cumulativeTime - 10);
            triggerSeekToTime(target);
          } else if (activePlaybackEpisode.mediaType === "photo") {
            handlePrev();
          }
          break;
        case "arrowright":
          e.preventDefault();
          if (introActive) break;
          if (activePlaybackEpisode.mediaType === "video") {
            const target = Math.min(combinedDuration, cumulativeTime + 10);
            triggerSeekToTime(target);
          } else if (activePlaybackEpisode.mediaType === "photo") {
            handleNext();
          }
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "escape":
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlaybackEpisode, combinedDuration, cumulativeTime, isPlaying, introActive, currentSubVideoIndex]);

  // Video playback listeners
  const togglePlay = () => {
    if (activePlaybackEpisode?.mediaType === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(err => console.log(err));
        setIsPlaying(true);
      }
    } else if (activePlaybackEpisode?.mediaType === "photo") {
      setSlideshowActive(!slideshowActive);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (pendingSeekTimeRef.current !== null) {
        videoRef.current.currentTime = pendingSeekTimeRef.current;
        setCurrentTime(pendingSeekTimeRef.current);
        pendingSeekTimeRef.current = null;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    triggerSeekToTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);
    if (videoRef.current) {
      videoRef.current.muted = nextMuteState;
      videoRef.current.volume = nextMuteState ? 0 : volume;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {});
    }
    setActivePlayback(null, null);
  };

  // Format Duration string
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Photo slideshow timer advance
  useEffect(() => {
    if (!activePlaybackEpisode || activePlaybackEpisode.mediaType !== "photo" || !slideshowActive) return;
    
    const interval = 100; // Timer tick
    const totalDuration = 5000; // 5s slide show advance
    const steps = totalDuration / interval;
    
    const timer = setInterval(() => {
      setSlideshowProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / steps);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activePlaybackEpisode, slideshowActive]);

  if (!activePlaybackEpisode) return null;

  const idx = getIndex();
  const playlistLen = activePlaybackPlaylist?.length || 0;
  const hasNext = playlistLen > 0 && idx !== -1 && idx < playlistLen - 1;
  const hasPrev = playlistLen > 0 && idx > 0;

  return (
    <div 
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center font-sans overflow-hidden select-none"
    >
      
      {/* Top Header Overlay info */}
      {controlsVisible && (
        <div className="absolute top-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10 transition-opacity duration-300">
          <div className="flex items-center gap-4 text-white">
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            <div className="space-y-1">
              <h3 className="text-sm md:text-base text-white/60 font-bold uppercase tracking-wider">
                Playing Memory {idx !== -1 ? `${idx + 1} of ${playlistLen}` : ""}
              </h3>
              <h2 className="text-xl md:text-3xl font-black tracking-wide">
                {activePlaybackEpisode.title}
              </h2>
              <p className="text-xs md:text-sm text-[#808080]">
                {new Date(activePlaybackEpisode.memoryDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RENDER CONTENT WINDOW */}
      {isVideo ? (
        <div className="w-full h-full relative">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />
          
          {introActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                skipIntro();
              }}
              className="absolute bottom-28 right-8 z-30 px-6 py-2.5 bg-black/85 hover:bg-white hover:text-black border border-white/20 hover:border-white text-white font-bold rounded-sm text-sm uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-2xl flex items-center gap-2 cursor-pointer animate-pulse"
            >
              Skip Intro
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="w-full h-full relative flex items-center justify-center bg-black/90 p-4">
          <img
            src={activePlaybackEpisode.mediaUrl}
            alt={activePlaybackEpisode.title}
            className="max-w-full max-h-full object-contain shadow-2xl rounded border border-white/5"
          />
          
          {/* Photo Captions overlay */}
          <div className="absolute bottom-28 left-6 right-6 text-center max-w-2xl mx-auto space-y-1">
            <p className="text-white text-lg font-bold drop-shadow-md">
              {activePlaybackEpisode.description || activePlaybackEpisode.title}
            </p>
          </div>
        </div>
      )}

      {/* SCREEN NAVIGATION CONTROLS */}
      {controlsVisible && (
        <>
          {/* Left Arrow (Prev Item) */}
          {hasPrev && (
            <button
              onClick={handlePrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 text-white cursor-pointer z-10 hover:scale-110 transition-all duration-200"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* Right Arrow (Next Item) */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full border border-white/20 text-white cursor-pointer z-10 hover:scale-110 transition-all duration-200"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* PLAYBACK BOTTOM BAR */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/90 to-transparent space-y-4 z-10 transition-opacity duration-300">
            
            {/* Seek/Duration Bar for Videos, or Progress advance for Photos */}
            {isVideo ? (
              <div className="flex items-center gap-4 w-full">
                {introActive ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="relative w-full h-1.5 bg-black/40 rounded-lg overflow-hidden border border-red-900/30">
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-red-600 via-[#E50914] to-red-600 animate-[pulse_1.5s_infinite] shadow-[0_0_8px_#E50914]"></div>
                    </div>
                    <span className="flex items-center gap-1.5 bg-[#E50914] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm shadow-[0_0_8px_#E50914] animate-pulse whitespace-nowrap">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                      Intro
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full">
                    <input
                      type="range"
                      min={0}
                      max={combinedDuration || 0}
                      value={cumulativeTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-[#666]/50 rounded-lg appearance-none cursor-pointer accent-[#E50914] focus:outline-none transition-all duration-300"
                    />
                    <span className="text-white text-xs md:text-sm font-bold min-w-16 text-right tabular-nums">
                      {formatTime(cumulativeTime)} / {formatTime(combinedDuration)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              slideshowActive && (
                <div className="w-full h-1 bg-[#666]/30 rounded-lg overflow-hidden">
                  <div 
                    className="h-full bg-[#E50914] transition-all duration-100 ease-linear"
                    style={{ width: `${slideshowProgress}%` }}
                  ></div>
                </div>
              )
            )}

            {/* Custom Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-[#E50914] hover:scale-110 transition-all p-1 cursor-pointer"
                >
                  {isVideo ? (
                    isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current" />
                  ) : (
                    slideshowActive ? <PauseOctagon className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />
                  )}
                </button>

                {/* Back 10s (only video) */}
                {isVideo && (
                  <button
                    onClick={() => {
                      if (introActive) return;
                      const target = Math.max(0, cumulativeTime - 10);
                      triggerSeekToTime(target);
                    }}
                    disabled={introActive}
                    className={`text-white hover:scale-110 transition-all p-1 cursor-pointer ${
                      introActive ? "opacity-30 cursor-not-allowed" : "hover:text-[#E50914]"
                    }`}
                    title={introActive ? "Seeking disabled during intro" : "Seek backward 10s"}
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                )}

                {/* Volume bar (only video) */}
                {isVideo && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-white/80 transition-colors p-1 cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-24 h-1 bg-[#666]/50 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Slideshow Active marker */}
                {!isVideo && (
                  <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-white/50">
                    <Image className="w-4 h-4" />
                    <span>{slideshowActive ? "Autoplay Slideshow On" : "Slideshow Paused"}</span>
                  </div>
                )}

              </div>

              {/* Right Side triggers */}
              <div className="flex items-center gap-6">
                

                {/* Episode Skip Buttons */}
                <div className="flex items-center gap-3 text-white">
                  <button
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="hover:text-[#E50914] disabled:opacity-30 disabled:hover:text-white transition-colors p-1 cursor-pointer"
                    title="Previous Episode"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="hover:text-[#E50914] disabled:opacity-30 disabled:hover:text-white transition-colors p-1 cursor-pointer"
                    title="Next Episode"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-white/80 hover:scale-110 transition-all p-1 cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-6 h-6" />
                </button>

              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
