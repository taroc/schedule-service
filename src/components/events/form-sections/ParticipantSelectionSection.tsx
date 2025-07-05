// 🔵 Refactor Phase: Participant Selection Section Component
import React from 'react';
import type { ParticipantSelectionStrategy } from '@/types/event';

interface ParticipantSelectionSectionProps {
  formData: {
    participantSelectionStrategy: ParticipantSelectionStrategy;
    minParticipants: number;
    maxParticipants?: number;
    optimalParticipants?: number;
    lotterySeed?: number;
  };
  validationErrors: Record<string, string>;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const ParticipantSelectionSection: React.FC<ParticipantSelectionSectionProps> = ({
  formData,
  validationErrors,
  onFieldChange,
}) => {
  return (
    <div className="p-4 border border-blue-200 rounded-md bg-blue-50">
      <h3 className="text-lg font-semibold mb-4 text-blue-800">参加者選択戦略設定</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="participantSelectionStrategy" className="block text-gray-700 text-sm font-bold mb-2">
            参加者選択方法
          </label>
          <select
            id="participantSelectionStrategy"
            name="participantSelectionStrategy"
            value={formData.participantSelectionStrategy}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="first_come">先着順</option>
            <option value="lottery">抽選</option>
            <option value="balanced">バランス重視</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            参加者が定員を超えた場合の選択方法
          </p>
        </div>

        <div>
          <label htmlFor="minParticipants" className="block text-gray-700 text-sm font-bold mb-2">
            最低参加者数
          </label>
          <input
            id="minParticipants"
            type="number"
            name="minParticipants"
            value={formData.minParticipants}
            onChange={onFieldChange}
            min="1"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
              validationErrors.minParticipants ? 'border-red-500' : ''
            }`}
            aria-invalid={!!validationErrors.minParticipants}
          />
          {validationErrors.minParticipants && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.minParticipants}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            イベント成立の最低ライン
          </p>
        </div>

        <div>
          <label htmlFor="maxParticipants" className="block text-gray-700 text-sm font-bold mb-2">
            最大参加者数
          </label>
          <input
            id="maxParticipants"
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants || ''}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="制限なし"
          />
          <p className="text-xs text-gray-500 mt-1">
            参加者数の上限（空欄で無制限）
          </p>
        </div>

        <div>
          <label htmlFor="optimalParticipants" className="block text-gray-700 text-sm font-bold mb-2">
            最適参加者数
          </label>
          <input
            id="optimalParticipants"
            type="number"
            name="optimalParticipants"
            value={formData.optimalParticipants || ''}
            onChange={onFieldChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="自動設定"
          />
          <p className="text-xs text-gray-500 mt-1">
            理想的な参加者数
          </p>
        </div>

        {formData.participantSelectionStrategy === 'lottery' && (
          <div className="md:col-span-2">
            <label htmlFor="lotterySeed" className="block text-gray-700 text-sm font-bold mb-2">
              抽選シード値
            </label>
            <input
              id="lotterySeed"
              type="number"
              name="lotterySeed"
              value={formData.lotterySeed || ''}
              onChange={onFieldChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="ランダム"
            />
            <p className="text-xs text-gray-500 mt-1">
              抽選結果を再現可能にするためのシード値（空欄でランダム）
            </p>
          </div>
        )}
      </div>
    </div>
  );
};