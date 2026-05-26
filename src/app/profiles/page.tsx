"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DbProfile } from "@/types";
import { Plus, Pencil, Trash2, X, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { safeSessionStorage } from "@/lib/cookies";

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

export default function ProfilesPage() {
  const { dbUser, setActiveProfile } = useStore();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileAvatar, setNewProfileAvatar] = useState(PRESET_AVATARS[0]);
  const [editingProfile, setEditingProfile] = useState<DbProfile | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileAvatar, setEditProfileAvatar] = useState("");
  
  // Upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Premium Error states
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    troubleshooting?: string[];
  } | null>(null);

  const fetchProfiles = async () => {
    if (!dbUser) return;
    try {
      const res = await axios.get(`/api/profiles?userId=${dbUser.id}`);
      setProfiles(res.data);
    } catch (err: any) {
      console.error("Error loading profiles:", err);
      setErrorDetails({
        title: "Load Profiles Failed",
        message: err.message || "Failed to retrieve family watch profiles from Supabase.",
        troubleshooting: [
          "Check that your Supabase URL and Anon Key are correctly set in the environment variables.",
          "Ensure your internet connection is active."
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser) {
      fetchProfiles();
    }
  }, [dbUser]);

  const handleSelectProfile = (profile: DbProfile) => {
    if (isManaging) {
      // Open edit modal
      setEditingProfile(profile);
      setEditProfileName(profile.name);
      setEditProfileAvatar(profile.avatarUrl);
      setShowEditModal(true);
    } else {
      safeSessionStorage.removeItem("memoryflix_intro_played");
      setActiveProfile(profile);
      router.push("/browse");
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUser || !newProfileName.trim()) return;

    try {
      const res = await axios.post("/api/profiles", {
        userId: dbUser.id,
        name: newProfileName.trim(),
        avatarUrl: newProfileAvatar
      });
      setProfiles([...profiles, res.data]);
      setShowAddModal(false);
      setNewProfileName("");
      setNewProfileAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
    } catch (err: any) {
      console.error("Error creating profile:", err);
      setErrorDetails({
        title: "Create Profile Failed",
        message: err.message || "Failed to save the new profile to Supabase.",
        troubleshooting: [
          "Verify if this account already has 6 watch profiles (the maximum permitted limit).",
          "Ensure the Supabase 'profiles' table matches the schema, and that RLS policies allow insertions.",
          "Check that your profile name does not contain illegal characters."
        ]
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editProfileName.trim()) return;

    try {
      const res = await axios.put("/api/profiles", {
        id: editingProfile.id,
        name: editProfileName.trim(),
        avatarUrl: editProfileAvatar
      });
      setProfiles(profiles.map(p => p.id === editingProfile.id ? res.data : p));
      setShowEditModal(false);
      setEditingProfile(null);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setErrorDetails({
        title: "Update Profile Failed",
        message: err.message || "Failed to update profile changes in Supabase database.",
        troubleshooting: [
          "Check that the profiles table exists in Supabase and RLS policies permit updates.",
          "Ensure your internet connection is stable."
        ]
      });
    }
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean = false) => {
    if (!e.target.files || e.target.files.length === 0 || !dbUser) return;
    const file = e.target.files[0];
    
    // Client-side validation: File type check
    if (!file.type.startsWith("image/")) {
      setErrorDetails({
        title: "Invalid File Type",
        message: "The selected file is not a valid image.",
        troubleshooting: [
          "Please choose a valid image file (PNG, JPEG, WEBP, or GIF).",
          "Ensure the file is not corrupted or renamed with a false extension."
        ]
      });
      // Reset input
      e.target.value = '';
      return;
    }

    // Client-side validation: File size check (5 MB limit)
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE) {
      setErrorDetails({
        title: "Image File Too Large",
        message: `The selected image is ${(file.size / (1024 * 1024)).toFixed(2)} MB, which exceeds our 5 MB profile avatar limit.`,
        troubleshooting: [
          "Please compress the image before uploading to reduce its size.",
          "Select a smaller image file.",
          "Resize the image to a standard profile resolution (e.g., 512x512 pixels)."
        ]
      });
      // Reset input
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const presignResponse = await axios.post("/api/s3/presign", {
        userId: dbUser.id,
        profileId: "avatar",
        seasonId: "custom",
        filename: `avatar_${Date.now()}_${file.name}`,
        contentType: file.type,
        fileSize: file.size
      });

      const { uploadUrl, mediaUrl } = presignResponse.data;

      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type
        }
      });
      
      if (isEditMode) {
        setEditProfileAvatar(mediaUrl);
      } else {
        setNewProfileAvatar(mediaUrl);
      }
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      setErrorDetails({
        title: "Avatar Upload Failed",
        message: err.message || "Failed to upload custom avatar to S3 storage.",
        troubleshooting: [
          "Ensure your image file is not too large.",
          "Check your internet connection."
        ]
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteProfile = async () => {
    if (!editingProfile) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete profile "${editingProfile.name}"? This will delete all their saved memories.`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/profiles?id=${editingProfile.id}`);
      setProfiles(profiles.filter(p => p.id !== editingProfile.id));
      setShowEditModal(false);
      setEditingProfile(null);
    } catch (err: any) {
      console.error("Error deleting profile:", err);
      setErrorDetails({
        title: "Delete Profile Failed",
        message: err.message || "Failed to remove this profile from Supabase.",
        troubleshooting: [
          "Check that the profiles table allows DELETE operations.",
          "Ensure your session did not expire."
        ]
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center font-sans px-6 py-16">
      
      {/* Title */}
      <h1 className="text-4xl md:text-6xl font-bold tracking-wide mb-14 select-none text-center animate-fade-in text-white/95 netflix-text-shadow">
        {isManaging ? "Manage Profiles:" : "Who's watching?"}
      </h1>

      {/* Profiles Grid */}
      <div className="flex flex-wrap justify-center gap-8 md:gap-12 max-w-4xl w-full mb-20">
        {profiles.map((profile) => (
          <div 
            key={profile.id}
            onClick={() => handleSelectProfile(profile)}
            className="group flex flex-col items-center cursor-pointer relative"
          >
            {/* Avatar Box */}
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden border-[3px] border-transparent group-hover:border-white group-hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center">
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name} 
                  className="w-full h-full object-cover rounded bg-[#2a2a2a] group-hover:brightness-105"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-netflix-red animate-spin" />
                </div>
              )}
              
              {/* Manage Overlay */}
              {isManaging && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300">
                  <div className="p-2.5 rounded-full border border-white/60 bg-black/60 shadow-lg group-hover:border-white group-hover:scale-110 transition-all">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Profile Name */}
            <span className="mt-4 text-netflix-gray group-hover:text-white text-base md:text-lg tracking-wide transition-colors duration-300 max-w-[120px] truncate text-center font-semibold">
              {profile.name}
            </span>
          </div>
        ))}

        {/* Add Profile Card */}
        {profiles.length < 6 && (
          <div 
            onClick={() => setShowAddModal(true)}
            className="group flex flex-col items-center cursor-pointer"
          >
            {/* Plus Box */}
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg border-[3px] border-transparent flex items-center justify-center bg-[#1F1F1F]/60 border border-white/5 hover:bg-white/10 group-hover:border-white group-hover:scale-105 transition-all duration-300 shadow-md">
              <Plus className="w-12 h-12 text-netflix-gray group-hover:text-white transition-colors" />
            </div>
            {/* Label */}
            <span className="mt-4 text-netflix-gray group-hover:text-white text-base md:text-lg tracking-wide transition-colors duration-300 font-semibold">
              Add Profile
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => setIsManaging(!isManaging)}
        className="px-8 py-3 border-2 border-netflix-gray text-netflix-gray hover:border-white hover:text-white hover:bg-white/5 transition-all duration-300 tracking-[0.2em] text-xs font-bold uppercase rounded cursor-pointer active:scale-95 shadow"
      >
        {isManaging ? "Done" : "Manage Profiles"}
      </button>

      {/* ADD PROFILE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-[550px] bg-[#000000] border border-white/10 rounded-xl px-6 py-8 md:p-10 relative shadow-2xl animate-fade-in">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-wide">Add Profile</h2>
            <p className="text-white/50 text-xs md:text-sm mb-8 font-medium">Add a dedicated profile for family members sharing your memories.</p>

            <form onSubmit={handleCreateProfile} className="space-y-6">
              {/* Profile Details Inputs */}
              <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-white/5 pb-6">
                <div className="relative group flex items-center justify-center w-24 h-24">
                  {newProfileAvatar ? (
                    <img 
                      src={newProfileAvatar} 
                      alt="Selected avatar" 
                      className={`w-24 h-24 rounded-lg object-cover bg-[#222] border border-white/15 shadow-xl ${isUploadingAvatar ? 'opacity-50' : ''}`}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-zinc-800 border border-white/15 shadow-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-netflix-red animate-spin" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-grow w-full space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70 block">Who is watching this profile?</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="Profile Name (e.g. Dad, Priya)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full py-3 px-4 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white text-base md:text-lg focus:outline-none transition-all duration-300 placeholder:text-white/35 font-medium"
                  />
                </div>
              </div>

              {/* Avatar Picker Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">Choose Avatar Preset:</label>
                  <label className={`text-xs font-bold uppercase tracking-wider text-netflix-red hover:text-netflix-red-hover cursor-pointer transition-colors ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                    Upload Custom Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleCustomAvatarUpload(e, false)}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3.5 p-3.5 bg-black/40 rounded-lg border border-white/5 max-h-[180px] overflow-y-auto">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setNewProfileAvatar(avatar)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square bg-[#222]/85 shadow ${
                        newProfileAvatar === avatar ? "border-netflix-red scale-105" : "border-transparent hover:scale-105 hover:border-white/40"
                      }`}
                    >
                      <img src={avatar} className="w-full h-full object-cover" alt={`Preset ${idx}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 border border-white/20 text-white/70 hover:border-white hover:text-white rounded-md transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-bold rounded-md transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-[550px] bg-[#000000] border border-white/10 rounded-xl px-6 py-8 md:p-10 relative shadow-2xl animate-fade-in">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingProfile(null);
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-wide">Edit Profile</h2>
            <p className="text-white/50 text-xs md:text-sm mb-8 font-medium">Modify details or choose a new avatar preset.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Details Inputs */}
              <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-white/5 pb-6">
                <div className="relative group flex items-center justify-center w-24 h-24">
                  {editProfileAvatar ? (
                    <img 
                      src={editProfileAvatar} 
                      alt="Selected avatar" 
                      className={`w-24 h-24 rounded-lg object-cover bg-[#222] border border-white/15 shadow-xl ${isUploadingAvatar ? 'opacity-50' : ''}`}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-zinc-800 border border-white/15 shadow-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-netflix-red animate-spin" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex-grow w-full space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70 block">Who is watching this profile?</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="Profile Name"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full py-3 px-4 bg-[#666666]/20 border border-transparent focus:border-white focus:bg-[#666666]/35 rounded-md text-white text-base md:text-lg focus:outline-none transition-all duration-300 placeholder:text-white/35 font-medium"
                  />
                </div>
              </div>

              {/* Avatar Picker Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">Choose Avatar Preset:</label>
                  <label className={`text-xs font-bold uppercase tracking-wider text-netflix-red hover:text-netflix-red-hover cursor-pointer transition-colors ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                    Upload Custom Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleCustomAvatarUpload(e, true)}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3.5 p-3.5 bg-black/40 rounded-lg border border-white/5 max-h-[180px] overflow-y-auto">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setEditProfileAvatar(avatar)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square bg-[#222]/85 shadow ${
                        editProfileAvatar === avatar ? "border-netflix-red scale-105" : "border-transparent hover:scale-105 hover:border-white/40"
                      }`}
                    >
                      <img src={avatar} className="w-full h-full object-cover" alt={`Preset ${idx}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  className="px-4 py-2.5 border border-red-600/30 hover:border-red-600 hover:bg-red-600/10 text-red-500 rounded-md transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Profile
                </button>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProfile(null);
                    }}
                    className="px-5 py-2 border border-white/20 text-white/70 hover:border-white hover:text-white rounded-md transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-white text-black font-bold rounded-md hover:bg-white/95 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM INTERACTIVE ERROR OVERLAY */}
      {errorDetails && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-[550px] bg-[#181818] border border-red-600/30 rounded-lg p-6 md:p-8 relative shadow-2xl animate-zoom-in">

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
                    <HelpCircle className="w-4 h-4 text-netflix-red" />
                    Troubleshooting & Recommended Fixes:
                  </span>
                  <ul className="text-xs text-white/60 space-y-2 bg-[#222]/50 border border-white/5 p-4 rounded leading-relaxed list-disc pl-5">
                    {errorDetails.troubleshooting.map((item, idx) => (
                      <li key={idx} className="marker:text-netflix-red">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Close buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setErrorDetails(null)}
                  className="px-5 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-bold rounded text-xs uppercase tracking-widest cursor-pointer shadow active:scale-95 transition-all w-full sm:w-auto text-center"
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
