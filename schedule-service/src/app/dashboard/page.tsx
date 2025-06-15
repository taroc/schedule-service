'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CreateEventForm from '@/components/events/CreateEventForm';
import EventList from '@/components/events/EventList';
import AvailabilityManager from '@/components/schedule/AvailabilityManager';
import MatchingStatus from '@/components/matching/MatchingStatus';
import NotificationToast from '@/components/ui/NotificationToast';
import { useNotification } from '@/hooks/useNotification';
import { CreateEventRequest, EventWithCreator } from '@/types/event';

type TabType = 'dashboard' | 'myParticipation' | 'myCreatedEvents' | 'findEvents' | 'createEvent' | 'availability' | 'matching';

interface DashboardStats {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { notifications, showSuccess, showError, showInfo, removeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [myCreatedEvents, setMyCreatedEvents] = useState<EventWithCreator[]>([]);
  const [myParticipatingEvents, setMyParticipatingEvents] = useState<EventWithCreator[]>([]);
  const [availableEvents, setAvailableEvents] = useState<EventWithCreator[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllData = async () => {
    if (!user) return;
    
    setIsLoadingEvents(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 並行して全データを取得
      const [createdEventsRes, participatingEventsRes, availableEventsRes] = await Promise.all([
        // 作成したイベント
        fetch(`/api/events?creatorId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // 参加しているイベント（作成者以外として）
        fetch(`/api/events?participantId=${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // 参加可能なイベント（オープンなもの）
        fetch('/api/events?status=open', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (createdEventsRes.ok) {
        const createdData = await createdEventsRes.json();
        setMyCreatedEvents(createdData);
      }

      if (participatingEventsRes.ok) {
        const participatingData = await participatingEventsRes.json();
        setMyParticipatingEvents(participatingData);
      } else {
        // participantIdパラメータが未実装の場合、全イベントから参加しているものをフィルター
        const allEventsRes = await fetch('/api/events', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (allEventsRes.ok) {
          const allEvents = await allEventsRes.json();
          const participating = allEvents.filter((event: EventWithCreator) => 
            event.participants.includes(user.id) && event.creatorId !== user.id
          );
          setMyParticipatingEvents(participating);
        }
      }

      if (availableEventsRes.ok) {
        const availableData = await availableEventsRes.json();
        // 自分が作成したものと既に参加しているものを除外
        const filteredAvailable = availableData.filter((event: EventWithCreator) => 
          event.creatorId !== user.id && !event.participants.includes(user.id)
        );
        setAvailableEvents(filteredAvailable);
      }

      // ダッシュボード統計を計算
      if (createdEventsRes.ok && participatingEventsRes.ok) {
        const created = await createdEventsRes.json();
        const participating = myParticipatingEvents;
        
        setDashboardStats({
          createdEvents: created.length,
          participatingEvents: participating.length,
          matchedEvents: [...created, ...participating].filter((e: EventWithCreator) => e.status === 'matched').length,
          pendingEvents: [...created, ...participating].filter((e: EventWithCreator) => e.status === 'open').length,
        });
      }

    } catch {
      const errorMessage = 'データの読み込みに失敗しました';
      setError(errorMessage);
      showError(errorMessage);
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

      setActiveTab('myCreatedEvents');
      await loadAllData();
      showSuccess('イベントを作成しました！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'イベントの作成に失敗しました';
      setError(errorMessage);
      showError(errorMessage);
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

      const result = await response.json();
      
      // マッチング結果を表示
      if (result.matching?.isMatched) {
        showSuccess('🎉 おめでとうございます！イベントがマッチングしました！', 7000);
      } else {
        showInfo('イベントに参加しました。他の参加者を待っています。');
      }

      await loadAllData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'イベントへの参加に失敗しました';
      setError(errorMessage);
      showError(errorMessage);
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

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* ウェルカムメッセージ */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">こんにちは、{user.id}さん！</h2>
        <p className="text-blue-100">今日も素敵なイベント調整を始めましょう</p>
      </div>

      {/* 統計カード */}
      {dashboardStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">作成したイベント</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardStats.createdEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">参加中のイベント</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardStats.participatingEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-emerald-100">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">成立済み</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardStats.matchedEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-orange-100">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">調整中</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardStats.pendingEvents}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('createEvent')}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">新しいイベントを作成</p>
                <p className="text-sm text-gray-500">日程調整を開始する</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('availability')}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">予定を更新</p>
                <p className="text-sm text-gray-500">空き時間を設定する</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('findEvents')}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">イベントを探す</p>
                <p className="text-sm text-gray-500">参加できるイベントを見つける</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近のアクティビティ</h3>
          <div className="space-y-3">
            {[...myCreatedEvents, ...myParticipatingEvents]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 3)
              .map((event) => (
                <div key={event.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    event.status === 'matched' ? 'bg-green-400' : 
                    event.status === 'open' ? 'bg-blue-400' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-500">
                      {event.creatorId === user.id ? '作成者' : '参加者'} • 
                      {event.status === 'matched' ? ' 成立済み' : ' 調整中'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              ))}
            {[...myCreatedEvents, ...myParticipatingEvents].length === 0 && (
              <p className="text-gray-500 text-center py-4">まだアクティビティがありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 通知トースト */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          message={notification.message}
          type={notification.type}
          isVisible={true}
          onClose={() => removeNotification(notification.id)}
          duration={notification.duration}
        />
      ))}

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                スケジュール調整サービス
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">こんにちは、{user.id}さん</span>
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
            <div className={`border px-4 py-3 rounded mb-6 ${
              error.includes('おめでとう') 
                ? 'bg-green-100 border-green-400 text-green-700'
                : 'bg-red-100 border-red-400 text-red-700'
            }`}>
              {error}
              <button
                onClick={() => setError('')}
                className="float-right hover:opacity-75"
              >
                ×
              </button>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    ダッシュボード
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('myParticipation')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'myParticipation'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    参加中のイベント
                    {myParticipatingEvents.length > 0 && (
                      <span className="ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                        {myParticipatingEvents.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('myCreatedEvents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'myCreatedEvents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    作成したイベント
                    {myCreatedEvents.length > 0 && (
                      <span className="ml-1 bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full text-xs">
                        {myCreatedEvents.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('findEvents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'findEvents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    イベントを探す
                    {availableEvents.length > 0 && (
                      <span className="ml-1 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-xs">
                        {availableEvents.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('createEvent')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'createEvent'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    イベント作成
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'availability'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    予定管理
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('matching')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'matching'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    マッチング状況
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {/* タブコンテンツ */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {activeTab === 'dashboard' && renderDashboard()}

              {activeTab === 'myParticipation' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    参加中のイベント
                  </h2>
                  <EventList
                    events={myParticipatingEvents}
                    isLoading={isLoadingEvents}
                    currentUserId={user.id}
                    emptyMessage="参加中のイベントがありません。イベントを探して参加してみましょう！"
                  />
                </div>
              )}

              {activeTab === 'myCreatedEvents' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    作成したイベント
                  </h2>
                  <EventList
                    events={myCreatedEvents}
                    isLoading={isLoadingEvents}
                    currentUserId={user.id}
                    emptyMessage="まだイベントを作成していません。新しいイベントを作成してみましょう！"
                  />
                </div>
              )}

              {activeTab === 'findEvents' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    参加可能なイベント
                  </h2>
                  <EventList
                    events={availableEvents}
                    isLoading={isLoadingEvents}
                    currentUserId={user.id}
                    showJoinButton={true}
                    onJoinEvent={handleJoinEvent}
                    emptyMessage="現在参加可能なイベントがありません。"
                  />
                </div>
              )}

              {activeTab === 'createEvent' && (
                <div>
                  <CreateEventForm
                    onSubmit={handleCreateEvent}
                    onCancel={() => setActiveTab('dashboard')}
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