'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MatchingStats {
  totalEventsChecked: number;
  matchedEvents: number;
  pendingEvents: number;
}

interface MatchingResult {
  eventId: string;
  isMatched: boolean;
  matchedDates: Date[];
  participants: string[];
  requiredDays: number;
  reason?: string;
}

export default function MatchingStatus() {
  const { token } = useAuth();
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [isRunningMatch, setIsRunningMatch] = useState(false);
  const [lastResults, setLastResults] = useState<MatchingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
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
  };

  const runMatching = async () => {
    if (!token) return;

    setIsRunningMatch(true);
    try {
      const response = await fetch('/api/matching', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLastResults(data.results);
        await fetchStats(); // 統計を更新
      }
    } catch (error) {
      console.error('Error running matching:', error);
    } finally {
      setIsRunningMatch(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          マッチング状況を読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            マッチング状況
          </h3>
          <button
            onClick={runMatching}
            disabled={isRunningMatch}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunningMatch ? 'マッチング実行中...' : '手動マッチング実行'}
          </button>
        </div>

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
      </div>

      {/* 最新のマッチング結果 */}
      {lastResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            最新のマッチング結果
          </h3>
          <div className="space-y-3">
            {lastResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.isMatched
                    ? 'bg-green-50 border-green-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      イベント ID: {result.eventId.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600">
                      参加者: {result.participants.length}人 / 
                      必要日数: {result.requiredDays}日
                    </div>
                    {result.reason && (
                      <div className="text-sm text-gray-500 mt-1">
                        {result.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    {result.isMatched ? (
                      <div className="flex items-center text-green-600">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        成立
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-600">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        未成立
                      </div>
                    )}
                  </div>
                </div>
                {result.isMatched && result.matchedDates.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>成立日程:</strong>{' '}
                    {result.matchedDates.map(date => 
                      new Date(date).toLocaleDateString('ja-JP')
                    ).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使い方の説明 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700">
            <strong>自動マッチング:</strong> イベントへの参加や空き時間の登録時に自動実行されます。
            手動実行ボタンで全イベントのマッチング状況を確認できます。
          </div>
        </div>
      </div>
    </div>
  );
}