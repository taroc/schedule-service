'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CreateEventForm from '@/components/events/CreateEventForm';
import EventList from '@/components/events/EventList';
import AvailabilityManager from '@/components/schedule/AvailabilityManager';
import MatchingStatus from '@/components/matching/MatchingStatus';
import { CreateEventRequest, EventWithCreator } from '@/types/event';

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'myEvents' | 'allEvents' | 'createEvent' | 'availability' | 'matching'>('myEvents');
  const [myEvents, setMyEvents] = useState<EventWithCreator[]>([]);
  const [allEvents, setAllEvents] = useState<EventWithCreator[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async () => {
    if (!user) return;
    
    setIsLoadingEvents(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 自分のイベントを取得
      const myEventsResponse = await fetch(`/api/events?creatorId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (myEventsResponse.ok) {
        const myEventsData = await myEventsResponse.json();
        setMyEvents(myEventsData);
      }

      // 全てのオープンなイベントを取得
      const allEventsResponse = await fetch('/api/events?status=open');
      if (allEventsResponse.ok) {
        const allEventsData = await allEventsResponse.json();
        setAllEvents(allEventsData);
      }
    } catch {
      setError('イベントの読み込みに失敗しました');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (eventData: CreateEventRequest) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'イベントの作成に失敗しました');
      }

      setActiveTab('myEvents');
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントの作成に失敗しました');
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'イベントへの参加に失敗しました');
      }

      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'イベントへの参加に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                スケジュール調整サービス
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">こんにちは、{user.name}さん</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
              <button
                onClick={() => setError('')}
                className="float-right text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('myEvents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'myEvents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  作成したイベント
                </button>
                <button
                  onClick={() => setActiveTab('allEvents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'allEvents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  参加可能なイベント
                </button>
                <button
                  onClick={() => setActiveTab('createEvent')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'createEvent'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  イベント作成
                </button>
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'availability'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  予定管理
                </button>
                <button
                  onClick={() => setActiveTab('matching')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'matching'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  マッチング状況
                </button>
              </nav>
            </div>
          </div>

          {/* タブコンテンツ */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {activeTab === 'myEvents' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    あなたが作成したイベント
                  </h2>
                  <EventList
                    events={myEvents}
                    isLoading={isLoadingEvents}
                    currentUserId={user.id}
                  />
                </div>
              )}

              {activeTab === 'allEvents' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    参加可能なイベント
                  </h2>
                  <EventList
                    events={allEvents}
                    isLoading={isLoadingEvents}
                    currentUserId={user.id}
                    showJoinButton={true}
                    onJoinEvent={handleJoinEvent}
                  />
                </div>
              )}

              {activeTab === 'createEvent' && (
                <div>
                  <CreateEventForm
                    onSubmit={handleCreateEvent}
                    onCancel={() => setActiveTab('myEvents')}
                    error={error}
                  />
                </div>
              )}

              {activeTab === 'availability' && (
                <AvailabilityManager />
              )}

              {activeTab === 'matching' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    マッチング状況
                  </h2>
                  <MatchingStatus />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}