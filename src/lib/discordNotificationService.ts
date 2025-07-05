import { Event, DiscordNotificationSettings } from '@/types/event';

// 🔵 Refactor Phase: 型安全性とエラーハンドリングの改善
export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  webhookUrl?: string;
  timestamp: Date;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

class DiscordNotificationService {
  private readonly defaultWebhookUrl: string | undefined;

  constructor() {
    this.defaultWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }

  /**
   * 🔵 Refactor Phase: イベント成立時の通知送信（改善版）
   */
  async sendMatchingNotification(
    event: Event,
    matchedTimeSlots: { date: Date; timeSlot: 'daytime' | 'evening' }[]
  ): Promise<NotificationResult> {
    const timestamp = new Date();
    const settings = event.discordNotificationSettings;
    
    if (!settings.enabled || !settings.notifyOnMatching) {
      return {
        success: false,
        error: 'Discord notifications disabled',
        timestamp
      };
    }

    const webhookUrl = this.getWebhookUrl(settings, 'matching');
    if (!webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
        timestamp
      };
    }

    const embed = this.createMatchingEmbed(event, matchedTimeSlots);
    const payload: DiscordWebhookPayload = {
      content: this.getMentionString(settings.mentionRoles),
      embeds: [embed]
    };

    const result = await this.sendWebhook(webhookUrl, payload);
    return {
      success: result,
      webhookUrl,
      timestamp,
      error: result ? undefined : 'Failed to send webhook'
    };
  }

  /**
   * 🔴 Red Phase: 確認要求時の通知送信
   */
  async sendConfirmationRequest(
    event: Event,
    targetUsers: string[],
    confirmationType: 'creator' | 'participant'
  ): Promise<boolean> {
    const settings = event.discordNotificationSettings;
    
    if (!settings.enabled || !settings.notifyOnConfirmationRequired) {
      return false;
    }

    const webhookUrl = this.getWebhookUrl(settings, 'confirmation');
    if (!webhookUrl) {
      return false;
    }

    const embed = this.createConfirmationEmbed(event, targetUsers, confirmationType);
    const payload: DiscordWebhookPayload = {
      content: this.getMentionString(settings.mentionRoles),
      embeds: [embed]
    };

    return await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * 🔴 Red Phase: 締切接近時のリマインダー送信
   */
  async sendDeadlineReminder(
    event: Event,
    minutesRemaining: number
  ): Promise<boolean> {
    const settings = event.discordNotificationSettings;
    
    if (!settings.enabled || !settings.notifyOnDeadlineApproaching) {
      return false;
    }

    const webhookUrl = this.getWebhookUrl(settings, 'deadline');
    if (!webhookUrl) {
      return false;
    }

    const embed = this.createDeadlineReminderEmbed(event, minutesRemaining);
    const payload: DiscordWebhookPayload = {
      content: this.getMentionString(settings.mentionRoles),
      embeds: [embed]
    };

    return await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * 🔴 Red Phase: キャンセル通知送信
   */
  async sendCancellationNotice(
    event: Event,
    reason: string
  ): Promise<boolean> {
    const settings = event.discordNotificationSettings;
    
    if (!settings.enabled || !settings.notifyOnCancellation) {
      return false;
    }

    const webhookUrl = this.getWebhookUrl(settings, 'cancellation');
    if (!webhookUrl) {
      return false;
    }

    const embed = this.createCancellationEmbed(event, reason);
    const payload: DiscordWebhookPayload = {
      content: this.getMentionString(settings.mentionRoles),
      embeds: [embed]
    };

    return await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * 🔴 Red Phase: 確認受信通知送信
   */
  async sendConfirmationReceived(
    event: Event,
    userId: string,
    confirmationType: 'creator' | 'participant'
  ): Promise<boolean> {
    const settings = event.discordNotificationSettings;
    
    if (!settings.enabled || !settings.notifyOnConfirmationReceived) {
      return false;
    }

    const webhookUrl = this.getWebhookUrl(settings, 'confirmation');
    if (!webhookUrl) {
      return false;
    }

    const embed = this.createConfirmationReceivedEmbed(event, userId, confirmationType);
    const payload: DiscordWebhookPayload = {
      embeds: [embed]
    };

    return await this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Webhook URLを取得（チャンネル別設定考慮）
   */
  private getWebhookUrl(
    settings: DiscordNotificationSettings,
    eventType: 'matching' | 'deadline' | 'confirmation' | 'cancellation'
  ): string | undefined {
    // チャンネル別設定をチェック
    const override = settings.channelOverrides?.find(
      override => override.eventType === eventType
    );
    
    if (override?.webhookUrl) {
      return override.webhookUrl;
    }

    // デフォルトWebhook URLまたは設定されたWebhook URL
    return settings.webhookUrl || this.defaultWebhookUrl;
  }

  /**
   * メンション文字列を生成
   */
  private getMentionString(roleIds?: string[]): string | undefined {
    if (!roleIds || roleIds.length === 0) {
      return undefined;
    }

    return roleIds.map(roleId => `<@&${roleId}>`).join(' ');
  }

  /**
   * 🔴 Red Phase: マッチング成立用埋め込み作成
   */
  private createMatchingEmbed(
    event: Event,
    matchedTimeSlots: { date: Date; timeSlot: 'daytime' | 'evening' }[]
  ): DiscordEmbed {
    const customMessage = event.customMessages?.matchingNotification;
    const title = customMessage?.replace('{{eventName}}', event.name) || 
                  `🎉 イベント「${event.name}」が成立しました！`;

    const timeSlotText = matchedTimeSlots
      .map(ts => {
        const dateStr = ts.date.toLocaleDateString('ja-JP');
        const timeStr = ts.timeSlot === 'daytime' ? '昼間' : '夜間';
        return `${dateStr} (${timeStr})`;
      })
      .join('\n');

    return {
      title,
      description: event.description,
      color: this.parseColor(event.customMessages?.discordEmbedColor) || 0x00ff00, // デフォルト緑
      fields: [
        {
          name: '📅 確定日程',
          value: timeSlotText,
          inline: false
        },
        {
          name: '👥 参加者数',
          value: `${event.participants.length}名`,
          inline: true
        },
        {
          name: '⏰ 必要コマ数',
          value: `${event.requiredTimeSlots}コマ`,
          inline: true
        }
      ],
      footer: {
        text: 'スケジュール調整サービス'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔴 Red Phase: 確認要求用埋め込み作成
   */
  private createConfirmationEmbed(
    event: Event,
    targetUsers: string[],
    confirmationType: 'creator' | 'participant'
  ): DiscordEmbed {
    const customMessage = event.customMessages?.confirmationRequest;
    const title = customMessage?.replace('{{eventName}}', event.name) || 
                  `⚠️ 確認要求：「${event.name}」`;

    const confirmationText = confirmationType === 'creator' 
      ? '作成者による最終確認が必要です'
      : `参加者${targetUsers.length}名の確認が必要です`;

    return {
      title,
      description: confirmationText,
      color: this.parseColor(event.customMessages?.discordEmbedColor) || 0xffaa00, // デフォルトオレンジ
      fields: [
        {
          name: '📝 イベント詳細',
          value: event.description,
          inline: false
        },
        {
          name: '⏰ 確認期限',
          value: event.confirmationDeadline?.toLocaleString('ja-JP') || '未設定',
          inline: true
        },
        {
          name: '👥 対象者数',
          value: `${targetUsers.length}名`,
          inline: true
        }
      ],
      footer: {
        text: 'スケジュール調整サービス'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔴 Red Phase: 締切リマインダー用埋め込み作成
   */
  private createDeadlineReminderEmbed(
    event: Event,
    minutesRemaining: number
  ): DiscordEmbed {
    const timeText = minutesRemaining >= 60 
      ? `${Math.floor(minutesRemaining / 60)}時間${minutesRemaining % 60}分`
      : `${minutesRemaining}分`;

    const customMessage = event.customMessages?.reminderMessage;
    const title = customMessage?.replace('{{eventName}}', event.name) || 
                  `⏰ 締切接近：「${event.name}」`;

    return {
      title,
      description: `参加締切まで残り${timeText}です`,
      color: this.parseColor(event.customMessages?.discordEmbedColor) || 0xff6600, // デフォルトオレンジ
      fields: [
        {
          name: '📅 現在の参加者数',
          value: `${event.participants.length}/${event.requiredParticipants}名`,
          inline: true
        },
        {
          name: '⏰ 締切時間',
          value: event.deadline.toLocaleString('ja-JP'),
          inline: true
        }
      ],
      footer: {
        text: 'スケジュール調整サービス'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔴 Red Phase: キャンセル通知用埋め込み作成
   */
  private createCancellationEmbed(
    event: Event,
    reason: string
  ): DiscordEmbed {
    const customMessage = event.customMessages?.cancellationNotice;
    const title = customMessage?.replace('{{eventName}}', event.name) || 
                  `❌ イベントキャンセル：「${event.name}」`;

    return {
      title,
      description: `イベントがキャンセルされました。\n理由: ${reason}`,
      color: this.parseColor(event.customMessages?.discordEmbedColor) || 0xff0000, // デフォルト赤
      fields: [
        {
          name: '📝 元の詳細',
          value: event.description,
          inline: false
        }
      ],
      footer: {
        text: 'スケジュール調整サービス'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔴 Red Phase: 確認受信通知用埋め込み作成
   */
  private createConfirmationReceivedEmbed(
    event: Event,
    userId: string,
    confirmationType: 'creator' | 'participant'
  ): DiscordEmbed {
    const confirmationText = confirmationType === 'creator' 
      ? `作成者(${userId})が確認しました`
      : `参加者(${userId})が確認しました`;

    return {
      title: `✅ 確認受信：「${event.name}」`,
      description: confirmationText,
      color: this.parseColor(event.customMessages?.discordEmbedColor) || 0x00aa00, // デフォルト緑
      footer: {
        text: 'スケジュール調整サービス'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 色文字列をDiscordの数値形式に変換
   */
  private parseColor(colorString?: string): number | undefined {
    if (!colorString) return undefined;
    
    // #ffffffまたは0xffffff形式をサポート
    const cleanColor = colorString.replace(/^#/, '');
    const parsed = parseInt(cleanColor, 16);
    
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * 🔴 Red Phase: Discord Webhookへの送信
   */
  private async sendWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Discord webhook error:', error);
      return false;
    }
  }

  /**
   * 🔴 Red Phase: リマインダーチェック（Cronジョブ用）
   */
  async checkAndSendReminders(): Promise<void> {
    // 実装は🟢 Green Phaseで行う
    // この段階では型定義とインターフェースのみ
    console.log('🔴 Red Phase: checkAndSendReminders not implemented yet');
  }
}

export const discordNotificationService = new DiscordNotificationService();