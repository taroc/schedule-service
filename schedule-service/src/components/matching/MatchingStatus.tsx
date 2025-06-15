'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EventWithCreator } from '@/types/event';

interface MatchingStats {
  totalEventsChecked: number;
  matchedEvents: number;
  pendingEvents: number;
}

type TabType = 'overview' | 'matched';


export default function MatchingStatus() {
  const { token } = useAuth();
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [matchedEvents, setMatchedEvents] = useState<EventWithCreator[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [loadingMatched, setLoadingMatched] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/matching', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching matching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  const fetchMatchedEvents = useCallback(async () => {
    if (!token) return;

    setLoadingMatched(true);
    try {
      const response = await fetch('/api/events?status=matched', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const events = await response.json();
        setMatchedEvents(events);
      }
    } catch (error) {
      console.error('Error fetching matched events:', error);
    } finally {
      setLoadingMatched(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'matched') {
      fetchMatchedEvents();
    }
  }, [token, activeTab, fetchMatchedEvents]);


  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          マッチング状況を読み込み中...
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('ja-JP');
  };

  return (
    <div className="space-y-6">
      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('matched')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'matched'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              成立済みイベント
              {stats && stats.matchedEvents > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {stats.matchedEvents}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                マッチング状況
              </h3>

              {stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.totalEventsChecked}
                    </div>
                    <div className="text-sm text-gray-600">総イベント数</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.matchedEvents}
                    </div>
                    <div className="text-sm text-gray-600">成立済み</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.pendingEvents}
                    </div>
                    <div className="text-sm text-gray-600">募集中</div>
                  </div>
                </div>
              )}

              {/* 使い方の説明 */}
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <strong>自動マッチング:</strong> イベントへの参加や空き時間の登録時に自動実行されます。
                    条件が満たされると自動的にイベントがマッチング成立状態に変更されます。
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matched' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  成立済みイベント
                </h3>
                <button
                  onClick={fetchMatchedEvents}
                  disabled={loadingMatched}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 mr-1 ${loadingMatched ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  更新
                </button>
              </div>

              {loadingMatched ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">読み込み中...</span>
                </div>
              ) : matchedEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  成立済みのイベントがありません
                </div>
              ) : (
                <div className="space-y-4">
                  {matchedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-semibold text-gray-900">
                              {event.name}
                            </h4>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                              成立済み
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{event.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">作成者ID:</span> {event.creatorId}
                        </div>
                        <div>
                          <span className="font-medium">作成日:</span> {formatDate(event.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">必要人数:</span> {event.requiredParticipants}人
                        </div>
                        <div>
                          <span className="font-medium">必要日数:</span> {event.requiredDays}日
                        </div>
                        <div>
                          <span className="font-medium">成立日:</span> {formatDateTime(event.updatedAt)}
                        </div>
                        <div>
                          <span className="font-medium">参加締切:</span>{' '}
                          {event.deadline ? formatDateTime(event.deadline) : '期限なし'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">参加者:</span> {event.participants.length}人
                          <div className="mt-1 text-xs text-gray-500">
                            参加者ID: {event.participants.join(', ')}
                          </div>
                        </div>

                        {event.matchedDates && (
                          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-blue-700">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-semibold">成立日程:</span>
                              <span className="font-medium">
                                {event.matchedDates.map(date => formatDate(date)).join(', ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}