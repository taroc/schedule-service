'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CreateEventFormEnhanced from '@/components/events/CreateEventFormEnhanced';
import EventList from '@/components/events/EventList';
import AvailabilityManager from '@/components/schedule/AvailabilityManager';
import ToastManager from '@/components/ui/ToastManager';
import ClientThemeToggle from '@/components/ui/ClientThemeToggle';
import { useNotification } from '@/hooks/useNotification';
import { CreateEventRequest, EventWithCreator, EventResponse } from '@/types/event';

type TabType = 'dashboard' | 'createEvent' | 'availability';

interface DashboardStats {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

interface DashboardModal {
  type: 'myEvents' | 'participatingEvents' | 'completedEvents' | null;
  isOpen: boolean;
}

function DashboardContent() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showInfo } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [modal, setModal] = useState<DashboardModal>({ type: null, isOpen: false });

  const [availableEvents, setAvailableEvents] = useState<EventWithCreator[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // モーダル用の個別データと読み込み状態
  const [modalEvents, setModalEvents] = useState<{ [key: string]: EventWithCreator[] }>({});
  const [modalLoading, setModalLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  // URLパラメータからタブを初期化
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['dashboard', 'createEvent', 'availability'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // タブ変更とURL更新
  const changeTab = (newTab: TabType) => {
    const params = new URLSearchParams(searchParams);
    if (newTab === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const newUrl = params.toString() ? `/dashboard?${params.toString()}` : '/dashboard';
    router.push(newUrl);
  };

  const loadInitialData = async () => {
    if (!user) return;

    setIsLoadingStats(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('認証トークンがありません。再ログインしてください。');
        logout();
        return;
      }

      // 軽量な統計情報と参加可能イベントのみ取得
      const statsRes = await fetch('/api/events/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!statsRes.ok) {
        if (statsRes.status === 401) {
          showError('認証エラーが発生しました。再ログインしてください。');
          logout();
          return;
        } else {
          console.error('Stats fetch failed:', statsRes.status);
          throw new Error('統計データの取得に失敗しました');
        }
      }

      const statsData = await statsRes.json();

      // 状態を更新（statsDataは直接統計データ）
      setDashboardStats(statsData);
      
      // 参加可能なイベントは別途読み込み
      await loadAvailableEvents(token);

    } catch (error) {
      console.error('Data loading error:', error);
      const errorMessage = 'データの読み込みに失敗しました';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 参加可能なイベントを読み込む関数
  const loadAvailableEvents = async (token: string) => {
    try {
      const availableRes = await fetch('/api/events?status=open', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (availableRes.ok) {
        const availableData: EventResponse[] = await availableRes.json();
        
        // EventResponseをEventWithCreatorに変換
        const convertResponseToEvent = (events: EventResponse[]): EventWithCreator[] => {
          return events.map(event => ({
            ...event,
            createdAt: new Date(event.createdAt),
            updatedAt: new Date(event.updatedAt),
            deadline: new Date(event.deadline),
            periodStart: new Date(event.periodStart),
            periodEnd: new Date(event.periodEnd),
            selectionDeadline: event.selectionDeadline ? new Date(event.selectionDeadline) : undefined,
            confirmationDeadline: event.confirmationDeadline ? new Date(event.confirmationDeadline) : undefined,
            matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
              date: new Date(ts.date),
              timeSlot: ts.timeSlot
            })) : undefined
          }));
        };

        setAvailableEvents(convertResponseToEvent(availableData));
      } else {
        console.warn('Available events fetch failed:', availableRes.status);
        setAvailableEvents([]);
      }
    } catch (error) {
      console.warn('Failed to load available events:', error);
      setAvailableEvents([]);
    }
  };

  // モーダル用のデータ読み込み
  const loadModalData = async (modalType: DashboardModal['type']) => {
    if (!modalType || !user) return;

    const cacheKey = modalType;
    
    // 既にデータがある場合はスキップ
    if (modalEvents[cacheKey]) {
      return;
    }

    setModalLoading(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('認証トークンがありません。再ログインしてください。');
        logout();
        return;
      }

      const response = await fetch(`/api/events/list?type=${modalType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          showError('認証エラーが発生しました。再ログインしてください。');
          logout();
          return;
        } else {
          console.error(`Modal data fetch failed for ${modalType}:`, response.status);
          throw new Error('リストデータの取得に失敗しました');
        }
      }

      const eventsData = await response.json();

      // EventResponseをEventWithCreatorに変換
      const convertResponseToEvent = (events: EventResponse[]): EventWithCreator[] => {
        return events.map(event => ({
          ...event,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt),
          deadline: new Date(event.deadline),
          periodStart: new Date(event.periodStart),
          periodEnd: new Date(event.periodEnd),
          selectionDeadline: event.selectionDeadline ? new Date(event.selectionDeadline) : undefined,
          confirmationDeadline: event.confirmationDeadline ? new Date(event.confirmationDeadline) : undefined,
          matchedTimeSlots: event.matchedTimeSlots ? event.matchedTimeSlots.map(ts => ({
            date: new Date(ts.date),
            timeSlot: ts.timeSlot
          })) : undefined
        }));
      };

      const convertedEvents = convertResponseToEvent(eventsData);
      setModalEvents(prev => ({ ...prev, [cacheKey]: convertedEvents }));

    } catch (error) {
      console.error('Modal data loading error:', error);
      showError('リストデータの読み込みに失敗しました');
    } finally {
      setModalLoading(prev => ({ ...prev, [cacheKey]: false }));
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

      changeTab('dashboard');
      await loadInitialData();
      // モーダルのキャッシュをクリア
      setModalEvents({});
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

      await loadInitialData();
      // モーダルのキャッシュをクリア
      setModalEvents({});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'イベントへの参加に失敗しました';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const openModal = (type: DashboardModal['type']) => {
    setModal({ type, isOpen: true });
    // モーダルを開いたときにデータを読み込み
    loadModalData(type);
  };

  const closeModal = () => {
    setModal({ type: null, isOpen: false });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">読み込み中...</p>
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
      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse">
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow"
            onClick={() => openModal('myEvents')}
          >
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">作成したイベント</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{dashboardStats.createdEvents}</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow"
            onClick={() => openModal('participatingEvents')}
          >
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">参加表明したイベント</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{dashboardStats.participatingEvents}</p>
              </div>
            </div>
          </div>

          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow"
            onClick={() => openModal('completedEvents')}
          >
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">参加が決まったイベント</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{dashboardStats.matchedEvents}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* メインアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* イベント作成 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しいイベントを作成
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">日程調整が必要なイベントを作成しましょう</p>
            <button
              onClick={() => changeTab('createEvent')}
              className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              イベントを作成する
            </button>
          </div>
        </div>

        {/* 予定管理 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              予定を管理
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">空き時間を登録して日程調整に参加しましょう</p>
            <button
              onClick={() => changeTab('availability')}
              className="w-full border border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 font-medium py-3 px-4 rounded-lg transition-colors hover:cursor-pointer"
            >
              予定を更新する
            </button>
          </div>
        </div>

      </div>

      {/* 参加できるイベント一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <svg className="w-5 h-5 text-purple-500 dark:text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            参加できるイベント
            {availableEvents.length > 0 && (
              <span className="ml-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-medium">
                {availableEvents.length}件
              </span>
            )}
          </h3>
          <EventList
            events={availableEvents}
            currentUserId={user.id}
            showJoinButton={true}
            onJoinEvent={handleJoinEvent}
            displayMode="available"
            emptyMessage="現在参加可能なイベントがありません"
          />
        </div>
      </div>

    </div>
  );

  const renderModal = () => {
    if (!modal.isOpen || !modal.type) return null;

    const events = modalEvents[modal.type] || [];
    const isLoading = modalLoading[modal.type] || false;
    let title = '';
    const showJoinButton = false;

    switch (modal.type) {
      case 'myEvents':
        title = '作成したイベント';
        break;
      case 'participatingEvents':
        title = '参加表明したイベント';
        break;
      case 'completedEvents':
        title = '参加が決まったイベント';
        break;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={closeModal}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
            <EventList
              events={events}
              isLoading={isLoading}
              currentUserId={user.id}
              showJoinButton={showJoinButton}
              onJoinEvent={handleJoinEvent}
              displayMode={
                modal.type === 'myEvents' ? 'created' :
                  modal.type === 'participatingEvents' ? 'participating' :
                    modal.type === 'completedEvents' ? 'completed' : 'default'
              }
              emptyMessage={
                modal.type === 'myEvents' ? 'まだイベントを作成していません' :
                  modal.type === 'participatingEvents' ? '参加表明したイベントがありません' :
                    modal.type === 'completedEvents' ? '参加が決まったイベントがありません' : ''
              }
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 通知トースト */}
      <ToastManager />

      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                スケジュール調整サービス
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ClientThemeToggle />
              <span className="text-gray-700 dark:text-gray-300">こんにちは、{user.id}さん</span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer transition-colors"
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
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
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
                onClick={() => changeTab('dashboard')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                ダッシュボードに戻る
              </button>
            </div>
          )}

          {/* コンテンツ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6">
              {activeTab === 'dashboard' && renderDashboard()}

              {activeTab === 'createEvent' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">新しいイベントを作成</h2>
                  <CreateEventFormEnhanced
                    onSubmit={handleCreateEvent}
                    onCancel={() => changeTab('dashboard')}
                    error={error}
                  />
                </div>
              )}

              {activeTab === 'availability' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">予定管理</h2>
                  <AvailabilityManager />
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

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}