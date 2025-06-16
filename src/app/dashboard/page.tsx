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

type TabType = 'dashboard' | 'createEvent' | 'availability' | 'scheduling';

interface DashboardStats {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

interface DashboardModal {
  type: 'myEvents' | 'participatingEvents' | 'availableEvents' | null;
  isOpen: boolean;
}

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { notifications, showSuccess, showError, showInfo, removeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [modal, setModal] = useState<DashboardModal>({ type: null, isOpen: false });
  
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
      if (!token) {
        showError('認証トークンがありません。再ログインしてください。');
        logout();
        return;
      }

      // 作成したイベントを取得
      const createdEventsRes = await fetch(`/api/events?creatorId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let myCreatedEventsData: EventWithCreator[] = [];
      if (createdEventsRes.ok) {
        myCreatedEventsData = await createdEventsRes.json();
        setMyCreatedEvents(myCreatedEventsData);
      } else if (createdEventsRes.status === 401) {
        showError('認証エラーが発生しました。再ログインしてください。');
        logout();
        return;
      } else {
        console.error('Created events fetch failed:', createdEventsRes.status);
      }

      // 参加可能なイベントを取得
      const availableEventsRes = await fetch('/api/events?status=open', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let availableEventsData: EventWithCreator[] = [];
      if (availableEventsRes.ok) {
        const allAvailable = await availableEventsRes.json();
        // 自分が作成したものと既に参加しているものを除外
        availableEventsData = allAvailable.filter((event: EventWithCreator) => 
          event.creatorId !== user.id && !event.participants.includes(user.id)
        );
        setAvailableEvents(availableEventsData);
      }

      // 参加しているイベントを取得（全イベントから参加しているものをフィルター）
      const allEventsRes = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let myParticipatingEventsData: EventWithCreator[] = [];
      if (allEventsRes.ok) {
        const allEvents = await allEventsRes.json();
        myParticipatingEventsData = allEvents.filter((event: EventWithCreator) => 
          event.participants.includes(user.id) && event.creatorId !== user.id
        );
        setMyParticipatingEvents(myParticipatingEventsData);
      }

      // ダッシュボード統計を計算
      const allMyEvents = [...myCreatedEventsData, ...myParticipatingEventsData];
      
      // 成立済みイベントは作成したものと参加しているもの両方をカウント
      const myMatchedEvents = myCreatedEventsData.filter(e => e.status === 'matched').length +
                             myParticipatingEventsData.filter(e => e.status === 'matched').length;
      
      setDashboardStats({
        createdEvents: myCreatedEventsData.length,
        participatingEvents: myParticipatingEventsData.length,
        matchedEvents: myMatchedEvents,
        pendingEvents: allMyEvents.filter(e => e.status === 'open').length,
      });

    } catch (error) {
      console.error('Data loading error:', error);
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

      setActiveTab('dashboard');
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
      
      // 日程調整結果を表示
      if (result.matching?.isMatched) {
        showSuccess('🎉 おめでとうございます！イベントが成立しました！', 7000);
      } else {
        showInfo('イベントに参加しました。他の参加者を待っています。');
      }

      await loadAllData();
      setModal({ type: null, isOpen: false }); // モーダルを閉じる
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'イベントへの参加に失敗しました';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const openModal = (type: DashboardModal['type']) => {
    setModal({ type, isOpen: true });
  };

  const closeModal = () => {
    setModal({ type: null, isOpen: false });
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
          <div 
            className="bg-white rounded-lg p-6 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openModal('myEvents')}
          >
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

          <div 
            className="bg-white rounded-lg p-6 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openModal('participatingEvents')}
          >
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

          <div 
            className="bg-white rounded-lg p-6 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveTab('scheduling')}
          >
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

      {/* メインアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* イベント作成 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しいイベントを作成
            </h3>
            <p className="text-gray-600 mb-4">日程調整が必要なイベントを作成しましょう</p>
            <button
              onClick={() => setActiveTab('createEvent')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              イベントを作成する
            </button>
          </div>
        </div>

        {/* イベントを探す */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              参加できるイベントを探す
            </h3>
            <p className="text-gray-600 mb-4">他の人が作成したイベントに参加してみましょう</p>
            <button
              onClick={() => openModal('availableEvents')}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              イベントを探す
              {availableEvents.length > 0 && (
                <span className="ml-2 bg-purple-400 px-2 py-1 rounded-full text-xs">
                  {availableEvents.length}件
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* サブアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              予定を管理
            </h3>
            <p className="text-gray-600 mb-4">空き時間を登録して日程調整に参加しましょう</p>
            <button
              onClick={() => setActiveTab('availability')}
              className="w-full border border-green-500 text-green-600 hover:bg-green-50 font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              予定を更新する
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              日程調整状況
            </h3>
            <p className="text-gray-600 mb-4">全体の日程調整統計を確認できます</p>
            <button
              onClick={() => setActiveTab('scheduling')}
              className="w-full border border-indigo-500 text-indigo-600 hover:bg-indigo-50 font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              状況を確認する
            </button>
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      {[...myCreatedEvents, ...myParticipatingEvents].length > 0 && (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    if (!modal.isOpen || !modal.type) return null;

    let events: EventWithCreator[] = [];
    let title = '';
    let showJoinButton = false;

    switch (modal.type) {
      case 'myEvents':
        events = myCreatedEvents;
        title = '作成したイベント';
        break;
      case 'participatingEvents':
        events = myParticipatingEvents;
        title = '参加中のイベント';
        break;
      case 'availableEvents':
        events = availableEvents;
        title = '参加可能なイベント';
        showJoinButton = true;
        break;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 hover:cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <EventList
              events={events}
              isLoading={isLoadingEvents}
              currentUserId={user.id}
              showJoinButton={showJoinButton}
              onJoinEvent={handleJoinEvent}
              emptyMessage={
                modal.type === 'myEvents' ? 'まだイベントを作成していません' :
                modal.type === 'participatingEvents' ? '参加中のイベントがありません' :
                '現在参加可能なイベントがありません'
              }
            />
          </div>
        </div>
      </div>
    );
  };

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
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
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
                className="float-right hover:opacity-75 hover:cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* シンプルなタブナビゲーション */}
          {activeTab !== 'dashboard' && (
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium hover:cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                ダッシュボードに戻る
              </button>
            </div>
          )}

          {/* コンテンツ */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {activeTab === 'dashboard' && renderDashboard()}

              {activeTab === 'createEvent' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-6">新しいイベントを作成</h2>
                  <CreateEventForm
                    onSubmit={handleCreateEvent}
                    onCancel={() => setActiveTab('dashboard')}
                    error={error}
                  />
                </div>
              )}

              {activeTab === 'availability' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-6">予定管理</h2>
                  <AvailabilityManager />
                </div>
              )}

              {activeTab === 'scheduling' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-6">日程調整状況</h2>
                  <MatchingStatus />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* モーダル */}
      {renderModal()}
    </div>
  );
}