"use client";

import { useEffect, useState, Suspense } from "react";
import { useStore } from "@/store/useStore";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { supabase, logout } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import { 
  User, Shield, Lock, Eye, EyeOff, Tv, Volume2, Check, 
  LogOut, AlertTriangle, Key, Mail, CheckCircle2, ChevronRight,
  Database, Cloud, HardDrive, Trash2, Sparkles, Loader2, Sliders
} from "lucide-react";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nico",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kira",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Otis",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Finn",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha"
];

function SettingsPageContent() {
  const { dbUser, activeProfile, setActiveProfile, setDbUser, isLoading, setShowCookieConsentModal } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active section tab
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "preferences" | "storage">("profile");

  // Storage Vault states
  const [storageData, setStorageData] = useState<any>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null);

  // Profile forms
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Account forms
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Premium toggles (stored in state/localStorage for demo)
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoplayPreviews, setAutoplayPreviews] = useState(true);
  const [streamQuality, setStreamQuality] = useState("ultra");
  const [audioMode, setAudioMode] = useState("dolby");

  // Feedback notifications
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Parse URL search parameters to sync active tab
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "storage") {
      setActiveTab("storage");
    } else if (tabParam === "account") {
      setActiveTab("account");
    } else if (tabParam === "preferences") {
      setActiveTab("preferences");
    } else {
      setActiveTab("profile");
    }
  }, [searchParams]);

  // Fetch storage data if vault tab is active
  const fetchStorageData = async () => {
    if (!dbUser) return;
    setStorageLoading(true);
    setStorageError(null);
    try {
      const res = await axios.get(`/api/storage?userId=${dbUser.id}`);
      setStorageData(res.data);
    } catch (err: any) {
      console.error(err);
      setStorageError(err.response?.data?.error || "Failed to load storage vault footprint.");
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "storage" && dbUser) {
      fetchStorageData();
    }
  }, [activeTab, dbUser]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleDeleteFile = async (file: any) => {
    if (!dbUser) return;
    const isOrphan = file.isOrphaned;
    const displayStr = isOrphan ? `unmatched asset "${file.filename}"` : `memory "${file.displayName}"`;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete this ${displayStr} from AWS cloud servers? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeletingFileKey(file.key);
    try {
      if (file.episodeId) {
        // Delete via episode endpoint which removes Supabase record and cleans up S3
        await axios.delete(`/api/episodes?id=${file.episodeId}`);
      } else {
        // Delete orphaned/metadata S3 object directly
        await axios.delete(`/api/storage?key=${encodeURIComponent(file.key)}&userId=${dbUser.id}`);
      }
      triggerNotification("success", "Storage space reclaimed successfully!");
      await fetchStorageData();
    } catch (err: any) {
      console.error(err);
      triggerNotification("error", err.response?.data?.error || "Failed to delete asset from storage.");
    } finally {
      setDeletingFileKey(null);
    }
  };

  // Populate data when loaded
  useEffect(() => {
    if (!isLoading && !dbUser) {
      router.push("/login");
      return;
    }

    if (activeProfile) {
      setProfileName(activeProfile.name);
      setProfileAvatar(activeProfile.avatarUrl);
    }

    if (dbUser) {
      setAccountName(dbUser.name || "");
      setAccountEmail(dbUser.email);
    }
  }, [dbUser, activeProfile, isLoading]);

  // Load preferences from cookies/local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuality = getCookie("mf_pref_quality") || localStorage.getItem("mf_pref_quality");
      const storedAudio = getCookie("mf_pref_audio") || localStorage.getItem("mf_pref_audio");
      const storedAutoplayNext = getCookie("mf_pref_autoplay_next") || localStorage.getItem("mf_pref_autoplay_next");
      const storedAutoplayPrev = getCookie("mf_pref_autoplay_prev") || localStorage.getItem("mf_pref_autoplay_prev");

      if (storedQuality) setStreamQuality(storedQuality);
      if (storedAudio) setAudioMode(storedAudio);
      if (storedAutoplayNext) setAutoplayNext(storedAutoplayNext === "true");
      if (storedAutoplayPrev) setAutoplayPreviews(storedAutoplayPrev === "true");
    }
  }, []);

  const triggerNotification = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 5000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !profileName.trim()) return;

    setProfileSaving(true);
    try {
      const res = await axios.put("/api/profiles", {
        id: activeProfile.id,
        name: profileName.trim(),
        avatarUrl: profileAvatar
      });
      setActiveProfile(res.data);
      triggerNotification("success", "Watch profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      triggerNotification("error", err.message || "Failed to update watch profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser || !accountName.trim()) return;

    setAccountSaving(true);
    try {
      // 1. Update name on Supabase Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: accountName.trim() }
      });
      if (authError) throw authError;

      // 2. Update email if changed
      if (accountEmail !== dbUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: accountEmail
        });
        if (emailError) throw emailError;
        triggerNotification("success", "Profile updated. An email confirmation link was sent to your new address!");
      }

      // 3. Sync database table
      const res = await axios.put("/api/users", {
        id: dbUser.id,
        name: accountName.trim()
      });
      setDbUser(res.data);
      triggerNotification("success", "Account details updated successfully!");
    } catch (err: any) {
      console.error(err);
      triggerNotification("error", err.message || "Failed to save account details.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      triggerNotification("error", "Password field cannot be empty.");
      return;
    }
    if (password !== confirmPassword) {
      triggerNotification("error", "Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      
      setPassword("");
      setConfirmPassword("");
      triggerNotification("success", "Password updated securely in auth servers!");
    } catch (err: any) {
      console.error(err);
      triggerNotification("error", err.message || "Password update failed. Try signing in again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const savePreferences = (key: string, value: string | boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, String(value));
      
      const consentCookie = getCookie("memoryflix_cookie_consent");
      let functionalAllowed = false;
      if (consentCookie) {
        try {
          const parsed = JSON.parse(consentCookie);
          functionalAllowed = !!parsed.functional;
        } catch (e) {}
      }
      
      if (functionalAllowed) {
        setCookie(key, String(value), 365);
      } else {
        deleteCookie(key);
      }
    }
    triggerNotification("success", "Preferences saved and applied!");
  };

  const handleLogout = async () => {
    const confirmOut = window.confirm("Are you sure you want to sign out of MemoryFlix?");
    if (!confirmOut) return;

    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (isLoading || !dbUser || !activeProfile) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans select-none overflow-x-hidden pb-16">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 pt-28 md:pt-32">
        
        {/* Status Notification banner */}
        {statusMsg && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-lg shadow-2xl border text-sm font-semibold tracking-wide animate-slide-in-right backdrop-blur-md ${
            statusMsg.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/35 text-emerald-400" 
              : "bg-red-950/90 border-red-500/35 text-red-400"
          }`}>
            {statusMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Title Header */}
        <div className="border-b border-white/10 pb-6 mb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-wide text-white">Account Settings</h1>
          <p className="text-white/40 text-xs md:text-sm font-medium mt-2">
            Manage your personal watching profile, account security, passwords, and custom streaming feeds.
          </p>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-1 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 border-b lg:border-none border-white/5 font-semibold text-sm">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-all duration-300 w-full cursor-pointer ${
                activeTab === "profile" 
                  ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/10 scale-102" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="w-4.5 h-4.5" />
              <span>Watch Profile</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-all duration-300 w-full cursor-pointer ${
                activeTab === "account" 
                  ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/10 scale-102" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className="w-4.5 h-4.5" />
              <span>Account & Security</span>
            </button>

            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-all duration-300 w-full cursor-pointer ${
                activeTab === "preferences" 
                  ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/10 scale-102" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tv className="w-4.5 h-4.5" />
              <span>Playback Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab("storage")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-all duration-300 w-full cursor-pointer ${
                activeTab === "storage" 
                  ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/10 scale-102" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Database className="w-4.5 h-4.5" />
              <span>Storage Vault</span>
            </button>
          </div>

          {/* Right Action Dashboard */}
          <div className="lg:col-span-3 bg-black/45 border border-white/5 backdrop-blur-md rounded-xl p-6 md:p-8 shadow-xl">
            
            {/* TAB: PROFILE CUSTOMIZATION */}
            {activeTab === "profile" && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                    <User className="w-6 h-6 text-netflix-red" />
                    Customize Watch Profile
                  </h2>
                  <p className="text-white/50 text-xs md:text-sm">Change this watch profile's stream label and personalized icon preset.</p>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-6">
                  {/* Current info row */}
                  <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/5 p-5 rounded-lg border border-white/5">
                    <img 
                      src={profileAvatar} 
                      alt="Selected avatar" 
                      className="w-24 h-24 rounded-lg object-cover bg-zinc-800 border border-white/20 shadow-lg"
                    />
                    <div className="flex-grow w-full space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Profile Watch Name</label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Profile Name"
                          className="w-full py-3 px-4 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white font-medium outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset avatar grid */}
                  <div className="space-y-3.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60 block">Choose Avatar Preset</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 bg-black/30 rounded-lg border border-white/5 max-h-[190px] overflow-y-auto">
                      {PRESET_AVATARS.map((avatar, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setProfileAvatar(avatar)}
                          className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square bg-[#222] shadow ${
                            profileAvatar === avatar ? "border-netflix-red scale-105" : "border-transparent hover:scale-105 hover:border-white/30"
                          }`}
                        >
                          <img src={avatar} className="w-full h-full object-cover" alt={`Avatar Preset ${idx}`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end border-t border-white/5 pt-5">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-6 py-2.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow active:scale-95"
                    >
                      {profileSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span>Save Watch Profile</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: ACCOUNT & SECURITY */}
            {activeTab === "account" && (
              <div className="space-y-10 animate-fade-in">
                
                {/* 1. Update Name and Email */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-netflix-red" />
                      Account details
                    </h2>
                    <p className="text-white/50 text-xs md:text-sm">Manage name and contact email synced with your secure auth system.</p>
                  </div>

                  <form onSubmit={handleAccountSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name field */}
                      <div className="relative group">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input
                            type="text"
                            required
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full py-3 pl-10 pr-4 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white font-medium outline-none transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Email field */}
                      <div className="relative group">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input
                            type="email"
                            required
                            value={accountEmail}
                            onChange={(e) => setAccountEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full py-3 pl-10 pr-4 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white font-medium outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={accountSaving}
                        className="px-6 py-2.5 rounded bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow active:scale-95"
                      >
                        {accountSaving ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span>Update Info</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="border-t border-white/5"></div>

                {/* 2. Change password section */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-netflix-red" />
                      Security & Passwords
                    </h2>
                    <p className="text-white/50 text-xs md:text-sm">Change and cryptographically renew your dashboard password.</p>
                  </div>

                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Password input */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">New Password</label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password (min 6 chars)"
                            className="w-full py-3 pl-10 pr-10 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white font-medium outline-none transition-all text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm input */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full py-3 pl-10 pr-10 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white font-medium outline-none transition-all text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-6 py-2.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow active:scale-95"
                      >
                        {passwordSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: PREFERENCES */}
            {activeTab === "preferences" && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                    <Tv className="w-6 h-6 text-netflix-red" />
                    Playback Preferences
                  </h2>
                  <p className="text-white/50 text-xs md:text-sm">Customize visual stream playback speed, quality, and controls.</p>
                </div>

                <div className="space-y-6">
                  {/* Toggles */}
                  <div className="space-y-4 bg-white/5 p-5 rounded-lg border border-white/5">
                    {/* Autoplay Next Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">Autoplay Next Episode</h4>
                        <p className="text-xs text-white/40 mt-0.5">Automatically trigger the countdown and start the next memory stream episode.</p>
                      </div>
                      <button
                        onClick={() => {
                          const val = !autoplayNext;
                          setAutoplayNext(val);
                          savePreferences("mf_pref_autoplay_next", val);
                        }}
                        className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                          autoplayNext ? "bg-netflix-red justify-end" : "bg-zinc-800 justify-start border border-white/5"
                        }`}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300"></div>
                      </button>
                    </div>

                    <div className="border-t border-white/5 my-3"></div>

                    {/* Autoplay Previews */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">Autoplay Previews & Audio</h4>
                        <p className="text-xs text-white/40 mt-0.5">Automatically play silent video previews while lingering on memory listings.</p>
                      </div>
                      <button
                        onClick={() => {
                          const val = !autoplayPreviews;
                          setAutoplayPreviews(val);
                          savePreferences("mf_pref_autoplay_prev", val);
                        }}
                        className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                          autoplayPreviews ? "bg-netflix-red justify-end" : "bg-zinc-800 justify-start border border-white/5"
                        }`}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300"></div>
                      </button>
                    </div>
                  </div>

                  {/* Visual Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stream Quality Selector */}
                    <div className="space-y-2 bg-white/5 p-5 rounded-lg border border-white/5">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                        <Tv className="w-4.5 h-4.5 text-netflix-red" />
                        Max Video Quality
                      </label>
                      <select
                        value={streamQuality}
                        onChange={(e) => {
                          setStreamQuality(e.target.value);
                          savePreferences("mf_pref_quality", e.target.value);
                        }}
                        className="w-full py-2.5 px-3 bg-zinc-900 border border-white/10 focus:border-white focus:outline-none rounded-md text-sm text-white cursor-pointer"
                      >
                        <option value="low">Standard Definition (SD)</option>
                        <option value="medium">High Definition (720p)</option>
                        <option value="high">Full HD (1080p)</option>
                        <option value="ultra">Ultra HD / HDR (4K)</option>
                      </select>
                      <p className="text-[10px] text-white/30 leading-relaxed font-medium">Higher quality levels consume more internet bandwidth but stream cinematic detail.</p>
                    </div>

                    {/* Audio quality selector */}
                    <div className="space-y-2 bg-white/5 p-5 rounded-lg border border-white/5">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                        <Volume2 className="w-4.5 h-4.5 text-netflix-red" />
                        Audio Output Mode
                      </label>
                      <select
                        value={audioMode}
                        onChange={(e) => {
                          setAudioMode(e.target.value);
                          savePreferences("mf_pref_audio", e.target.value);
                        }}
                        className="w-full py-2.5 px-3 bg-zinc-900 border border-white/10 focus:border-white focus:outline-none rounded-md text-sm text-white cursor-pointer"
                      >
                        <option value="stereo">2-Channel Stereo Sound</option>
                        <option value="dolby">Dolby Digital 5.1 Surround</option>
                        <option value="atmos">Dolby Atmos Cinematic</option>
                      </select>
                      <p className="text-[10px] text-white/30 leading-relaxed font-medium">Cinematic space sound streams directly to compatible spatial soundbars and headphones.</p>
                    </div>
                  </div>

                  {/* Cookie Consent Settings Card */}
                  <div className="bg-white/5 p-5 rounded-lg border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                      <Shield className="w-4.5 h-4.5 text-netflix-red" />
                      Cookie Consent Settings
                    </h4>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                      Control which optional cookies you allow us to store on your browser. MemoryFlix uses cookies to authenticate your account, sync active profile details, and save your visual quality and sound output preferences.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setShowCookieConsentModal(true)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-white/20 text-white rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5 text-netflix-red" />
                        Manage Cookie Preferences
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: STORAGE VAULT */}
            {activeTab === "storage" && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2 flex-wrap">
                    <Database className="w-6 h-6 text-netflix-red" />
                    Storage Vault
                    {storageData && (
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded border ml-2 ${
                        storageData.planName === "free" ? "bg-white/5 border-white/10 text-white/60" :
                        storageData.planName === "starter" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                        storageData.planName === "family" ? "bg-netflix-red/10 border-netflix-red/20 text-netflix-red" :
                        "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                        {storageData.planName === "free" ? "Free Tier" :
                         storageData.planName === "starter" ? "Starter Vault" :
                         storageData.planName === "family" ? "Family Circle" :
                         storageData.planName === "elite" ? "Archivist Elite" : storageData.planName}
                      </span>
                    )}
                  </h2>
                  <p className="text-white/50 text-xs md:text-sm">
                    Track your video memories storage usage. Your limit is dictated by your subscription plan.
                  </p>
                </div>

                {storageLoading && !storageData ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-netflix-red animate-spin" />
                    <p className="text-white/55 text-sm font-semibold tracking-wide">Analyzing your S3 storage footprint...</p>
                  </div>
                ) : storageError ? (
                  <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-lg text-center space-y-4">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                    <h4 className="font-bold text-red-400">Analysis Failed</h4>
                    <p className="text-white/60 text-xs max-w-md mx-auto">{storageError}</p>
                    <button
                      onClick={fetchStorageData}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all"
                    >
                      Retry Analysis
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Hero Visualizer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 p-6 rounded-xl border border-white/5 relative overflow-hidden shadow-2xl animate-scale-in">
                      {/* Decorative glowing background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-netflix-red/10 rounded-full filter blur-3xl pointer-events-none"></div>

                      {/* Main Gauge */}
                      <div className="md:col-span-2 flex flex-col justify-center space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/55">
                          <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-netflix-red" /> Vault Capacity</span>
                          <span className="text-white font-mono">{storageData ? `${storageData.percentUsed}%` : "0%"} Used</span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full h-4 bg-zinc-800/80 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-red-600 to-[#E50914] rounded-full transition-all duration-1000 relative"
                            style={{ width: `${storageData ? Math.min(storageData.percentUsed, 100) : 0}%` }}
                          >
                            {/* Inner stripe animation */}
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-white/40 font-semibold font-mono">
                          <span>{storageData ? formatBytes(storageData.totalSizeBytes) : "0 MB"}</span>
                          <span>{storageData ? formatBytes(storageData.limitBytes) : "500 MB Limit"}</span>
                        </div>
                      </div>

                      {/* Stats Breakdowns */}
                      <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 space-y-4 text-sm font-semibold">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1"><Tv className="w-3.5 h-3.5 text-netflix-red" /> Memories (Video)</p>
                          <p className="text-white text-lg font-bold font-mono">
                            {storageData ? formatBytes(storageData.breakdown.videosBytes) : "0 MB"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1"><Cloud className="w-3.5 h-3.5 text-sky-400" /> Cover Poster & Frames</p>
                          <p className="text-white text-lg font-bold font-mono">
                            {storageData ? formatBytes(storageData.breakdown.imagesBytes) : "0 MB"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upgradable Plan Call to Action Banner */}
                    {storageData && storageData.planName !== "elite" && (
                      <div className="bg-gradient-to-r from-zinc-900/60 via-zinc-950/65 to-zinc-900/60 p-5 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-inner">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-white">Need more space in your watch vault?</h4>
                            <p className="text-xs text-white/50 leading-relaxed font-semibold">Upgrade your account storage up to 7 GB for high-definition home video archives.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push("/?showpricing=true#pricing")}
                          className="w-full sm:w-auto px-5 py-2.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow cursor-pointer active:scale-95 whitespace-nowrap"
                        >
                          View Pricing Plans
                        </button>
                      </div>
                    )}

                    {/* File Reclamation Manager */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-netflix-red" />
                          Reclaim Storage Space
                        </h3>
                        <button
                          onClick={fetchStorageData}
                          disabled={storageLoading}
                          className="text-xs text-netflix-red hover:text-white transition-all font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                        >
                          {storageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Refresh Data
                        </button>
                      </div>

                      <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                        {storageData && storageData.files && storageData.files.length > 0 ? (
                          storageData.files.map((file: any) => (
                            <div
                              key={file.key}
                              className="flex items-center justify-between bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 p-4 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-3.5 overflow-hidden pr-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded bg-zinc-950 flex items-center justify-center border border-white/5 shadow-inner">
                                  {file.mediaType === "video" ? (
                                    <Tv className="w-5 h-5 text-netflix-red" />
                                  ) : (
                                    <Cloud className="w-5 h-5 text-sky-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-sm truncate">{file.displayName}</h4>
                                  <p className="text-[11px] text-white/40 font-medium truncate mt-0.5">{file.context}</p>
                                  {file.isOrphaned && (
                                    <span className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">
                                      Unmatched Asset (Orphaned)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4.5 flex-shrink-0">
                                <span className="text-xs font-mono font-bold text-white/70 bg-zinc-900/80 border border-white/5 px-2.5 py-1 rounded">
                                  {formatBytes(file.sizeBytes)}
                                </span>
                                <button
                                  onClick={() => handleDeleteFile(file)}
                                  disabled={deletingFileKey === file.key}
                                  className="w-8 h-8 rounded bg-red-600/10 border border-red-600/20 hover:bg-red-600 hover:text-white text-red-500 flex items-center justify-center transition-all cursor-pointer shadow active:scale-95 disabled:opacity-40"
                                  title="Delete memory permanently"
                                >
                                  {deletingFileKey === file.key ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/10 rounded-xl space-y-4">
                            <Cloud className="w-12 h-12 text-white/20 mx-auto" />
                            <h4 className="font-bold text-white/50 text-base">Your vault is completely empty!</h4>
                            <p className="text-xs text-white/35 max-w-sm mx-auto">
                              Uploaded movies, season trailers, and custom memory episodes will show up here to measure storage consumption.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Educational Info Card */}
                    <div className="bg-gradient-to-r from-red-950/15 via-black/20 to-black/10 border border-netflix-red/10 p-5 rounded-lg flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-netflix-red/10 flex items-center justify-center flex-shrink-0 border border-netflix-red/20 shadow-inner">
                        <Sparkles className="w-5 h-5 text-netflix-red" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          Premium Storage Tips
                        </h4>
                        <ul className="text-xs text-white/55 list-disc list-inside space-y-1 leading-relaxed">
                          <li>Export video files as <strong className="text-white font-semibold">1080p MP4</strong> format to conserve optimal memory storage.</li>
                          <li>Delete unused drafts and temporary cover frames to immediately release cloud storage space.</li>
                          <li>Deleted memories are purged permanently from both AWS Cloud servers and databases instantly.</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* General Settings footer logout */}
            <div className="border-t border-white/5 pt-8 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-white/40 text-xs font-medium text-center sm:text-left">
                Security clearance code: <span className="text-white/60 font-mono tracking-wider">MF-8809-VAULT</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-5 py-2.5 rounded border border-red-500/25 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Logout from account</span>
              </button>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
