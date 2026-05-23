import { create } from "zustand";
import { DbUser, DbProfile, DbSeason, DbEpisode } from "../types";
import { setCookie, deleteCookie, safeLocalStorage } from "@/lib/cookies";

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
        safeLocalStorage.setItem("memoryflix_active_profile_id", activeProfile.id);
        setCookie("memoryflix_active_profile_id", activeProfile.id, 365);
      } else {
        safeLocalStorage.removeItem("memoryflix_active_profile_id");
        deleteCookie("memoryflix_active_profile_id");
      }
    }
    set({ activeProfile });
  },
  setActiveInfoSeason: (activeInfoSeason) => set({ activeInfoSeason }),
  setActivePlayback: (activePlaybackEpisode, activePlaybackPlaylist = null) => {
    if (activePlaybackEpisode && typeof window !== "undefined") {
      const activeProfile = useStore.getState().activeProfile;
      const profileId = activeProfile ? activeProfile.id : "default";
      const episodeId = activePlaybackEpisode.id;
      const seasonId = activePlaybackEpisode.seasonId;
      
      // Increment episode watch count
      const epKey = `memoryflix_watch_count_${profileId}_ep_${episodeId}`;
      const epCount = parseInt(safeLocalStorage.getItem(epKey) || "0", 10) + 1;
      safeLocalStorage.setItem(epKey, epCount.toString());

      // Increment season watch count
      if (seasonId) {
        const seasonKey = `memoryflix_watch_count_${profileId}_season_${seasonId}`;
        const seasonCount = parseInt(safeLocalStorage.getItem(seasonKey) || "0", 10) + 1;
        safeLocalStorage.setItem(seasonKey, seasonCount.toString());
      }
      
      // Notify active components to re-query watch counts
      window.dispatchEvent(new Event("memoryflix_watch_incremented"));
    }
    set({ activePlaybackEpisode, activePlaybackPlaylist });
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setShowCookieConsentModal: (showCookieConsentModal) => set({ showCookieConsentModal }),
}));
