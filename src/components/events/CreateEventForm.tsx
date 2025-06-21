'use client';

import { useState, useEffect } from 'react';
import { CreateEventRequest } from '@/types/event';

interface CreateEventFormProps {
  onSubmit: (event: CreateEventRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function CreateEventForm({
  onSubmit,
  onCancel,
  isLoading = false,
  error
}: CreateEventFormProps) {
  const [formData, setFormData] = useState<CreateEventRequest>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    return {
      name: '',
      description: '',
      requiredParticipants: 1,
      requiredDays: 1, // 後方互換性のため保持
      requiredTimeSlots: 1, // 新しい時間帯単位数
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後,
      periodStart: tomorrow,
      periodEnd: twoWeeksLater
    };
  });
  
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    return oneWeekLater.toISOString().split('T')[0];
  });
  const [periodStartDate, setPeriodStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // 明日から
    return today.toISOString().split('T')[0];
  });
  const [periodEndDate, setPeriodEndDate] = useState(() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14); // 2週間後まで
    return endDate.toISOString().split('T')[0];
  });

  // 期限の日付が変更されたときにformDataを更新（23:59に固定）
  useEffect(() => {
    if (deadlineDate) {
      const deadline = new Date(`${deadlineDate}T23:59:59`);
      setFormData(prev => ({ ...prev, deadline }));
    } else {
      setFormData(prev => ({ ...prev, deadline: undefined }));
    }
  }, [deadlineDate]);

  // 期間開始日が変更されたときにformDataを更新
  useEffect(() => {
    if (periodStartDate) {
      const periodStart = new Date(`${periodStartDate}T00:00:00`);
      setFormData(prev => ({ ...prev, periodStart }));
    }
  }, [periodStartDate]);

  // 期間終了日が変更されたときにformDataを更新
  useEffect(() => {
    if (periodEndDate) {
      const periodEnd = new Date(`${periodEndDate}T23:59:59`);
      setFormData(prev => ({ ...prev, periodEnd }));
    }
  }, [periodEndDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };


  const handleDeadlineDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeadlineDate(e.target.value);
  };

  const handlePeriodStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPeriodStartDate(e.target.value);
  };

  const handlePeriodEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPeriodEndDate(e.target.value);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">イベント作成</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            イベント名 *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
            placeholder="例: チーム飲み会"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            イベント概要 *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
            placeholder="イベントの詳細を記載してください"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            必要人数 *
          </label>
          <input
            type="number"
            name="requiredParticipants"
            value={formData.requiredParticipants}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            イベント成立に必要な最低参加者数
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            必要コマ数 *
          </label>
          <input
            type="number"
            name="requiredTimeSlots"
            value={formData.requiredTimeSlots}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            確保したいコマ数（例：2日間の昼間 = 2コマ、半日+夜 = 2コマ）
          </p>
        </div>


        <div className="mb-4 p-4 border border-blue-200 rounded-md bg-blue-50">
          <h3 className="text-sm font-bold text-blue-800 mb-3">実施期間設定 *</h3>
          
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              開始可能日 *
            </label>
            <input
              type="date"
              value={periodStartDate}
              onChange={handlePeriodStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              終了可能日 *
            </label>
            <input
              type="date"
              value={periodEndDate}
              onChange={handlePeriodEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          
          <p className="text-blue-600 text-xs">
            この期間内でユーザーの空き時間と照合して{formData.requiredTimeSlots}単位の時間帯を確保します
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            参加締切日 *
          </label>
          <input
            type="date"
            value={deadlineDate}
            onChange={handleDeadlineDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            参加者の募集を締切る日（その日の23:59まで有効）
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 hover:cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? '作成中...' : 'イベント作成'}
          </button>
        </div>
      </form>
    </div>
  );
}