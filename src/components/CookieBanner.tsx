"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import { Cookie, X, Shield, Settings, Sliders, Check, HelpCircle } from "lucide-react";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  performance: boolean;
  targeting: boolean;
}

export default function CookieBanner() {
  const { showCookieConsentModal, setShowCookieConsentModal } = useStore();
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  
  // Consent toggles state
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    functional: true,
    performance: true,
    targeting: false,
  });

  // Load saved preferences on mount
  useEffect(() => {
    const consentCookie = getCookie("memoryflix_cookie_consent");
    if (!consentCookie) {
      // Small timeout to animate banner slide-up nicely
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(consentCookie) as CookiePreferences;
        setPreferences({
          ...parsed,
          essential: true, // force true
        });
      } catch (e) {
        console.error("Error parsing cookie consent:", e);
      }
    }
  }, []);

  // Sync modal view when showCookieConsentModal is triggered from store
  useEffect(() => {
    if (showCookieConsentModal) {
      setShowCustomize(true);
    }
  }, [showCookieConsentModal]);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      performance: true,
      targeting: true,
    };
    savePreferences(allAccepted);
  };

  const handleDeclineAll = () => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      functional: false,
      performance: false,
      targeting: false,
    };
    savePreferences(onlyEssential);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    // 1. Save consent settings in cookie (valid for 365 days)
    setCookie("memoryflix_cookie_consent", JSON.stringify(prefs), 365);
    setPreferences(prefs);
    
    // 2. Apply or remove cookies based on preferences
    if (prefs.functional) {
      // Sync settings and preferences to cookies if allowed
      if (typeof window !== "undefined") {
        const storedQuality = localStorage.getItem("mf_pref_quality") || "ultra";
        const storedAudio = localStorage.getItem("mf_pref_audio") || "dolby";
        const storedAutoplayNext = localStorage.getItem("mf_pref_autoplay_next") || "true";
        const storedAutoplayPrev = localStorage.getItem("mf_pref_autoplay_prev") || "true";

        setCookie("mf_pref_quality", storedQuality, 365);
        setCookie("mf_pref_audio", storedAudio, 365);
        setCookie("mf_pref_autoplay_next", storedAutoplayNext, 365);
        setCookie("mf_pref_autoplay_prev", storedAutoplayPrev, 365);
      }
    } else {
      // Remove preferences cookies if functional cookie consent is declined
      deleteCookie("mf_pref_quality");
      deleteCookie("mf_pref_audio");
      deleteCookie("mf_pref_autoplay_next");
      deleteCookie("mf_pref_autoplay_prev");
    }

    if (!prefs.essential) {
      // Edge case: if they somehow clear essential, delete active profile cookie
      deleteCookie("memoryflix_active_profile_id");
    } else {
      // Make sure active profile is written to cookie
      if (typeof window !== "undefined") {
        const activeProfileId = localStorage.getItem("memoryflix_active_profile_id");
        if (activeProfileId) {
          setCookie("memoryflix_active_profile_id", activeProfileId, 365);
        }
      }
    }

    // 3. Close the banner and custom settings modal
    setIsVisible(false);
    setShowCustomize(false);
    setShowCookieConsentModal(false);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === "essential") return; // cannot toggle essential
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeConsentModal = () => {
    setShowCustomize(false);
    setShowCookieConsentModal(false);
  };

  if (!isVisible && !showCustomize) return null;

  return (
    <>
      {/* 1. BOTTOM SLIDE-UP COOKIE CONSENT BANNER */}
      {isVisible && !showCustomize && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6 bg-gradient-to-t from-black via-black/95 to-black/90 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.85)] animate-slide-in-up backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left Description Box */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-netflix-red/10 border border-netflix-red/20 rounded-full flex-shrink-0 text-netflix-red hidden sm:flex">
                <Cookie className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-netflix-red sm:hidden" />
                  We Respect Your Privacy & Experience
                </h4>
                <p className="text-white/70 text-xs sm:text-sm leading-relaxed max-w-3xl font-medium">
                  MemoryFlix uses essential cookies to authenticate your account and persist active profiles. We also utilize optional cookies to save your streaming preferences (like Dolby surround-sound output and 4K Ultra-HD resolution presets) and evaluate site performance.
                </p>
              </div>
            </div>

            {/* Right ButtonsHUD */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowCustomize(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded border border-white/20 hover:border-white/50 text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" /> Customize
              </button>

              <button
                onClick={handleDeclineAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Essential Only
              </button>

              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_15px_rgba(229,9,20,0.3)] hover:scale-102 active:scale-98 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Accept All
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. CUSTOMIZE PREFERENCES MODAL OVERLAY */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in select-none font-sans">
          <div className="relative w-full max-w-2xl bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-zoom-in">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-3 text-netflix-red">
                <Shield className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-lg sm:text-xl tracking-wide">Cookie Privacy settings</h3>
              </div>
              <button 
                onClick={closeConsentModal}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Cookie List */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
              <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-4">
                You can manage and toggle optional cookies here. Standard essential cookies cannot be disabled since they are necessary to maintain database queries and establish secure Supabase vaults.
              </p>

              {/* 1. Essential Category */}
              <div className="p-4 bg-black/45 rounded-xl border border-white/5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Strictly Necessary Cookies
                    <span className="text-[9px] font-extrabold text-netflix-red bg-netflix-red/10 border border-netflix-red/20 px-2 py-0.5 rounded uppercase tracking-wider">Required</span>
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed max-w-md">
                    Required for vital functions. Storing secure cryptographic credentials, maintaining your user session details, and tracking your active profile choice.
                  </p>
                </div>
                <div className="relative w-12 h-6 rounded-full bg-netflix-red/50 cursor-not-allowed flex items-center justify-end p-1">
                  <div className="w-4 h-4 rounded-full bg-white/70"></div>
                </div>
              </div>

              {/* 2. Functional Category */}
              <div className="p-4 bg-black/45 rounded-xl border border-white/5 flex items-start justify-between gap-4 hover:border-white/10 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Functional & Preference Cookies
                    {preferences.functional && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Active</span>}
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed max-w-md">
                    Enables us to save customized visual selections. Storing your maximum video playback resolution, custom audio mode settings, and autoplay configs in cookies.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference("functional")}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                    preferences.functional ? "bg-netflix-red justify-end" : "bg-zinc-800 justify-start border border-white/5"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300"></div>
                </button>
              </div>

              {/* 3. Performance Category */}
              <div className="p-4 bg-black/45 rounded-xl border border-white/5 flex items-start justify-between gap-4 hover:border-white/10 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Performance & Analytics Cookies
                    {preferences.performance && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Active</span>}
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed max-w-md">
                    Helps us audit network latencies and analyze stream failures. Gathers aggregated load-time metrics and tracks page visit routes to optimize media streaming.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference("performance")}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                    preferences.performance ? "bg-netflix-red justify-end" : "bg-zinc-800 justify-start border border-white/5"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300"></div>
                </button>
              </div>

              {/* 4. Targeting Category */}
              <div className="p-4 bg-black/45 rounded-xl border border-white/5 flex items-start justify-between gap-4 hover:border-white/10 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Targeting & Marketing Cookies
                    {preferences.targeting && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Active</span>}
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed max-w-md">
                    Used to deliver customized information regarding your subscription tier, personalized recommendations, or newsletters.
                  </p>
                </div>
                <button
                  onClick={() => togglePreference("targeting")}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                    preferences.targeting ? "bg-netflix-red justify-end" : "bg-zinc-800 justify-start border border-white/5"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300"></div>
                </button>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/20">
              <button
                onClick={handleDeclineAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded border border-white/10 hover:border-white/20 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Decline Optional
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleSaveCustom}
                  className="w-full sm:w-auto px-5 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Save My Choices
                </button>

                <button
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_15px_rgba(229,9,20,0.35)] flex items-center justify-center gap-2"
                >
                  Accept All
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
