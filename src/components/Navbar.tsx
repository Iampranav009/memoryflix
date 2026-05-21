"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { logout } from "@/lib/supabase";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, Users, Film, Bookmark, Settings, Database } from "lucide-react";
import axios from "axios";
import { DbProfile } from "@/types";

export default function Navbar() {
  const { dbUser, activeProfile, setActiveProfile } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [otherProfiles, setOtherProfiles] = useState<DbProfile[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll detection for dark navbar transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch other profiles for the fast switcher dropdown
  useEffect(() => {
    const fetchSwitcherProfiles = async () => {
      if (!dbUser || !activeProfile) return;
      try {
        const res = await axios.get(`/api/profiles?userId=${dbUser.id}`);
        setOtherProfiles(res.data.filter((p: DbProfile) => p.id !== activeProfile.id));
      } catch (err) {
        console.error("Error loading switcher profiles:", err);
      }
    };
    
    if (dropdownOpen) {
      fetchSwitcherProfiles();
    }
  }, [dropdownOpen, dbUser, activeProfile]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync search input with URL query params
  useEffect(() => {
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`);
    } else if (pathname === "/browse" && searchParams.get("q")) {
      router.push("/browse");
    }
  }, [searchQuery]);

  const handleSearchClick = () => {
    setSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setSearchOpen(false);
    }
  };

  const handleSwitchProfile = (profile: DbProfile) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("memoryflix_intro_played");
    }
    setActiveProfile(profile);
    setDropdownOpen(false);
    // Reload active page to scope content
    router.push("/browse");
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (!activeProfile) return null;

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-500 flex items-center justify-between px-4 sm:px-6 md:px-16 py-3 sm:py-4 select-none ${
        isScrolled 
          ? "bg-[#141414]/95 backdrop-blur-md shadow-lg border-b border-white/5 py-2 sm:py-3" 
          : "bg-gradient-to-b from-black/90 via-black/40 to-transparent py-4 sm:py-5"
      }`}
    >
      {/* Left Navigation Details */}
      <div className="flex items-center gap-8 md:gap-12">
        <img 
          src="/long_logo.png" 
          alt="MemoryFlix Logo"
          onClick={() => router.push("/browse")}
          className="h-8 sm:h-10 md:h-12 lg:h-14 cursor-pointer transition-transform active:scale-95 object-contain"
        />
        
        <ul className="hidden md:flex items-center gap-7 text-sm font-semibold tracking-wide text-white/60">
          <li 
            onClick={() => router.push("/browse")}
            className={`hover:text-white transition-all cursor-pointer ${
              pathname === "/browse" && !searchParams.get("myList") ? "text-white font-extrabold border-b-2 border-netflix-red pb-1" : ""
            }`}
          >
            Home
          </li>
          <li 
            onClick={() => router.push("/memories")}
            className={`hover:text-white transition-all cursor-pointer ${
              pathname === "/memories" ? "text-white font-extrabold border-b-2 border-netflix-red pb-1" : ""
            }`}
          >
            Memories
          </li>
          <li 
            onClick={() => router.push("/browse?myList=true")}
            className={`hover:text-white transition-all cursor-pointer ${
              searchParams.get("myList") === "true" ? "text-white font-extrabold border-b-2 border-netflix-red pb-1" : ""
            }`}
          >
            My List
          </li>
        </ul>
      </div>

      {/* Right Navigation Details */}
      <div className="flex items-center gap-5 md:gap-7 text-white font-medium">
        
        {/* Search Box */}
        <div className={`flex items-center bg-black/50 border transition-all duration-300 rounded-md overflow-hidden px-2 sm:px-3 py-1 sm:py-1.5 ${
          searchOpen || searchQuery ? "w-36 sm:w-44 md:w-64 border-white/45 shadow-[0_0_10px_rgba(255,255,255,0.05)]" : "w-10 sm:w-11 border-transparent"
        }`}>
          <button 
            onClick={handleSearchClick}
            className="text-white hover:text-white/80 p-0.5 focus:outline-none cursor-pointer transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search memories, titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={handleSearchBlur}
            className={`bg-transparent border-none text-white text-xs outline-none px-2.5 w-full transition-opacity duration-300 placeholder:text-white/35 font-medium ${
              searchOpen || searchQuery ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        </div>

        {/* Muted Notification Bell */}
        <button className="text-white hover:text-netflix-red hover:scale-105 transition-all p-1 cursor-pointer">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile Dropdown Box */}
        <div ref={dropdownRef} className="relative">
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img 
              src={activeProfile.avatarUrl || undefined} 
              alt={activeProfile.name} 
              className="w-8.5 h-8.5 rounded-md object-cover border border-white/15 transition-all group-hover:border-white shadow"
            />
            <ChevronDown className={`w-4 h-4 text-white/70 transition-all duration-300 group-hover:text-white ${
              dropdownOpen ? "rotate-180 text-netflix-red" : ""
            }`} />
          </div>

          {/* Expanded Dropdown Content */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3.5 w-56 bg-black/95 border border-white/10 backdrop-blur-md rounded-lg shadow-2xl overflow-hidden z-50 text-xs py-2 animate-zoom-in font-sans">
              
              {/* Header profile info */}
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-3 bg-[#141414]/90 mb-1.5">
                <img 
                  src={activeProfile.avatarUrl || undefined} 
                  alt={activeProfile.name} 
                  className="w-7 h-7 rounded object-cover border border-white/10"
                />
                <span className="font-bold text-white max-w-[100px] sm:max-w-[125px] truncate text-sm">{activeProfile.name}</span>
              </div>

              {/* Fast switcher list */}
              {otherProfiles.length > 0 && (
                <div className="py-1 border-b border-white/5 mb-1.5">
                  {otherProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchProfile(p)}
                      className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors"
                    >
                      <img src={p.avatarUrl || undefined} alt={p.name} className="w-6 h-6 rounded object-cover border border-white/5" />
                      <span className="truncate max-w-[120px] font-semibold">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("memoryflix_intro_played");
                    }
                    router.push("/profiles");
                  }}
                  className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <Users className="w-4 h-4 text-white/60" />
                  <span className="font-semibold">Switch Profile</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-white/60" />
                  <span className="font-semibold">Settings</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/settings?tab=storage");
                  }}
                  className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <Database className="w-4 h-4 text-white/60" />
                  <span className="font-semibold">Storage Vault</span>
                </button>
                
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/memories");
                  }}
                  className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors md:hidden"
                >
                  <Film className="w-4 h-4 text-white/60" />
                  <span className="font-semibold">Memories</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/browse?myList=true");
                  }}
                  className="w-full px-4 py-2 hover:bg-white/10 text-left text-white/80 hover:text-white flex items-center gap-3 cursor-pointer transition-colors md:hidden"
                >
                  <Bookmark className="w-4 h-4 text-white/60" />
                  <span className="font-semibold">My List</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 hover:bg-red-500/10 text-left text-red-500 hover:text-red-400 flex items-center gap-3 cursor-pointer border-t border-white/5 mt-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500/80" />
                  <span className="font-bold">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
