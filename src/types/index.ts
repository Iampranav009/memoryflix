export interface DbUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  createdAt: string;
  planName: string;
  storageLimitMb: number;
  razorpaySubscriptionId?: string | null;
  razorpayPaymentId?: string | null;
}

export interface DbProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

export interface DbSeason {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  displayOrder: number;
  episodesCount?: number;
  episodes?: DbEpisode[];
  isShared?: boolean;
  shareUrl?: string;
  featured?: boolean;
}

export interface DbEpisode {
  id: string;
  seasonId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string;
  mediaType: 'video' | 'photo';
  episodeNumber: number;
  memoryDate: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface DbMyList {
  id: string;
  profileId: string;
  seasonId: string;
  addedAt: string;
  season?: DbSeason;
}
