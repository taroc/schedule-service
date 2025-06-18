'use client';

import { useState } from 'react';
import { EventPriority } from '@/types/event';

interface JoinEventModalProps {
  isOpen: boolean;
  eventName: string;
  onClose: () => void;
  onJoin: (priority: EventPriority) => void;
  isLoading?: boolean;
}

export default function JoinEventModal({
  isOpen,
  eventName,
  onClose,
  onJoin,
  isLoading = false
}: JoinEventModalProps) {
  const [selectedPriority, setSelectedPriority] = useState<EventPriority>('medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(selectedPriority);
  };

  const getPriorityDescription = (priority: EventPriority) => {
    const descriptions = {
      'high': '他のイベントよりも優先してこのイベントに参加したい',
      'medium': '標準的な優先度でこのイベントに参加したい',
      'low': '他のイベントと重複した場合は後回しでも良い'
    };
    return descriptions[priority];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          イベント参加
        </h2>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            <span className="font-medium">イベント:</span> {eventName}
          </p>
          <p className="text-sm text-gray-600">
            このイベントへの参加優先度を選択してください。他のイベントと日程が重複した場合の優先順位に影響します。
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-3">
              参加優先度 *
            </label>
            <div className="space-y-3">
              {(['high', 'medium', 'low'] as const).map((priority) => (
                <label
                  key={priority}
                  className="flex items-start cursor-pointer"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority}
                    checked={selectedPriority === priority}
                    onChange={(e) => setSelectedPriority(e.target.value as EventPriority)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {priority === 'high' && '高'}
                        {priority === 'medium' && '中'}
                        {priority === 'low' && '低'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                        priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {priority === 'high' && '高'}
                        {priority === 'medium' && '中'}
                        {priority === 'low' && '低'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {getPriorityDescription(priority)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '参加中...' : '参加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}