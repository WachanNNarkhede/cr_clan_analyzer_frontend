import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { AvailablePlayersResponse, ClanStatsData, GroupResponse, PlayerGroup } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchClanStats(clanTag: string): Promise<ClanStatsData> {
    try {
      const response = await this.api.get<ClanStatsData>(`/clan/${clanTag}/daily-tracking`);
      console.log('📊 Fetched data:', {
        weeks: response.data.allWeekLabels,
        seasons: Object.keys(response.data.seasons),
        players: response.data.players.length
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw new Error('Failed to fetch clan statistics');
    }
  }

  async downloadExcel(clanTag: string, season?: string): Promise<boolean> {
    try {
      let url = `/clan/${clanTag}/export/excel`;
      if (season) {
        url += `?season=${season}`;
      }
      
      console.log('📥 Downloading Excel from:', url);
      
      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      // Check if response is Excel file
      if (!response.data.type.includes('spreadsheetml') && !response.data.type.includes('octet-stream')) {
        const text = await response.data.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || 'Failed to download Excel');
        } catch {
          throw new Error('Received invalid response format');
        }
      }
      
      const filename = season 
        ? `${clanTag}_season_${season}_stats.xlsx`
        : `${clanTag}_all_stats.xlsx`;
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('✅ Excel download initiated:', filename);
      return true;
    } catch (error) {
      console.error('❌ Excel download error:', error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error instanceof Error ? error : new Error('Failed to download Excel file');
    }
  }



  async savePlayerGroups(clanTag: string, groups: PlayerGroup[]): Promise<boolean> {
  try {
    await this.api.post(`/clan/${clanTag}/groups`, { groups });
    return true;
  } catch (error) {
    console.error('Failed to save groups:', error);
    return false;
  }
}

async loadPlayerGroups(clanTag: string): Promise<PlayerGroup[]> {
  try {
    const response = await this.api.get(`/clan/${clanTag}/groups`);
    return response.data.groups || [];
  } catch (error) {
    console.error('Failed to load groups:', error);
    return [];
  }
}
// Group Management APIs
async fetchGroups(clanTag: string): Promise<GroupResponse> {
  try {
    const response = await this.api.get(`/groups/${clanTag}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching groups:', error);
    throw error;
  }
}

async createGroup(clanTag: string, groupData: {
  groupName: string;
  description?: string;
  accountIds: string[];
}): Promise<{ success: boolean; group: PlayerGroup }> {
  try {
    const response = await this.api.post(`/groups/${clanTag}`, groupData);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating group:', error);
    throw error;
  }
}

async updateGroup(
  clanTag: string, 
  groupId: string, 
  updates: Partial<PlayerGroup>
): Promise<{ success: boolean; group: PlayerGroup }> {
  try {
    const response = await this.api.put(`/groups/${clanTag}/${groupId}`, updates);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating group:', error);
    throw error;
  }
}

async deleteGroup(clanTag: string, groupId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await this.api.delete(`/groups/${clanTag}/${groupId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting group:', error);
    throw error;
  }
}

async recalculateGroups(clanTag: string): Promise<{ 
  success: boolean; 
  message: string; 
  groups: PlayerGroup[];
  weekLabels: string[];
}> {
  try {
    const response = await this.api.post(`/groups/${clanTag}/recalculate`);
    return response.data;
  } catch (error) {
    console.error('❌ Error recalculating groups:', error);
    throw error;
  }
}

async fetchAvailablePlayers(clanTag: string): Promise<AvailablePlayersResponse> {
  try {
    const response = await this.api.get(`/groups/${clanTag}/available-players`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching available players:', error);
    throw error;
  }
}
}

export default new ApiService();