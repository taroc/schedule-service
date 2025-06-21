'use client';

import { useState } from 'react';
import { EventWithCreator } from '@/types/event';

type EventDisplayMode = 'created' | 'participating' | 'completed' | 'available' | 'allEvents' | 'default';

interface EventListProps {
  events: EventWithCreator[];
  isLoading?: boolean;
  onEventClick?: (event: EventWithCreator) => void;
  onJoinEvent?: (eventId: string) => void;
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
  // const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [loadingEventIds, setLoadingEventIds] = useState<Set<string>>(new Set());

  // 将来の詳細表示機能用
  // const toggleExpanded = (eventId: string) => {
  //   const newExpanded = new Set(expandedEvents);
  //   if (newExpanded.has(eventId)) {
  //     newExpanded.delete(eventId);
  //   } else {
  //     newExpanded.add(eventId);
  //   }
  //   setExpandedEvents(newExpanded);
  // };

  const handleJoinButtonClick = async (event: EventWithCreator) => {
    if (!onJoinEvent) return;
    
    setLoadingEventIds(prev => new Set(prev).add(event.id));
    try {
      await onJoinEvent(event.id);
    } finally {
      setLoadingEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.id);
        return newSet;
      });
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

  const formatTimeSlot = (timeSlot: 'daytime' | 'evening') => {
    return timeSlot === 'daytime' ? '昼' : '夜';
  };

  const formatMatchedSchedule = (event: EventWithCreator) => {
    if (event.matchedTimeSlots && event.matchedTimeSlots.length > 0) {
      return event.matchedTimeSlots
        .map(ts => `${formatDate(ts.date)}(${formatTimeSlot(ts.timeSlot)})`)
        .join(', ');
    }
    return '';
  };


  // 将来の機能用（現在はgetDeadlineUrgencyを使用）
  // const getDeadlineStatus = (deadline: Date) => {
  //   const now = new Date();
  //   const timeDiff = deadline.getTime() - now.getTime();
  //   const hoursDiff = timeDiff / (1000 * 60 * 60);
  //   
  //   if (timeDiff <= 0) {
  //     return { text: '期限切れ', className: 'text-red-600' };
  //   } else if (hoursDiff <= 24) {
  //     return { text: '24時間以内', className: 'text-orange-600' };
  //   } else if (hoursDiff <= 72) {
  //     return { text: '3日以内', className: 'text-yellow-600' };
  //   } else {
  //     return { text: '', className: 'text-gray-600' };
  //   }
  // };

  const canJoin = (event: EventWithCreator) => {
    return (
      showJoinButton &&
      currentUserId &&
      event.status === 'open' &&
      event.creatorId !== currentUserId &&
      !event.participants.includes(currentUserId) &&
      event.requiredParticipants > (event.participants ? event.participants.length : 0)
    );
  };

  const isParticipating = (event: EventWithCreator) => {
    return currentUserId && event.participants.includes(currentUserId);
  };

  const getParticipationStatus = (event: EventWithCreator) => {
    if (!currentUserId) return { status: 'unknown', reason: '' };
    
    // 自分が作成したイベント
    if (event.creatorId === currentUserId) {
      return { status: 'owner', reason: '作成者' };
    }
    
    // 既に参加している
    if (event.participants.includes(currentUserId)) {
      return { status: 'participating', reason: '参加済み' };
    }
    
    // ステータスが募集中でない
    if (event.status !== 'open') {
      return { status: 'closed', reason: '募集終了' };
    }
    
    // 必要人数に達している
    const currentParticipants = event.participants ? event.participants.length : 0;
    if (event.requiredParticipants <= currentParticipants) {
      return { status: 'full', reason: '満員' };
    }
    
    // 参加可能
    return { status: 'available', reason: '参加可能' };
  };

  // 優先度に基づく情報レンダリング用のヘルパー関数群
  const getParticipantStatusText = (event: EventWithCreator, includeSelf: boolean = false) => {
    const current = event.participants.length;
    const required = event.requiredParticipants;
    const selfText = includeSelf && currentUserId && isParticipating(event) ? '（あなたを含む）' : '';
    return `${current}/${required}人${selfText}`;
  };

  const getSuccessProbability = (event: EventWithCreator) => {
    const current = event.participants.length;
    const required = event.requiredParticipants;
    const remaining = required - current;
    
    if (remaining <= 0) return { text: '成立条件達成', color: 'text-green-600', urgent: false };
    if (remaining === 1) return { text: 'あと1人で成立', color: 'text-orange-600', urgent: true };
    if (remaining <= 2) return { text: `あと${remaining}人で成立`, color: 'text-yellow-600', urgent: false };
    return { text: `あと${remaining}人必要`, color: 'text-gray-600', urgent: false };
  };

  const getDeadlineUrgency = (event: EventWithCreator) => {
    if (!event.deadline) return { urgent: false, text: '期限なし', color: 'text-gray-500' };
    
    const now = new Date();
    const deadline = new Date(event.deadline);
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (timeDiff <= 0) return { urgent: true, text: '期限切れ', color: 'text-red-600' };
    if (hoursDiff <= 24) return { urgent: true, text: '24時間以内', color: 'text-red-600' };
    if (hoursDiff <= 72) return { urgent: true, text: '3日以内', color: 'text-orange-600' };
    return { urgent: false, text: formatDateTime(deadline), color: 'text-gray-600' };
  };

  // 将来のレスポンシブ対応用
  // const shouldShowInfo = (infoType: string, priority: number, screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
  //   // レスポンシブ対応: 画面サイズに応じて表示する優先度を制限
  //   const maxPriority = screenSize === 'mobile' ? 1 : screenSize === 'tablet' ? 2 : 3;
  //   return priority <= maxPriority;
  // };

  // 優先度に基づく情報要素のレンダリング
  const renderPriorityInfo = (event: EventWithCreator) => {
    const urgentDeadline = getDeadlineUrgency(event);
    const successProb = getSuccessProbability(event);
    
    return (
      <div className="space-y-3">
        {/* 優先度1: 最重要情報 */}
        <div className="space-y-2">
          {/* イベント名（常に優先度1） */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className={`text-xl font-bold text-gray-900 ${onEventClick ? 'cursor-pointer hover:text-blue-600' : ''}`}
                onClick={() => onEventClick?.(event)}>
              {event.name}
            </h3>
            {getStatusBadge(event.status)}
          </div>

          {/* displayModeに応じた優先度1情報 */}
          {displayMode === 'created' && (
            <div className="flex items-center gap-4 text-lg">
              <span className="font-semibold text-gray-700">
                参加状況: <span className="text-blue-600">{getParticipantStatusText(event)}</span>
              </span>
              {successProb.urgent && (
                <span className={`font-semibold ${successProb.color}`}>{successProb.text}</span>
              )}
            </div>
          )}

          {displayMode === 'participating' && (
            <div className="space-y-3">
              {/* 概要 */}
              <p className="text-gray-700 text-lg leading-relaxed font-medium">{event.description}</p>
              
              {/* 参加済み表示と実施期間（目立たせる） */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-green-700">参加済み</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">実施期間:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatDate(event.periodStart)} 〜 {formatDate(event.periodEnd)}
                  </span>
                </div>
              </div>
              
              {/* その他の情報 */}
              <div className="flex items-center gap-6 flex-wrap text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">必要日数:</span>
                  <span className="font-semibold">{event.requiredDays}日</span>
                </div>
                {event.deadline && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">締切:</span>
                    <span className="font-semibold">{formatDateTime(event.deadline)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {displayMode === 'completed' && event.matchedTimeSlots && event.matchedTimeSlots.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">確定日程:</span>
                <span className="text-lg font-bold">
                  {formatMatchedSchedule(event)}
                </span>
              </div>
            </div>
          )}

          {(displayMode === 'available' || displayMode === 'allEvents') && (
            <div className="space-y-3">
              {/* 概要（優先度2） */}
              <p className="text-gray-700 text-lg leading-relaxed font-medium">{event.description}</p>
              
              {/* 第1列: 締切、必要日数、参加状況（条件付き表示） */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">締切:</span>
                  <span className={`text-base font-bold ${urgentDeadline.color}`}>
                    {urgentDeadline.text}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">必要日数:</span>
                  <span className="text-base font-bold text-blue-600">{event.requiredDays}日</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">募集人数:</span>
                  <span className="text-base font-bold text-purple-600">{event.requiredParticipants}人</span>
                </div>
              </div>

              {/* 第2列: 実施期間、作成日 */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">実施期間:</span>
                  <span className="text-base font-bold text-gray-600">
                    {formatDate(event.periodStart)} 〜 {formatDate(event.periodEnd)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">作成日:</span>
                  <span className="text-base font-bold text-gray-600">{formatDate(event.createdAt)}</span>
                </div>
              </div>

              {/* 全イベント表示時：自分の参加ステータス */}
              {displayMode === 'allEvents' && (
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-700">あなたの状況:</span>
                  {(() => {
                    const status = getParticipationStatus(event);
                    const statusColors: Record<string, string> = {
                      owner: 'text-purple-600',
                      participating: 'text-green-600', 
                      available: 'text-blue-600',
                      full: 'text-orange-600',
                      closed: 'text-red-600',
                      unknown: 'text-gray-600'
                    };
                    return (
                      <span className={`text-base font-bold ${statusColors[status.status] || 'text-gray-600'}`}>
                        {status.reason}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 優先度2: 重要情報（タブレット以上で表示） */}
        <div className="hidden md:block space-y-2 text-sm text-gray-600">
          {displayMode === 'created' && (
            <div className="flex items-center gap-4">
              <span>締切: <span className={urgentDeadline.color}>{urgentDeadline.text}</span></span>
              {!successProb.urgent && (
                <span className={successProb.color}>{successProb.text}</span>
              )}
            </div>
          )}
        </div>

        {/* 参加者表示（自分が作成したイベントと完了済みイベントのみ） */}
        {(displayMode === 'completed' || displayMode === 'created') && (
          <div className="hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">参加メンバー:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 作成者表示 */}
              <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border-2 border-purple-200">
                {event.creatorId}
                <span className="ml-1 text-xs">👑</span>
                {event.creatorId === currentUserId && ' (あなた)'}
              </span>
              
              {/* 参加者表示（作成者を除く） */}
              {event.participants && event.participants.length > 0 && 
                event.participants
                  .filter(participantId => participantId !== event.creatorId)
                  .map((participantId) => (
                    <span 
                      key={participantId}
                      className={`px-3 py-1 rounded-full text-sm ${
                        participantId === currentUserId 
                          ? 'bg-green-200 text-green-800 font-semibold border-2 border-green-400' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {participantId}
                      {participantId === currentUserId && ' (あなた)'}
                    </span>
                  ))
              }
            </div>
          </div>
        )}

        {/* 優先度3: 補助情報（デスクトップのみ） */}
        <div className="hidden lg:block text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-4">
            {displayMode !== 'available' && displayMode !== 'allEvents' && displayMode !== 'participating' && (
              <span>作成日: {formatDate(event.createdAt)}</span>
            )}
            {displayMode !== 'available' && displayMode !== 'allEvents' && displayMode !== 'participating' && (
              <span>実施期間: {formatDate(event.periodStart)} ～ {formatDate(event.periodEnd)}</span>
            )}
          </div>
        </div>

        {/* 参加ボタン（availableモードと全イベントモード） */}
        {(displayMode === 'available' || displayMode === 'allEvents') && showJoinButton && canJoin(event) && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => handleJoinButtonClick(event)}
              disabled={loadingEventIds.has(event.id)}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loadingEventIds.has(event.id) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  参加中...
                </>
              ) : (
                '参加する'
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // 将来の拡張用（現在はrenderPriorityInfo内で直接実装）
  // 各displayModeに応じた優先度設定は renderPriorityInfo 内で直接実装済み

  // 将来の詳細表示機能用（現在は使用しない）
  // const renderDetailedInfo = (event: EventWithCreator) => {
  //   return (
  //     <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
  //       <h4 className="font-semibold text-lg text-gray-900 mb-3">詳細情報</h4>
  //       ...
  //     </div>
  //   );
  // };

  // 新しい優先度ベースのイベントカードレンダリング
  const renderEventCard = (event: EventWithCreator) => {
    const statusConfig = getStatusConfig(event.status);

    return (
      <div
        key={event.id}
        className={`bg-white shadow-md rounded-lg p-6 border-2 hover:shadow-lg transition-all duration-200 ${statusConfig.cardClass}`}
      >
        {renderPriorityInfo(event)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {events.map((event) => renderEventCard(event))}
    </div>
  );
}