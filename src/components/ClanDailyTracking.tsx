import React, { useState, useEffect, useMemo, useCallback, type JSX } from 'react';
import { Download, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Calendar, History } from 'lucide-react';
import api from '../services/api';
import type { ClanStatsData, Player, SortConfig, ViewMode } from '../types';

interface Props {
  clanTag?: string;
}

const ClanDailyTracking: React.FC<Props> = ({ clanTag = 'PPLCV9G2' }) => {
  const [data, setData] = useState<ClanStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });
  const [viewMode, setViewMode] = useState<ViewMode>({ type: 'all' });
  const [selectedSeason, setSelectedSeason] = useState<string>('');

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const result = await api.fetchClanStats(clanTag);
      setData(result);
      
      // Set default selected season to the latest one
      if (result.seasons) {
        const seasons = Object.keys(result.seasons).sort().reverse();
        if (seasons.length > 0) {
          setSelectedSeason(seasons[0]);
        }
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [clanTag]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async (downloadMode: 'all' | 'season' = 'all', season?: string): Promise<void> => {
    try {
      setDownloading(true);
      await api.downloadExcel(clanTag, downloadMode === 'season' ? season : undefined);
    } catch (err) {
      alert('Failed to download Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };
console.log(data)
  const handleSort = (key: SortConfig['key']): void => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get visible week labels based on view mode
  const visibleWeekLabels = useMemo((): string[] => {
    if (!data) return [];
    
    if (viewMode.type === 'all') {
      return data.allWeekLabels;
    } else if (viewMode.type === 'season' && viewMode.season && data.seasons[viewMode.season]) {
      return data.seasons[viewMode.season];
    }
    return [];
  }, [data, viewMode]);

  const sortedPlayers = useMemo((): Player[] => {
    if (!data?.players) return [];
    
    const sorted = [...data.players];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        // Handle different key types
        if (sortConfig.key === 'rank') {
          return sortConfig.direction === 'asc' 
            ? a.rank - b.rank 
            : b.rank - a.rank;
        }
        
        if (sortConfig.key === 'name') {
          const aName = a.name?.toLowerCase() || '';
          const bName = b.name?.toLowerCase() || '';
          if (aName < bName) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aName > bName) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        // Handle averages (which can be null)
        const aVal = a[sortConfig.key] ?? -Infinity;
        const bVal = b[sortConfig.key] ?? -Infinity;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [data, sortConfig]);

  const getSortIcon = (key: SortConfig['key']): JSX.Element => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline" />
      : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getScoreColorClass = (avg: number | null): string => {
    if (!avg) return '';
    if (avg >= 220) return 'bg-green-100 font-semibold';
    if (avg >= 210) return 'bg-blue-100';
    if (avg >= 200) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading clan statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const seasons = Object.keys(data.seasons || {}).sort().reverse();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Clan Tracking: {data.clanTag}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Last Updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data.players.length} players • {data.allWeekLabels.length} total weeks
              </p>
            </div>
            
            {/* View Mode Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode({ type: 'all' })}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  viewMode.type === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                All Weeks
              </button>
              <button
                onClick={() => {
                  if (selectedSeason) {
                    setViewMode({ type: 'season', season: selectedSeason });
                  }
                }}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  viewMode.type === 'season' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <History className="w-4 h-4" />
                By Season
              </button>
            </div>
          </div>

          {/* Season Selector (shown only in season mode) */}
          {viewMode.type === 'season' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 py-2">Select Season:</span>
              {seasons.map(season => (
                <button
                  key={season}
                  onClick={() => {
                    setSelectedSeason(season);
                    setViewMode({ type: 'season', season });
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedSeason === season
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Season {season}
                </button>
              ))}
            </div>
          )}

          {/* Download Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleDownload('all')}
              disabled={downloading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Download All Data
            </button>
            {viewMode.type === 'season' && viewMode.season && (
              <button
                onClick={() => handleDownload('season', viewMode.season)}
                disabled={downloading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download Season {viewMode.season}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th 
                    onClick={() => handleSort('rank')} 
                    className="bg-gray-100 text-gray-700 font-semibold py-3 px-4 text-left border-b-2 border-gray-200 cursor-pointer hover:bg-gray-200"
                  >
                    # {getSortIcon('rank')}
                  </th>
                  <th 
                    onClick={() => handleSort('name')} 
                    className="bg-gray-100 text-gray-700 font-semibold py-3 px-4 text-left border-b-2 border-gray-200 cursor-pointer hover:bg-gray-200"
                  >
                    Player {getSortIcon('name')}
                  </th>
                  <th 
                    onClick={() => handleSort('avg8Weeks')} 
                    className="bg-gray-100 text-gray-700 font-semibold py-3 px-4 text-left border-b-2 border-gray-200 cursor-pointer hover:bg-gray-200"
                  >
                    8 Weeks {getSortIcon('avg8Weeks')}
                  </th>
                  <th 
                    onClick={() => handleSort('avg4Weeks')} 
                    className="bg-gray-100 text-gray-700 font-semibold py-3 px-4 text-left border-b-2 border-gray-200 cursor-pointer hover:bg-gray-200"
                  >
                    4 Weeks {getSortIcon('avg4Weeks')}
                  </th>
                  {visibleWeekLabels.map(week => (
                    <th key={week} className="bg-gray-100 text-gray-700 font-semibold py-3 px-4 text-center border-b-2 border-gray-200">
                      {week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedPlayers.map((player) => (
                  <tr key={player.playerId || player.name} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-500">
                      {player.rank}
                    </td>
                    <td className="py-3 px-4">
                      {player.playerId ? (
                        <a
                          href={`https://cwstats.com/player/${player.playerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {player.name}
                        </a>
                    
                      ) : (
                        <span className="font-medium">{player.name}</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-center font-medium ${getScoreColorClass(player.avg8Weeks)}`}>
                      {player.avg8Weeks?.toFixed(1) || '-'}
                    </td>
                    <td className={`py-3 px-4 text-center font-medium ${getScoreColorClass(player.avg4Weeks)}`}>
                      {player.avg4Weeks?.toFixed(1) || '-'}
                    </td>
                    {visibleWeekLabels.map(week => {
                      const score = player.weeklyScores?.[week];
                      return (
                        <td key={week} className="py-3 px-4 text-center">
                          {score ? (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900">
                                {score.score}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({score.duels})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {visibleWeekLabels.length} weeks • {sortedPlayers.length} players • Click column headers to sort
            </p>
          </div>
        </div>

        {/* Season Summary */}
        {viewMode.type === 'season' && viewMode.season && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Season {viewMode.season} Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total Weeks</p>
                <p className="text-2xl font-bold text-blue-800">{visibleWeekLabels.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Active Players</p>
                <p className="text-2xl font-bold text-green-800">
                  {sortedPlayers.filter(p => 
                    visibleWeekLabels.some(week => p.weeklyScores?.[week])
                  ).length}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Avg Participation</p>
                <p className="text-2xl font-bold text-purple-800">
                  {Math.round(sortedPlayers.filter(p => 
                    visibleWeekLabels.some(week => p.weeklyScores?.[week])
                  ).length / sortedPlayers.length * 100)}%
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Highest Score</p>
                <p className="text-2xl font-bold text-orange-800">
                  {Math.max(...sortedPlayers.flatMap(p => 
                    visibleWeekLabels.map(week => p.weeklyScores?.[week]?.score || 0)
                  ))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClanDailyTracking;