"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface NetflixIntroProps {
  onComplete: () => void;
}

export default function NetflixIntro({ onComplete }: NetflixIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Safety fallback: if video gets stuck or fails to load, force finish after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isFading) {
        handleComplete();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isFading]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Standard unmuted autoplay attempt
    video.muted = false;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.warn("Autoplay unmuted blocked by browser, falling back to muted:", error);
          // Fallback to muted autoplay
          setIsMuted(true);
          video.muted = true;
          video.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.error("Muted autoplay also failed. Transitioning out.", err);
              handleComplete();
            });
        });
    }
  }, []);

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering screen click skip
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    // Let the framer motion exit transition trigger or callback directly
    setTimeout(() => {
      onComplete();
    }, 800); // matches fade duration
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFading ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onClick={handleComplete}
      className="fixed inset-0 z-50 bg-[#141414] flex items-center justify-center cursor-pointer select-none overflow-hidden"
    >
      {/* Intro Video Element */}
      <video
        ref={videoRef}
        src="/netflix _intro_1080p.mp4"
        playsInline
        preload="auto"
        onEnded={handleComplete}
        className="w-full h-full object-contain max-w-screen-2xl aspect-video"
      />

      {/* Floating Speaker Control */}
      {isPlaying && (
        <button
          onClick={handleMuteToggle}
          className="absolute bottom-8 left-8 z-50 p-3 bg-black/50 hover:bg-white/10 border border-white/20 hover:border-white text-white rounded-full transition-all duration-300 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* Unmute prompt banner if playing muted */}
      {isPlaying && isMuted && (
        <div className="absolute bottom-24 left-8 z-50 bg-black/75 border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold text-white/90 shadow-xl flex items-center gap-2 animate-bounce">
          <span>🔊 Click to play with audio!</span>
        </div>
      )}

      {/* Floating Skip Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleComplete();
        }}
        className="absolute bottom-8 right-8 z-50 px-6 py-2.5 bg-black/50 hover:bg-white/10 border border-white/20 hover:border-white text-white font-bold rounded text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer"
      >
        Skip Intro
      </button>
    </motion.div>
  );
}
