// 🔵 Refactor Phase: Improved Create Event Form with Component Separation
'use client';

import React, { useState } from 'react';
import { CreateEventRequest } from '@/types/event';
import { useCreateEventForm } from '@/hooks/useCreateEventForm';
import { BasicSettingsSection } from './form-sections/BasicSettingsSection';
import { MatchingStrategySection } from './form-sections/MatchingStrategySection';
import { ParticipantSelectionSection } from './form-sections/ParticipantSelectionSection';
import { AdvancedConditionsSection } from './form-sections/AdvancedConditionsSection';
import { NotificationSection } from './form-sections/NotificationSection';

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const {
    formData,
    deadlineDate,
    periodStartDate,
    periodEndDate,
    validationErrors,
    isFormValid,
    handleFieldChange,
    handleDeadlineDateChange,
    handlePeriodStartDateChange,
    handlePeriodEndDateChange,
    handleDiscordSettingChange,
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

        {/* 詳細設定の折りたたみボタン */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded border cursor-pointer transition-colors"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? '詳細設定を非表示' : '詳細設定を表示'}
          </button>
        </div>

        {/* 詳細設定セクション */}
        {showAdvanced && (
          <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
            {/* Phase 1: マッチング戦略設定 */}
            <MatchingStrategySection
              formData={{
                matchingStrategy: formData.matchingStrategy,
                timeSlotRestriction: formData.timeSlotRestriction,
                minimumConsecutive: formData.minimumConsecutive,
              }}
              onFieldChange={handleFieldChange}
            />

            {/* Phase 2: 参加者選択戦略設定 */}
            <ParticipantSelectionSection
              formData={{
                participantSelectionStrategy: formData.participantSelectionStrategy,
                minParticipants: formData.minParticipants,
                maxParticipants: formData.maxParticipants,
                optimalParticipants: formData.optimalParticipants,
                lotterySeed: formData.lotterySeed,
              }}
              validationErrors={validationErrors}
              onFieldChange={handleFieldChange}
            />

            {/* Phase 3: 成立条件詳細設定 */}
            <AdvancedConditionsSection
              formData={{
                allowPartialMatching: formData.allowPartialMatching,
                minimumTimeSlots: formData.minimumTimeSlots,
                suggestMultipleOptions: formData.suggestMultipleOptions,
                maxSuggestions: formData.maxSuggestions,
                requireAllParticipants: formData.requireAllParticipants,
              }}
              validationErrors={validationErrors}
              onFieldChange={handleFieldChange}
            />

            {/* Phase 4: 確認・通知システム設定 */}
            <NotificationSection
              formData={{
                requireCreatorConfirmation: formData.requireCreatorConfirmation,
                requireParticipantConfirmation: formData.requireParticipantConfirmation,
                confirmationMode: formData.confirmationMode,
                minimumConfirmations: formData.minimumConfirmations,
                confirmationTimeout: formData.confirmationTimeout,
                gracePeriod: formData.gracePeriod,
                discordNotificationSettings: formData.discordNotificationSettings,
              }}
              onFieldChange={handleFieldChange}
              onDiscordSettingChange={handleDiscordSettingChange}
            />
          </div>
        )}

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