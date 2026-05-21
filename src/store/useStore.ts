import { create } from "zustand";
import { DbUser, DbProfile, DbSeason, DbEpisode } from "../types";
import { setCookie, deleteCookie } from "@/lib/cookies";

interface AppState {
  dbUser: DbUser | null;
  activeProfile: DbProfile | null;
  activeInfoSeason: DbSeason | null;
  activePlaybackEpisode: DbEpisode | null;
  activePlaybackPlaylist: DbEpisode[] | null;
  isLoading: boolean;
  showCookieConsentModal: boolean;
  setDbUser: (user: DbUser | null) => void;
  setActiveProfile: (profile: DbProfile | null) => void;
  setActiveInfoSeason: (season: DbSeason | null) => void;
  setActivePlayback: (episode: DbEpisode | null, playlist?: DbEpisode[] | null) => void;
  setIsLoading: (loading: boolean) => void;
  setShowCookieConsentModal: (show: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  dbUser: null,
  activeProfile: null,
  activeInfoSeason: null,
  activePlaybackEpisode: null,
  activePlaybackPlaylist: null,
  isLoading: true,
  showCookieConsentModal: false,
  setDbUser: (dbUser) => set({ dbUser }),
  setActiveProfile: (activeProfile) => {
    if (typeof window !== "undefined") {
      if (activeProfile) {
        localStorage.setItem("memoryflix_active_profile_id", activeProfile.id);
        setCookie("memoryflix_active_profile_id", activeProfile.id, 365);
      } else {
        localStorage.removeItem("memoryflix_active_profile_id");
        deleteCookie("memoryflix_active_profile_id");
      }
    }
    set({ activeProfile });
  },
  setActiveInfoSeason: (activeInfoSeason) => set({ activeInfoSeason }),
  setActivePlayback: (activePlaybackEpisode, activePlaybackPlaylist = null) => 
    set({ activePlaybackEpisode, activePlaybackPlaylist }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setShowCookieConsentModal: (showCookieConsentModal) => set({ showCookieConsentModal }),
}));
