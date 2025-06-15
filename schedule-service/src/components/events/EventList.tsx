'use client';

import { EventWithCreator } from '@/types/event';

interface EventListProps {
  events: EventWithCreator[];
  isLoading?: boolean;
  onEventClick?: (event: EventWithCreator) => void;
  onJoinEvent?: (eventId: string) => void;
  currentUserId?: string;
  showJoinButton?: boolean;
}

export default function EventList({
  events,
  isLoading = false,
  onEventClick,
  onJoinEvent,
  currentUserId,
  showJoinButton = false
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
        イベントがありません
      </div>
    );
  }

  const getStatusBadge = (status: EventWithCreator['status']) => {
    const statusConfig = {
      open: { text: '募集中', className: 'bg-green-100 text-green-800' },
      matched: { text: '成立済み', className: 'bg-blue-100 text-blue-800' },
      cancelled: { text: 'キャンセル', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP');
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
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-white shadow-md rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow"
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
              <span className="font-medium">作成者:</span> {event.creatorName}
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
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">参加者:</span> {event.participants.length}人
              {isParticipating(event) && (
                <span className="ml-2 text-blue-600 font-medium">（参加中）</span>
              )}
              {event.participantNames && event.participantNames.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {event.participantNames.join(', ')}
                </div>
              )}
            </div>

            {event.status === 'matched' && event.matchedDates && (
              <div className="text-sm text-blue-600">
                <span className="font-medium">成立日程:</span>{' '}
                {event.matchedDates.map(date => formatDate(date)).join(', ')}
              </div>
            )}

            {canJoin(event) && (
              <button
                onClick={() => onJoinEvent?.(event.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                参加する
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}