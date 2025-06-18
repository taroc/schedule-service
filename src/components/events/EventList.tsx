'use client';

import { useState } from 'react';
import { EventWithCreator, EventPriority } from '@/types/event';
import JoinEventModal from './JoinEventModal';

type EventDisplayMode = 'created' | 'participating' | 'completed' | 'available' | 'default';

interface EventListProps {
  events: EventWithCreator[];
  isLoading?: boolean;
  onEventClick?: (event: EventWithCreator) => void;
  onJoinEvent?: (eventId: string, priority: EventPriority) => void;
  currentUserId?: string;
  showJoinButton?: boolean;
  emptyMessage?: string;
  displayMode?: EventDisplayMode;
}

export default function EventList({
  events,
  isLoading = false,
  onEventClick,
  onJoinEvent,
  currentUserId,
  showJoinButton = false,
  emptyMessage = 'イベントがありません',
  displayMode = 'default'
}: EventListProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [joinModalState, setJoinModalState] = useState<{
    isOpen: boolean;
    eventId: string;
    eventName: string;
  }>({
    isOpen: false,
    eventId: '',
    eventName: ''
  });
  const [isJoining, setIsJoining] = useState(false);

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleJoinButtonClick = (event: EventWithCreator) => {
    setJoinModalState({
      isOpen: true,
      eventId: event.id,
      eventName: event.name
    });
  };

  const handleJoinModalClose = () => {
    setJoinModalState({
      isOpen: false,
      eventId: '',
      eventName: ''
    });
    setIsJoining(false);
  };

  const handleJoinConfirm = async (priority: EventPriority) => {
    if (!onJoinEvent || !joinModalState.eventId) return;
    
    setIsJoining(true);
    try {
      await onJoinEvent(joinModalState.eventId, priority);
      handleJoinModalClose();
    } catch {
      setIsJoining(false);
      // エラーハンドリングは親コンポーネントで行う
    }
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const getStatusConfig = (status: EventWithCreator['status']) => {
    const statusConfig = {
      open: { 
        text: '募集中', 
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        cardClass: 'border-green-200 bg-green-50/30'
      },
      matched: { 
        text: '成立済み', 
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        cardClass: 'border-blue-200 bg-blue-50/30'
      },
      cancelled: { 
        text: 'キャンセル', 
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        cardClass: 'border-red-200 bg-red-50/30'
      },
      expired: { 
        text: '期限切れ', 
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        cardClass: 'border-gray-200 bg-gray-50/30'
      }
    };

    return statusConfig[status];
  };

  const getStatusBadge = (status: EventWithCreator['status']) => {
    const config = getStatusConfig(status);
    return (
      <span className={`px-3 py-1 text-base font-semibold rounded-full border ${config.badgeClass}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP');
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP');
  };

  const getPriorityText = (priority: string) => {
    const priorityMap = {
      'high': '高（緊急・重要）',
      'medium': '中（標準）',
      'low': '低（後回しでも良い）'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
  };

  const getDateModeText = (dateMode: string) => {
    const dateModeMap = {
      'consecutive': '連続日程',
      'flexible': '柔軟日程',
      'within_period': '期間指定'
    };
    return dateModeMap[dateMode as keyof typeof dateModeMap] || dateMode;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'high': { text: '高', className: 'bg-red-100 text-red-800 border-red-200' },
      'medium': { text: '中', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'low': { text: '低', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    if (!config) return null;
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getDeadlineStatus = (deadline: Date) => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (timeDiff <= 0) {
      return { text: '期限切れ', className: 'text-red-600' };
    } else if (hoursDiff <= 24) {
      return { text: '24時間以内', className: 'text-orange-600' };
    } else if (hoursDiff <= 72) {
      return { text: '3日以内', className: 'text-yellow-600' };
    } else {
      return { text: '', className: 'text-gray-600' };
    }
  };

  const canJoin = (event: EventWithCreator) => {
    return (
      showJoinButton &&
      currentUserId &&
      event.status === 'open' &&
      event.creatorId !== currentUserId &&
      !event.participants.includes(currentUserId)
    );
  };

  const isParticipating = (event: EventWithCreator) => {
    return currentUserId && event.participants.includes(currentUserId);
  };

  const getDisplayConfig = (mode: EventDisplayMode) => {
    switch (mode) {
      case 'created':
        return {
          priorityInfo: ['participants', 'deadline', 'requirements'],
          showDetailed: true,
          emphasize: 'management'
        };
      case 'participating':
        return {
          priorityInfo: ['status', 'participants', 'deadline', 'matched'],
          showDetailed: true,
          emphasize: 'participation'
        };
      case 'completed':
        return {
          priorityInfo: ['matched', 'participants'],
          showDetailed: false,
          emphasize: 'execution'
        };
      case 'available':
        return {
          priorityInfo: ['description', 'requirements', 'deadline'],
          showDetailed: false,
          emphasize: 'decision'
        };
      default:
        return {
          priorityInfo: ['status', 'participants', 'requirements'],
          showDetailed: true,
          emphasize: 'general'
        };
    }
  };

  const renderDetailedInfo = (event: EventWithCreator) => {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
        <h4 className="font-semibold text-lg text-gray-900 mb-3">詳細情報</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-gray-600">
          <div>
            <span className="font-medium text-gray-700">作成日:</span> {formatDate(event.createdAt)}
          </div>
          <div>
            <span className="font-medium text-gray-700">必要人数:</span> {event.requiredParticipants}人
          </div>
          <div>
            <span className="font-medium text-gray-700">必要日数:</span> {event.requiredDays}日
          </div>
          {currentUserId && event.participantDetails && (
            <div>
              <span className="font-medium text-gray-700">あなたの優先度:</span>{' '}
              {(() => {
                const userParticipation = event.participantDetails.find(p => p.userId === currentUserId);
                return userParticipation ? getPriorityText(userParticipation.priority) : '未参加';
              })()}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700">日程モード:</span> {getDateModeText(event.dateMode)}
          </div>
          {event.dateMode === 'within_period' && event.periodStart && event.periodEnd && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">指定期間:</span> {formatDate(event.periodStart)} ～ {formatDate(event.periodEnd)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <span className="font-medium text-gray-700">説明:</span>
            <p className="mt-1 text-base text-gray-600">{event.description}</p>
          </div>

          <div>
            <span className="font-medium text-gray-700">参加締切:</span>{' '}
            {event.deadline ? (
              (() => {
                const deadline = event.deadline instanceof Date ? event.deadline : new Date(event.deadline);
                const deadlineStatus = getDeadlineStatus(deadline);
                return (
                  <span className={deadlineStatus.className}>
                    {formatDateTime(deadline)}
                    {deadlineStatus.text && (
                      <span className="ml-2 text-sm font-semibold">
                        ({deadlineStatus.text})
                      </span>
                    )}
                  </span>
                );
              })()
            ) : (
              <span className="text-gray-500">期限なし</span>
            )}
          </div>

          <div>
            <span className="font-semibold text-lg text-gray-700">メンバー ({event.participants.length + 1}人):</span>
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {/* 主催者を最初に表示 */}
                <span 
                  className={`px-3 py-2 rounded text-base font-medium ${
                    event.creatorId === currentUserId 
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {event.creatorId}
                  <span className="ml-1 text-sm">👑</span>
                  {event.creatorId === currentUserId && ' (あなた)'}
                </span>
                
                {/* 参加者を表示 */}
                {event.participantDetails && event.participantDetails.length > 0 && 
                  event.participantDetails.map((participation) => (
                    <span 
                      key={participation.userId}
                      className={`px-3 py-2 rounded text-base flex items-center gap-1 ${
                        participation.userId === currentUserId 
                          ? 'bg-blue-100 text-blue-800 font-medium border-2 border-blue-300' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {participation.userId}
                      {participation.userId === currentUserId && ' (あなた)'}
                      {getPriorityBadge(participation.priority)}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>

          {event.status === 'matched' && event.matchedDates && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 text-green-700">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-xl">成立日程:</span>
                  <div className="text-xl font-bold">
                    {event.matchedDates.map(date => formatDate(date)).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEventCard = (event: EventWithCreator) => {
    const statusConfig = getStatusConfig(event.status);
    const displayConfig = getDisplayConfig(displayMode);

    // 成立済みイベント用の特別表示
    if (displayMode === 'completed' && event.status === 'matched') {
      return (
        <div
          key={event.id}
          className={`bg-white shadow-md rounded-lg p-6 border-2 hover:shadow-lg transition-all duration-200 ${statusConfig.cardClass}`}
        >
          {/* 成立済みイベント - 参加者と日程を最優先 */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <h3 className={`text-xl font-semibold text-gray-900 ${onEventClick ? 'cursor-pointer hover:text-blue-600' : ''}`}
                  onClick={() => onEventClick?.(event)}>
                {event.name}
              </h3>
              {getStatusBadge(event.status)}
              {currentUserId && event.participantDetails && 
                (() => {
                  const userParticipation = event.participantDetails.find(p => p.userId === currentUserId);
                  return userParticipation ? getPriorityBadge(userParticipation.priority) : null;
                })()
              }
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">
                <span className="font-medium">日程モード:</span> {getDateModeText(event.dateMode)}
              </span>
              {event.dateMode === 'within_period' && event.periodStart && event.periodEnd && (
                <span className="text-sm text-gray-600">
                  ({formatDate(event.periodStart)} ～ {formatDate(event.periodEnd)})
                </span>
              )}
            </div>
            
            {/* 成立日程 - 最も目立つ表示 */}
            {event.matchedDates && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-5 mb-4">
                <div className="flex items-center gap-4">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-bold text-2xl">開催日程</div>
                    <div className="text-blue-100 text-2xl font-bold">
                      {event.matchedDates.map(date => formatDate(date)).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 参加者情報 - 2番目に重要 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 text-green-700">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM9 16a7 7 0 000-14 7 7 0 000 14zm1-9a1 1 0 10-2 0 1 1 0 002 0z" />
                </svg>
                <span className="font-bold text-xl">メンバー ({event.participants.length + 1}人)</span>
              </div>
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {/* 主催者を最初に表示 */}
                  <span 
                    className={`px-3 py-2 rounded text-base font-medium ${
                      event.creatorId === currentUserId 
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {event.creatorId}
                    <span className="ml-1 text-sm">👑</span>
                    {event.creatorId === currentUserId && ' (あなた)'}
                  </span>
                  
                  {/* 参加者を表示 */}
                  {event.participantDetails && event.participantDetails.length > 0 && 
                    event.participantDetails.map((participation) => (
                      <span 
                        key={participation.userId}
                        className={`px-3 py-2 rounded text-base flex items-center gap-1 ${
                          participation.userId === currentUserId 
                            ? 'bg-green-200 text-green-800 font-medium border-2 border-green-400' 
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {participation.userId}
                        {participation.userId === currentUserId && ' (あなた)'}
                        {getPriorityBadge(participation.priority)}
                      </span>
                    ))
                  }
                </div>
              </div>
            </div>


            {/* 詳細表示ボタン */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => toggleExpanded(event.id)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-base font-medium transition-colors"
              >
                <svg 
                  className={`w-5 h-5 transition-transform ${expandedEvents.has(event.id) ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {expandedEvents.has(event.id) ? '詳細を隠す' : '詳細を見る'}
              </button>
            </div>

            {/* 詳細情報表示 */}
            {expandedEvents.has(event.id) && renderDetailedInfo(event)}
          </div>
        </div>
      );
    }

    // その他のモード用の表示
    return (
      <div
        key={event.id}
        className={`bg-white shadow-md rounded-lg p-6 border-2 hover:shadow-lg transition-all duration-200 ${statusConfig.cardClass}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 
                className={`text-xl font-semibold text-gray-900 ${
                  onEventClick ? 'cursor-pointer hover:text-blue-600' : ''
                }`}
                onClick={() => onEventClick?.(event)}
              >
                {event.name}
              </h3>
              {getStatusBadge(event.status)}
              {currentUserId && event.participantDetails && 
                (() => {
                  const userParticipation = event.participantDetails.find(p => p.userId === currentUserId);
                  return userParticipation ? getPriorityBadge(userParticipation.priority) : null;
                })()
              }
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">
                <span className="font-medium">日程モード:</span> {getDateModeText(event.dateMode)}
              </span>
              {event.dateMode === 'within_period' && event.periodStart && event.periodEnd && (
                <span className="text-sm text-gray-600">
                  ({formatDate(event.periodStart)} ～ {formatDate(event.periodEnd)})
                </span>
              )}
            </div>
            {(displayConfig.priorityInfo.includes('description') || displayMode === 'available') && (
              <p className="text-base text-gray-600 mb-3">{event.description}</p>
            )}
          </div>
        </div>

        {/* 優先情報に基づく表示 */}
        <div className="space-y-3">
          {/* 参加者情報 - 参加中イベントでは強調 */}
          {displayConfig.priorityInfo.includes('participants') && (
            <div className={`${displayMode === 'participating' ? 'bg-blue-50 border border-blue-200 rounded-lg p-3' : ''}`}>
              <div className={`text-base ${displayMode === 'participating' ? 'text-blue-700' : 'text-gray-600'}`}>
                <div className="flex items-center gap-2">
                  {displayMode === 'participating' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM9 16a7 7 0 000-14 7 7 0 000 14z" />
                    </svg>
                  )}
                  <span className="font-semibold">メンバー:</span> {event.participants.length + 1}人
                  {(isParticipating(event) || event.creatorId === currentUserId) && (
                    <span className="ml-2 text-blue-600 font-medium">（参加中）</span>
                  )}
                </div>
                {displayMode === 'participating' && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {/* 主催者を最初に表示 */}
                      <span 
                        className={`px-3 py-2 rounded text-base font-medium ${
                          event.creatorId === currentUserId 
                            ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {event.creatorId}
                        <span className="ml-1 text-sm">👑</span>
                        {event.creatorId === currentUserId && ' (あなた)'}
                      </span>
                      
                      {/* 参加者を表示 */}
                      {event.participantDetails && event.participantDetails.length > 0 && 
                        event.participantDetails.map((participation) => (
                          <span 
                            key={participation.userId}
                            className={`px-3 py-2 rounded text-base flex items-center gap-1 ${
                              participation.userId === currentUserId 
                                ? 'bg-blue-100 text-blue-800 font-medium border-2 border-blue-300' 
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {participation.userId}
                            {participation.userId === currentUserId && ' (あなた)'}
                            {getPriorityBadge(participation.priority)}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 締切情報 */}
          {displayConfig.priorityInfo.includes('deadline') && event.deadline && (
            <div className="text-base text-gray-600">
              <span className="font-medium">参加締切:</span>{' '}
              {(() => {
                const deadline = event.deadline instanceof Date ? event.deadline : new Date(event.deadline);
                const deadlineStatus = getDeadlineStatus(deadline);
                return (
                  <span className={deadlineStatus.className}>
                    {formatDateTime(deadline)}
                    {deadlineStatus.text && (
                      <span className="ml-2 text-sm font-semibold">
                        ({deadlineStatus.text})
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
          )}

          {/* 要件情報 */}
          {displayConfig.priorityInfo.includes('requirements') && (
            <div className="grid grid-cols-2 gap-4 text-base text-gray-600">
              <div>
                <span className="font-medium">必要人数:</span> {event.requiredParticipants}人
              </div>
              <div>
                <span className="font-medium">必要日数:</span> {event.requiredDays}日
              </div>
            </div>
          )}

          {/* 成立日程 - 参加中イベントで表示 */}
          {displayConfig.priorityInfo.includes('matched') && event.status === 'matched' && event.matchedDates && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 text-blue-700">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-xl">成立日程:</span>
                <span className="font-bold text-xl">
                  {event.matchedDates.map(date => formatDate(date)).join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* 詳細情報 - 作成者モードで表示 */}
          {displayConfig.showDetailed && displayMode === 'created' && (
            <div className="text-sm text-gray-500 pt-2 border-t">
              <div>
                <span className="font-medium">作成日:</span> {formatDate(event.createdAt)}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={() => toggleExpanded(event.id)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-base font-medium transition-colors"
            >
              <svg 
                className={`w-5 h-5 transition-transform ${expandedEvents.has(event.id) ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedEvents.has(event.id) ? '詳細を隠す' : '詳細を見る'}
            </button>

            {canJoin(event) && (
              <button
                onClick={() => handleJoinButtonClick(event)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-base py-3 px-5 rounded transition-colors hover:cursor-pointer"
              >
                参加する
              </button>
            )}
          </div>

          {/* 詳細情報表示 */}
          {expandedEvents.has(event.id) && renderDetailedInfo(event)}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => renderEventCard(event))}
      </div>
      
      <JoinEventModal
        isOpen={joinModalState.isOpen}
        eventName={joinModalState.eventName}
        onClose={handleJoinModalClose}
        onJoin={handleJoinConfirm}
        isLoading={isJoining}
      />
    </>
  );
}