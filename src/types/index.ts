// Core Types
export interface WeeklyScore {
  score: number;
  duels: number;
}

export interface Player {
  rank: number;
  name: string;
  playerId: string;
  avg8Weeks: number | null;
  avg4Weeks: number | null;
  weeklyScores: Record<string, WeeklyScore>;
}

export interface ClanStatsData {
  clanTag: string;
  allWeekLabels: string[];
  seasons: Record<string, string[]>;
  players: Player[];
  lastUpdated: string;
}

export interface SortConfig {
  key: 'rank' | 'name' | 'avg8Weeks' | 'avg4Weeks';
  direction: 'asc' | 'desc';
}

export interface ViewMode {
  type: 'all' | 'season';
  season?: string;
}

// Group Related Types
export interface GroupedAccount {
  playerId: string;
  name: string;
  avg8Weeks: number | null;
  avg4Weeks: number | null;
  weeklyScores: Record<string, WeeklyScore>;
}

export interface CombinedWeekData {
  scores: number[];
  duels: number[];
  total: number;
  average: number;
}

export interface PlayerGroup {
  _id?: string;
  groupId: string;
  groupName: string;
  description?: string;
  accounts: GroupedAccount[];
  combinedWeeklyScores: Record<string, CombinedWeekData>;
  avg8Weeks: number | null;
  avg4Weeks: number | null;
  totalPlayers: number;
  activeWeeks: number;
  createdAt: string;
  updatedAt: string;
}

// ✅ API Response Types - Add these missing exports
export interface GroupResponse {
  success: boolean;
  groups: PlayerGroup[];
  weekLabels: string[];
  statsLastUpdated: string | null;
  totalGroups: number;
}

export interface AvailablePlayersResponse {
  success: boolean;
  players: Player[];
  weekLabels: string[];
  totalAvailable: number;
}

export interface CreateGroupResponse {
  success: boolean;
  message: string;
  group: PlayerGroup;
}

export interface UpdateGroupResponse {
  success: boolean;
  message: string;
  group: PlayerGroup;
}

export interface DeleteGroupResponse {
  success: boolean;
  message: string;
}

export interface RecalculateGroupsResponse {
  success: boolean;
  message: string;
  groups: PlayerGroup[];
  weekLabels: string[];
}