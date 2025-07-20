// 🔵 Refactor Phase: Improved Create Event Form with Component Separation
'use client';

import React from 'react';
import { CreateEventRequest } from '@/types/event';
import { useCreateEventForm } from '@/hooks/useCreateEventForm';
import { BasicSettingsSection } from './form-sections/BasicSettingsSection';

interface CreateEventFormEnhancedProps {
  onSubmit: (event: CreateEventRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function CreateEventFormEnhanced({
  onSubmit,
  onCancel,
  isLoading = false,
  error
}: CreateEventFormEnhancedProps) {
  
  const {
    formData,
    deadlineDate,
    periodStartDate,
    periodEndDate,
    isFormValid,
    handleFieldChange,
    handleDeadlineDateChange,
    handlePeriodStartDateChange,
    handlePeriodEndDateChange,
  } = useCreateEventForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      return;
    }
    await onSubmit(formData);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">イベント作成</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 基本設定セクション */}
        <BasicSettingsSection
          formData={{
            name: formData.name,
            description: formData.description,
            requiredParticipants: formData.requiredParticipants,
            requiredTimeSlots: formData.requiredTimeSlots,
          }}
          deadlineDate={deadlineDate}
          periodStartDate={periodStartDate}
          periodEndDate={periodEndDate}
          onFieldChange={handleFieldChange}
          onDeadlineDateChange={handleDeadlineDateChange}
          onPeriodStartDateChange={handlePeriodStartDateChange}
          onPeriodEndDateChange={handlePeriodEndDateChange}
        />



        {/* フォーム送信ボタン */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded cursor-pointer disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '作成中...' : 'イベント作成'}
          </button>
        </div>
      </form>
    </div>
  );
}