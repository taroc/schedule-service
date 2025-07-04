'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EventWithCreator } from '@/types/event';


export default function MatchingStatus() {
  const { token } = useAuth();
  const [matchedEvents, setMatchedEvents] = useState<EventWithCreator[]>([]);
  const [loading, setLoading] = useState(true);


  const fetchMatchedEvents = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMatchedEvents();
    }
  }, [token, fetchMatchedEvents]);


  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          成立イベントを読み込み中...
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ja-JP');
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


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={fetchMatchedEvents}
          disabled={loading}
          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
        >
          <svg className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          更新
        </button>
      </div>

      {loading ? (
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
              className="bg-green-50 border-2 border-green-200 rounded-lg p-6"
            >
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {event.name}
                  </h4>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-green-100 text-green-800 border-green-200">
                    成立済み
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{event.description}</p>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">参加者:</span>
                    <span className="font-medium">
                      {event.creatorId} (主催者){event.participants.filter(p => p !== event.creatorId).length > 0 && ', '}{event.participants.filter(p => p !== event.creatorId).join(', ')}
                    </span>
                  </div>
                </div>

                {event.matchedTimeSlots && event.matchedTimeSlots.length > 0 && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">成立日程:</span>
                      <span className="font-medium">
                        {formatMatchedSchedule(event)}
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
  );
}