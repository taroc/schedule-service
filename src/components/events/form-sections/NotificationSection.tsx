// 🔵 Refactor Phase: Notification Section Component
import React from 'react';
import type { ConfirmationMode, DiscordNotificationSettings } from '@/types/event';

interface NotificationSectionProps {
  formData: {
    requireCreatorConfirmation: boolean;
    requireParticipantConfirmation: boolean;
    confirmationMode: ConfirmationMode;
    minimumConfirmations: number;
    confirmationTimeout: number;
    gracePeriod: number;
    discordNotificationSettings: DiscordNotificationSettings;
  };
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onDiscordSettingChange: (key: string, value: any) => void;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  formData,
  onFieldChange,
  onDiscordSettingChange,
}) => {
  return (
    <div className="p-4 border border-orange-200 rounded-md bg-orange-50">
      <h3 className="text-lg font-semibold mb-4 text-orange-800">確認・通知システム設定</h3>
      
      <div className="space-y-6">
        {/* 確認設定 */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">確認システム</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  id="requireCreatorConfirmation"
                  type="checkbox"
                  name="requireCreatorConfirmation"
                  checked={formData.requireCreatorConfirmation}
                  onChange={onFieldChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="requireCreatorConfirmation" className="text-gray-700 text-sm font-bold">
                    作成者確認を必須にする
                  </label>
                  <p className="text-xs text-gray-500">
                    マッチング後に作成者の最終確認を求める
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="requireParticipantConfirmation"
                  type="checkbox"
                  name="requireParticipantConfirmation"
                  checked={formData.requireParticipantConfirmation}
                  onChange={onFieldChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="requireParticipantConfirmation" className="text-gray-700 text-sm font-bold">
                    参加者確認を必須にする
                  </label>
                  <p className="text-xs text-gray-500">
                    参加者からの確認を必要とする
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="confirmationTimeout" className="block text-gray-700 text-sm font-bold mb-2">
                  確認タイムアウト（分）
                </label>
                <input
                  id="confirmationTimeout"
                  type="number"
                  name="confirmationTimeout"
                  value={formData.confirmationTimeout}
                  onChange={onFieldChange}
                  min="5"
                  max="1440"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  確認の制限時間（5-1440分）
                </p>
              </div>

              <div>
                <label htmlFor="gracePeriod" className="block text-gray-700 text-sm font-bold mb-2">
                  猶予期間（分）
                </label>
                <input
                  id="gracePeriod"
                  type="number"
                  name="gracePeriod"
                  value={formData.gracePeriod}
                  onChange={onFieldChange}
                  min="0"
                  max="180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  タイムアウト後の追加猶予時間
                </p>
              </div>
            </div>
          </div>

          {formData.requireParticipantConfirmation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-orange-200">
              <div>
                <label htmlFor="confirmationMode" className="block text-gray-700 text-sm font-bold mb-2">
                  確認モード
                </label>
                <select
                  id="confirmationMode"
                  name="confirmationMode"
                  value={formData.confirmationMode}
                  onChange={onFieldChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="creator_only">作成者のみ</option>
                  <option value="all">全員</option>
                  <option value="majority">過半数</option>
                  <option value="minimum_count">最小数</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  どの程度の確認で成立とするか
                </p>
              </div>

              <div>
                <label htmlFor="minimumConfirmations" className="block text-gray-700 text-sm font-bold mb-2">
                  必要確認数
                </label>
                <input
                  id="minimumConfirmations"
                  type="number"
                  name="minimumConfirmations"
                  value={formData.minimumConfirmations}
                  onChange={onFieldChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  最小確認数モード時の必要数
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Discord通知設定 */}
        <div className="space-y-4 pt-4 border-t border-orange-200">
          <h4 className="font-semibold text-gray-700">Discord通知設定</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  id="discordEnabled"
                  type="checkbox"
                  checked={formData.discordNotificationSettings?.enabled}
                  onChange={(e) => onDiscordSettingChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="discordEnabled" className="text-gray-700 text-sm font-bold">
                    Discord通知を有効にする
                  </label>
                  <p className="text-xs text-gray-500">
                    イベント状況をDiscordで通知
                  </p>
                </div>
              </div>

              {formData.discordNotificationSettings?.enabled && (
                <>
                  <div className="flex items-center space-x-3">
                    <input
                      id="notifyOnMatching"
                      type="checkbox"
                      checked={formData.discordNotificationSettings?.notifyOnMatching}
                      onChange={(e) => onDiscordSettingChange('notifyOnMatching', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notifyOnMatching" className="text-gray-700 text-sm">
                      マッチング成立時
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      id="notifyOnDeadlineApproaching"
                      type="checkbox"
                      checked={formData.discordNotificationSettings?.notifyOnDeadlineApproaching}
                      onChange={(e) => onDiscordSettingChange('notifyOnDeadlineApproaching', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notifyOnDeadlineApproaching" className="text-gray-700 text-sm">
                      締切接近時
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      id="notifyOnConfirmationRequired"
                      type="checkbox"
                      checked={formData.discordNotificationSettings?.notifyOnConfirmationRequired}
                      onChange={(e) => onDiscordSettingChange('notifyOnConfirmationRequired', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notifyOnConfirmationRequired" className="text-gray-700 text-sm">
                      確認要求時
                    </label>
                  </div>
                </>
              )}
            </div>

            {formData.discordNotificationSettings?.enabled && (
              <div>
                <label htmlFor="webhookUrl" className="block text-gray-700 text-sm font-bold mb-2">
                  Webhook URL
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  value={formData.discordNotificationSettings?.webhookUrl || ''}
                  onChange={(e) => onDiscordSettingChange('webhookUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Discord Webhook URLを入力
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};