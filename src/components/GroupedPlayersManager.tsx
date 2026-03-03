import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Edit2, Trash2, Save, X, RefreshCw,
  AlertCircle, Database, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import apiService from '../services/api';
import CombinedPlayersTable from './CombinedPlayersTable';
import type { PlayerGroup, Player, ClanStatsData } from '../types';

interface Props {
  clanTag?: string;
}

const GroupedPlayersManager: React.FC<Props> = ({ clanTag = 'PPLCV9G2' }) => {
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [clanStats, setClanStats] = useState<ClanStatsData | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [weekLabels, setWeekLabels] = useState<string[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // UI States
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Form States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [clanTag]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch main clan stats first to get all players
      const mainStats = await apiService.fetchClanStats(clanTag);
      setClanStats(mainStats);
      setAllPlayers(mainStats.players);
      setWeekLabels(mainStats.allWeekLabels);
      
      // Then fetch groups
      const groupsRes = await apiService.fetchGroups(clanTag);
      setGroups(groupsRes.groups);
      
      // Calculate available players (not in any group)
      const groupedPlayerIds = new Set<string>();
      groupsRes.groups.forEach(group => {
        group.accounts.forEach(account => {
          groupedPlayerIds.add(account.playerId);
        });
      });
      
      const available = mainStats.players.filter(
        p => !groupedPlayerIds.has(p.playerId)
      );
      setAvailablePlayers(available);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedAccounts.length === 0) {
      setError('Please enter a group name and select at least one account');
      return;
    }

    try {
      const result = await apiService.createGroup(clanTag, {
        groupName: newGroupName.trim(),
        description: newGroupDescription.trim(),
        accountIds: selectedAccounts
      });

      // Update groups list
      setGroups([result.group, ...groups]);
      
      // Update available players
      const newGroupedIds = new Set(selectedAccounts);
      const updatedAvailable = availablePlayers.filter(
        p => !newGroupedIds.has(p.playerId)
      );
      setAvailablePlayers(updatedAvailable);
      
      // Reset form
      setIsCreating(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedAccounts([]);
      showSuccess('Group created successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!editGroupName.trim()) return;

    try {
      const groupToUpdate = groups.find(g => g.groupId === groupId);
      if (!groupToUpdate) return;

      const result = await apiService.updateGroup(clanTag, groupId, {
        groupName: editGroupName.trim(),
        description: editGroupDescription.trim(),
        accounts: groupToUpdate.accounts
      });

      setGroups(groups.map(g => g.groupId === groupId ? result.group : g));
      setEditingGroup(null);
      showSuccess('Group updated successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await apiService.deleteGroup(clanTag, groupId);
      
      // Find the deleted group to get its accounts
      const deletedGroup = groups.find(g => g.groupId === groupId);
      
      // Update groups list
      const updatedGroups = groups.filter(g => g.groupId !== groupId);
      setGroups(updatedGroups);
      
      // Update available players
      if (deletedGroup) {
        const freedPlayerIds = new Set(deletedGroup.accounts.map(a => a.playerId));
        const freedPlayers = allPlayers.filter(p => freedPlayerIds.has(p.playerId));
        setAvailablePlayers([...availablePlayers, ...freedPlayers]);
      }
      
      showSuccess('Group deleted successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const handleRemoveAccountFromGroup = async (groupId: string, playerId: string) => {
    try {
      const group = groups.find(g => g.groupId === groupId);
      if (!group) return;

      const updatedAccounts = group.accounts.filter(a => a.playerId !== playerId);
      
      if (updatedAccounts.length === 0) {
        // If no accounts left, delete the group
        await handleDeleteGroup(groupId);
        return;
      }

      const result = await apiService.updateGroup(clanTag, groupId, {
        groupName: group.groupName,
        description: group.description,
        accounts: updatedAccounts
      });

      setGroups(groups.map(g => g.groupId === groupId ? result.group : g));
      
      // Add the removed player back to available players
      const removedPlayer = allPlayers.find(p => p.playerId === playerId);
      if (removedPlayer) {
        setAvailablePlayers([...availablePlayers, removedPlayer]);
      }
      
      showSuccess('Account removed from group');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove account');
    }
  };

  const handleRecalculate = async () => {
    try {
      const result = await apiService.recalculateGroups(clanTag);
      setGroups(result.groups);
      showSuccess('Groups recalculated with latest data!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate groups');
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleAccountSelection = (playerId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading grouped players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Grouped Players Manager
                </h1>
                <p className="text-sm text-gray-500">
                  Clan: {clanTag} • {groups.length} groups • {availablePlayers.length} ungrouped players
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleRecalculate}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recalculate
              </button>
              
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Group
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}
        </div>

        {/* Create Group Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
            <h2 className="text-lg font-semibold mb-4">Create New Player Group</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., John Doe (Multi-account)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="e.g., Main player with alt accounts"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Accounts ({selectedAccounts.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {availablePlayers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No ungrouped players available</p>
                  ) : (
                    availablePlayers.map(player => (
                      <label
                        key={player.playerId}
                        className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(player.playerId)}
                          onChange={() => toggleAccountSelection(player.playerId)}
                          className="mt-1 rounded text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{player.name || 'Unknown Player'}</div>
                          <div className="text-xs text-gray-500">
                            ID: {player.playerId} • 8wk: {player.avg8Weeks?.toFixed(1) || '-'}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedAccounts.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create Group
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedAccounts([]);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Groups Management Section */}
        {groups.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Manage Existing Groups</h2>
            <div className="space-y-4">
              {groups.map(group => (
                <div key={group.groupId} className="border rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleGroup(group.groupId)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedGroups[group.groupId] ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      
                      {editingGroup === group.groupId ? (
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-64"
                            placeholder="Group name"
                          />
                          <input
                            type="text"
                            value={editGroupDescription}
                            onChange={(e) => setEditGroupDescription(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-64 ml-2"
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <span className="font-semibold">{group.groupName}</span>
                          {group.description && (
                            <span className="text-sm text-gray-500 ml-2">({group.description})</span>
                          )}
                          <span className="ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {group.accounts.length} accounts
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {editingGroup === group.groupId ? (
                        <>
                          <button
                            onClick={() => handleUpdateGroup(group.groupId)}
                            className="text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingGroup(null);
                              setEditGroupName('');
                              setEditGroupDescription('');
                            }}
                            className="text-gray-500 hover:text-gray-700"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingGroup(group.groupId);
                              setEditGroupName(group.groupName);
                              setEditGroupDescription(group.description || '');
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit group"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.groupId)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Account Details */}
                  {expandedGroups[group.groupId] && (
                    <div className="p-4 border-t">
                      <h4 className="text-sm font-semibold mb-3">Accounts in this group:</h4>
                      <div className="space-y-3">
                        {group.accounts.map(account => (
                          <div key={account.playerId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div>
                              <span className="font-medium">{account.name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                ID: {account.playerId.slice(0, 8)}...
                              </span>
                              <div className="text-xs text-gray-600 mt-1">
                                8wk: {account.avg8Weeks?.toFixed(1) || '-'} • 
                                4wk: {account.avg4Weeks?.toFixed(1) || '-'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveAccountFromGroup(group.groupId, account.playerId)}
                              className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              title="Remove from group"
                            >
                              <X className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONLY ONE TABLE - The Combined Table */}
        {clanStats && (
          <CombinedPlayersTable
            players={allPlayers}
            groups={groups}
            weekLabels={weekLabels}
            clanTag={clanTag}
          />
        )}

        {/* Ungrouped Players Summary */}
        {availablePlayers.length > 0 && !isCreating && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{availablePlayers.length} Ungrouped Players Available</span>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupedPlayersManager;