'use client';

import { EventWithCreator } from '@/types/event';

interface EventListProps {
  events: EventWithCreator[];
  isLoading?: boolean;
  onEventClick?: (event: EventWithCreator) => void;
  onJoinEvent?: (eventId: string) => void;
  currentUserId?: string;
  showJoinButton?: boolean;
  emptyMessage?: string;
}

export default function EventList({
  events,
  isLoading = false,
  onEventClick,
  onJoinEvent,
  currentUserId,
  showJoinButton = false,
  emptyMessage = 'イベントがありません'
}: EventListProps) {
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
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${config.badgeClass}`}>
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

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const statusConfig = getStatusConfig(event.status);
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
            <div className="col-span-2">
              <span className="font-medium">参加締切:</span>{' '}
              {event.deadline ? (
                (() => {
                  const deadline = event.deadline instanceof Date ? event.deadline : new Date(event.deadline);
                  const deadlineStatus = getDeadlineStatus(deadline);
                  return (
                    <span className={deadlineStatus.className}>
                      {formatDateTime(deadline)}
                      {deadlineStatus.text && (
                        <span className="ml-2 text-xs font-semibold">
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
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">参加者:</span> {event.participants.length}人
              {isParticipating(event) && (
                <span className="ml-2 text-blue-600 font-medium">（参加中）</span>
              )}
              {event.participants && event.participants.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  参加者ID: {event.participants.join(', ')}
                </div>
              )}
            </div>

            {event.status === 'matched' && event.matchedDates && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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

            {canJoin(event) && (
              <div className="flex justify-end">
                <button
                  onClick={() => onJoinEvent?.(event.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  参加する
                </button>
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}