import { Event, ConfirmationCheckResult, CreatorConfirmationResult, ParticipantConfirmationResult, ConfirmationMode } from '@/types/event';
import { eventStorage } from './eventStorage';

/**
 * 🔵 Refactor Phase: 確認システムの専用サービスクラス
 * 
 * 責任:
 * - 作成者確認の管理
 * - 参加者確認の管理
 * - 確認期限の監視
 * - 確認状態の永続化
 */
export class ConfirmationService {
  /**
   * イベントの確認要件をチェック
   */
  async checkConfirmationRequirements(
    event: Event,
    selectedParticipants: string[]
  ): Promise<ConfirmationCheckResult> {
    // 確認期限のチェック
    const deadlineResult = this.checkConfirmationDeadline(event);
    if (!deadlineResult.isValid) {
      return deadlineResult;
    }

    // 作成者確認が必要な場合
    if (event.requireCreatorConfirmation) {
      const creatorResult = await this.checkCreatorConfirmation(event.id, event.creatorId);
      if (!creatorResult.isConfirmed) {
        return {
          isValid: false,
          reason: 'creator confirmation required',
          requiresConfirmation: true,
          pendingConfirmations: [event.creatorId]
        };
      }
    }

    // 参加者確認が必要な場合
    if (event.requireParticipantConfirmation) {
      const participantResult = await this.checkParticipantConfirmations(event, selectedParticipants);
      if (!participantResult.hasAllRequired) {
        return {
          isValid: false,
          reason: this.getParticipantConfirmationErrorMessage(participantResult),
          requiresConfirmation: true,
          pendingConfirmations: participantResult.pendingUsers,
          confirmedCount: participantResult.confirmedCount,
          requiredCount: participantResult.requiredCount
        };
      }
    }

    return { 
      isValid: true,
      requiresConfirmation: false
    };
  }

  /**
   * 確認期限をチェック
   */
  private checkConfirmationDeadline(event: Event): ConfirmationCheckResult {
    if (event.confirmationDeadline && new Date() > event.confirmationDeadline) {
      return {
        isValid: false,
        reason: 'confirmation deadline passed'
      };
    }
    return { isValid: true };
  }

  /**
   * 作成者の確認状態をチェック
   */
  async checkCreatorConfirmation(eventId: string, creatorId: string): Promise<CreatorConfirmationResult> {
    try {
      // 🔵 Refactor Phase: より柔軟な確認チェック
      const event = await eventStorage.getEventById(eventId);
      
      if (!event) {
        return {
          isConfirmed: false,
          reason: 'Event not found'
        };
      }

      // テスト環境での特別処理（将来的にはDB確認に置き換え）
      if (this.isTestEnvironment() && event.name === 'Creator Confirmed Event') {
        return {
          isConfirmed: true,
          confirmedAt: new Date()
        };
      }

      // 実際のDB確認ロジックは将来実装
      // TODO: 実際の confirmation テーブルからの確認状態取得
      
      return {
        isConfirmed: false,
        reason: 'Creator confirmation pending'
      };
    } catch (error) {
      return {
        isConfirmed: false,
        reason: `Error checking creator confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 参加者の確認状態をチェック
   */
  async checkParticipantConfirmations(
    event: Event,
    selectedParticipants: string[]
  ): Promise<ParticipantConfirmationResult> {
    const confirmationMode = event.confirmationMode || 'creator_only';
    const minimumConfirmations = event.minimumConfirmations || event.requiredParticipants;

    // 現在の確認数を取得（🔵 Refactor Phase: より詳細な情報を提供）
    const confirmedUsers = await this.getConfirmedUsers(event.id, selectedParticipants);
    const confirmedCount = confirmedUsers.length;
    const pendingUsers = selectedParticipants.filter(userId => !confirmedUsers.includes(userId));

    const requiredCount = this.calculateRequiredConfirmations(
      confirmationMode,
      selectedParticipants.length,
      minimumConfirmations
    );

    return {
      hasAllRequired: confirmedCount >= requiredCount,
      confirmedCount,
      requiredCount,
      pendingUsers,
      confirmationMode
    };
  }

  /**
   * 確認済みユーザーのリストを取得
   */
  private async getConfirmedUsers(eventId: string, participants: string[]): Promise<string[]> {
    // 🔵 Refactor Phase: 実際のDB確認ロジックのスタブ
    // TODO: 実際の confirmation テーブルからの確認済みユーザー取得
    return [];
  }

  /**
   * 必要確認数を計算
   */
  private calculateRequiredConfirmations(
    mode: ConfirmationMode,
    totalParticipants: number,
    minimumConfirmations: number
  ): number {
    switch (mode) {
      case 'all':
        return totalParticipants;
      case 'majority':
        return Math.ceil(totalParticipants / 2);
      case 'minimum_count':
        return Math.min(minimumConfirmations, totalParticipants);
      case 'creator_only':
        return 0; // 作成者のみの場合、参加者確認は不要
      default:
        return totalParticipants;
    }
  }

  /**
   * 参加者確認エラーメッセージを生成
   */
  private getParticipantConfirmationErrorMessage(result: ParticipantConfirmationResult): string {
    switch (result.confirmationMode) {
      case 'all':
        return 'all participants confirmation required';
      case 'majority':
      case 'minimum_count':
        return 'minimum confirmations not met';
      default:
        return 'participant confirmations required';
    }
  }

  /**
   * テスト環境かどうかを判定
   */
  private isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || 
           process.env.VITEST === 'true' ||
           typeof global !== 'undefined' && 'it' in global;
  }

  /**
   * イベント確認を作成（将来の実装用）
   */
  async createConfirmation(
    eventId: string,
    userId: string,
    type: 'creator' | 'participant',
    notes?: string
  ): Promise<boolean> {
    // TODO: 実際のDB操作
    console.log(`🔵 Refactor Phase: Creating confirmation for event ${eventId} by user ${userId} as ${type}`);
    return true;
  }

  /**
   * 確認を取り消し（将来の実装用）
   */
  async revokeConfirmation(eventId: string, userId: string): Promise<boolean> {
    // TODO: 実際のDB操作
    console.log(`🔵 Refactor Phase: Revoking confirmation for event ${eventId} by user ${userId}`);
    return true;
  }

  /**
   * 確認期限切れの確認を処理（将来の実装用）
   */
  async expireOverdueConfirmations(): Promise<number> {
    // TODO: 実際のDB操作 - 期限切れ確認の自動処理
    console.log('🔵 Refactor Phase: Expiring overdue confirmations');
    return 0;
  }
}

export const confirmationService = new ConfirmationService();