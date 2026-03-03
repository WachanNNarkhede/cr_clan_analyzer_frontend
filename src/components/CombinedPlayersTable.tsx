import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, User, Filter, Download, Loader2 } from 'lucide-react';
import type { Player, PlayerGroup } from '../types';


interface Props {
  players: Player[];
  groups: PlayerGroup[];
  weekLabels: string[];
  clanTag: string;
}

const CombinedPlayersTable: React.FC<Props> = ({ players, groups, weekLabels, clanTag }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [showUngrouped, setShowUngrouped] = useState<boolean>(true);
  const [showGroups, setShowGroups] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Get all grouped player IDs
  const groupedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach(group => {
      group.accounts.forEach(account => {
        ids.add(account.playerId);
      });
    });
    return ids;
  }, [groups]);

  // Filter ungrouped players
  const ungroupedPlayers = useMemo(() => {
    return players.filter(p => !groupedPlayerIds.has(p.playerId));
  }, [players, groupedPlayerIds]);

  // Filter weeks by season
  const visibleWeeks = useMemo(() => {
    if (selectedSeason === 'all') return weekLabels;
    return weekLabels.filter(week => week.startsWith(selectedSeason));
  }, [weekLabels, selectedSeason]);

  const seasons = useMemo(() => {
    return [...new Set(weekLabels.map(w => w.split('-')[0]))].sort().reverse();
  }, [weekLabels]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Create CSV content
      const headers = ['Type', 'Name/Group', 'Accounts', '8 Weeks', '4 Weeks', ...visibleWeeks];
      const rows: string[][] = [headers];
      
      // Add groups
      groups.forEach(group => {
        const row = [
          'GROUP',
          group.groupName,
          group.accounts.length.toString(),
          group.avg8Weeks?.toFixed(1) || '-',
          group.avg4Weeks?.toFixed(1) || '-',
          ...visibleWeeks.map(week => {
            const weekData = group.combinedWeeklyScores?.[week];
            if (!weekData || weekData.scores.length === 0) return '-';
            // Format: "3500,3250,3400" for multiple scores
            return weekData.scores.map((score, idx) => 
              `${score} (${weekData.duels[idx]})`
            ).join(', ');
          })
        ];
        rows.push(row);
      });
      
      // Add ungrouped players
      ungroupedPlayers.forEach(player => {
        const row = [
          'INDIVIDUAL',
          player.name,
          '1',
          player.avg8Weeks?.toFixed(1) || '-',
          player.avg4Weeks?.toFixed(1) || '-',
          ...visibleWeeks.map(week => {
            const score = player.weeklyScores?.[week];
            return score ? `${score.score} (${score.duels})` : '-';
          })
        ];
        rows.push(row);
      });
      
      // Convert to CSV
      const csvContent = rows.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${clanTag}_combined_stats.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      alert('Failed to download: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const getGroupWeekDisplay = (group: PlayerGroup, week: string) => {
    const weekData = group.combinedWeeklyScores?.[week];
    if (!weekData || weekData.scores.length === 0) return '-';
    
    // Show all scores separated by commas
    return weekData.scores.map((score, idx) => 
      `${score} (${weekData.duels[idx]})`
    ).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Complete Player Overview
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {groups.length} groups
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> {ungroupedPlayers.length} individual
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>

            {/* Season Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Seasons</option>
                {seasons.map(season => (
                  <option key={season} value={season}>Season {season}</option>
                ))}
              </select>
            </div>

            {/* Toggle switches */}
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={showGroups}
                  onChange={(e) => setShowGroups(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Groups
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={showUngrouped}
                  onChange={(e) => setShowUngrouped(e.target.checked)}
                  className="rounded text-blue-600"
                />
                Individuals
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Name/Group</th>
              <th className="px-4 py-3 text-left">Accounts</th>
              <th className="px-4 py-3 text-left">8 Weeks</th>
              <th className="px-4 py-3 text-left">4 Weeks</th>
              {visibleWeeks.map(week => (
                <th key={week} className="px-4 py-3 text-center min-w-[120px]">
                  {week}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Groups Section */}
            {showGroups && groups.map(group => (
              <React.Fragment key={group.groupId}>
                {/* Group Row */}
                <tr className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
                    onClick={() => toggleGroup(group.groupId)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {expandedGroups[group.groupId] ? (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">
                        GROUP
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div>
                      {group.groupName}
                      {group.description && (
                        <div className="text-xs text-gray-500">{group.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {group.accounts.length} accounts
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {group.avg8Weeks?.toFixed(1) || '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {group.avg4Weeks?.toFixed(1) || '-'}
                  </td>
                  {visibleWeeks.map(week => (
                    <td key={week} className="px-4 py-3 text-center text-xs">
                      {getGroupWeekDisplay(group, week)}
                    </td>
                  ))}
                </tr>

                {/* Expanded Account Details */}
                {expandedGroups[group.groupId] && (
                  <tr className="bg-gray-50">
                    <td colSpan={5 + visibleWeeks.length} className="px-4 py-3">
                      <div className="border-l-2 border-blue-200 pl-4 ml-6">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Linked Accounts:
                        </div>
                        {group.accounts.map(account => (
                          <div key={account.playerId} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="w-32 truncate font-medium">{account.name}</span>
                              <span className="text-gray-500">ID: {account.playerId.slice(0, 8)}...</span>
                              <span className="text-gray-600">8wk: {account.avg8Weeks?.toFixed(1) || '-'}</span>
                              <span className="text-gray-600">4wk: {account.avg4Weeks?.toFixed(1) || '-'}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 ml-4 text-xs">
                              {visibleWeeks.map(week => {
                                const score = account.weeklyScores?.[week];
                                return (
                                  <div key={week} className="min-w-[80px]">
                                    <span className="text-gray-500">{week}:</span>{' '}
                                    <span className="font-medium">
                                      {score ? `${score.score} (${score.duels})` : '-'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {/* Ungrouped Players Section */}
            {showUngrouped && ungroupedPlayers.map(player => (
              <tr key={player.playerId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                    INDIVIDUAL
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`https://cwstats.com/player/${player.playerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {player.name}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-500 text-xs">1 account</span>
                </td>
                <td className="px-4 py-3 font-medium">
                  {player.avg8Weeks?.toFixed(1) || '-'}
                </td>
                <td className="px-4 py-3 font-medium">
                  {player.avg4Weeks?.toFixed(1) || '-'}
                </td>
                {visibleWeeks.map(week => {
                  const score = player.weeklyScores?.[week];
                  return (
                    <td key={week} className="px-4 py-3 text-center">
                      {score ? (
                        <span className="font-medium">
                          {score.score} <span className="text-xs text-gray-500">({score.duels})</span>
                        </span>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Empty State */}
            {((showGroups && groups.length === 0) || (showUngrouped && ungroupedPlayers.length === 0)) && (
              <tr>
                <td colSpan={5 + visibleWeeks.length} className="px-4 py-8 text-center text-gray-500">
                  No data to display with current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing: {showGroups ? groups.length : 0} groups, {showUngrouped ? ungroupedPlayers.length : 0} individuals
          </div>
          <div>
            Total: {groups.length + ungroupedPlayers.length} entries • {visibleWeeks.length} weeks
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedPlayersTable;