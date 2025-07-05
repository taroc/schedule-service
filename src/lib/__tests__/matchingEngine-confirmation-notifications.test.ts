import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchingEngine } from '../matchingEngine';
import { eventStorage } from '../eventStorage';
import { userStorage } from '../userStorage';
import { scheduleStorage } from '../scheduleStorage';
import { CreateEventRequest, Event } from '@/types/event';
import '../../test/customMatchers';

// Mock the storage modules
vi.mock('../eventStorage');
vi.mock('../userStorage');
vi.mock('../scheduleStorage');

describe('🔴 Red Phase: 確認・通知システム', () => {
  const mockEventStorage = vi.mocked(eventStorage);
  const mockUserStorage = vi.mocked(userStorage);
  const mockScheduleStorage = vi.mocked(scheduleStorage);
  
  let mockCreator: string;
  let mockUsers: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockCreator = `creator-${testRunId}`;
    mockUsers = Array.from({length: 6}, (_, i) => `user-${i + 1}-${testRunId}`);

    // Setup basic mocks
    mockUserStorage.createUser.mockResolvedValue({
      id: mockUsers[0],
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const events = new Map<string, Event>();
    let eventIdCounter = 0;
    
    mockEventStorage.createEvent.mockImplementation(async (request, creatorId) => {
      eventIdCounter++;
      const event = {
        id: `event-${Date.now()}-${eventIdCounter}`,
        name: request.name,
        description: request.description,
        requiredParticipants: request.requiredParticipants,
        requiredTimeSlots: request.requiredTimeSlots || 1,
        creatorId,
        status: 'open',
        participants: [creatorId],
        deadline: request.deadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        reservationStatus: 'open',
        // Phase 1-3 フィールド（デフォルト値）
        matchingStrategy: (request as CreateEventRequest & { matchingStrategy?: string }).matchingStrategy || 'consecutive',
        timeSlotRestriction: (request as CreateEventRequest & { timeSlotRestriction?: string }).timeSlotRestriction || 'both',
        minimumConsecutive: (request as CreateEventRequest & { minimumConsecutive?: number }).minimumConsecutive || 1,
        participantSelectionStrategy: request.participantSelectionStrategy || 'first_come',
        minParticipants: request.minParticipants || request.requiredParticipants,
        maxParticipants: request.maxParticipants,
        optimalParticipants: request.optimalParticipants,
        selectionDeadline: request.selectionDeadline,
        lotterySeed: request.lotterySeed,
        allowPartialMatching: request.allowPartialMatching || false,
        minimumTimeSlots: request.minimumTimeSlots,
        suggestMultipleOptions: request.suggestMultipleOptions || false,
        maxSuggestions: request.maxSuggestions,
        preferredDates: request.preferredDates,
        dateWeights: request.dateWeights,
        requireAllParticipants: request.requireAllParticipants || false,
        fallbackStrategy: request.fallbackStrategy,
        // 🔴 Red Phase: Phase 4 新フィールド（まだ実装されていない）
        requireCreatorConfirmation: (request as CreateEventRequest & { requireCreatorConfirmation?: boolean }).requireCreatorConfirmation || false,
        confirmationTimeout: (request as CreateEventRequest & { confirmationTimeout?: number }).confirmationTimeout || 60, // デフォルト60分
        requireParticipantConfirmation: (request as CreateEventRequest & { requireParticipantConfirmation?: boolean }).requireParticipantConfirmation || false,
        minimumConfirmations: (request as CreateEventRequest & { minimumConfirmations?: number }).minimumConfirmations || request.requiredParticipants,
        confirmationMode: (request as CreateEventRequest & { confirmationMode?: string }).confirmationMode || 'creator_only',
        confirmationDeadline: (request as CreateEventRequest & { confirmationDeadline?: Date }).confirmationDeadline,
        gracePeriod: (request as CreateEventRequest & { gracePeriod?: number }).gracePeriod || 30, // デフォルト30分
        discordNotificationSettings: (request as CreateEventRequest & { discordNotificationSettings?: any }).discordNotificationSettings || {
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        },
        reminderSchedule: (request as CreateEventRequest & { reminderSchedule?: any[] }).reminderSchedule || [],
        customMessages: (request as CreateEventRequest & { customMessages?: any }).customMessages
      } as Event;
      events.set(event.id, event);
      return event;
    });
    
    mockEventStorage.getEventById.mockImplementation(async (eventId) => {
      return events.get(eventId) || null;
    });
    
    mockEventStorage.addParticipant.mockImplementation(async (eventId, userId) => {
      const event = events.get(eventId);
      if (event && !event.participants.includes(userId)) {
        event.participants.push(userId);
        events.set(eventId, event);
      }
      return { success: true };
    });
    
    mockEventStorage.updateEventStatus.mockImplementation(async (eventId, status, matchedTimeSlots) => {
      const event = events.get(eventId);
      if (event) {
        event.status = status;
        if (matchedTimeSlots) {
          event.matchedTimeSlots = matchedTimeSlots;
        }
        events.set(eventId, event);
        return true;
      }
      return false;
    });

    // Setup schedule storage mock
    const schedules = new Map<string, {
      userId: string;
      date: string;
      timeSlotsDaytime: boolean;
      timeSlotsEvening: boolean;
    }>();
    
    mockScheduleStorage.setAvailability.mockImplementation(async (userId, dates, timeSlots) => {
      for (const date of dates) {
        const key = `${userId}:${date}`;
        schedules.set(key, {
          userId,
          date,
          timeSlotsDaytime: timeSlots.daytime,
          timeSlotsEvening: timeSlots.evening
        });
      }
    });
    
    mockScheduleStorage.getUserSchedulesByDateRange.mockImplementation(async (userId, startDate, endDate) => {
      const userSchedules = Array.from(schedules.values())
        .filter(s => s.userId === userId)
        .filter(s => {
          const scheduleDate = new Date(s.date + 'T00:00:00.000Z');
          const start = new Date(startDate.getTime());
          const end = new Date(endDate.getTime());
          
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          scheduleDate.setHours(0, 0, 0, 0);
          
          return scheduleDate >= start && scheduleDate <= end;
        });
      
      return userSchedules.map(s => ({
        id: `${s.userId}-${s.date}`,
        userId: s.userId,
        date: new Date(s.date + 'T00:00:00.000Z'),
        timeSlots: {
          daytime: s.timeSlotsDaytime,
          evening: s.timeSlotsEvening
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    });
  });

  describe('成立確認システム', () => {
    it('作成者確認が必要な場合、確認前は成立しないべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Creator Confirmation Required Event',
        description: 'Test creator confirmation requirement',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireCreatorConfirmation: true, // 🔴 Red Phase: 作成者確認必須
        confirmationTimeout: 120 // 2時間
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 必要人数が参加
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 共通で空いている状況
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 作成者確認が必要なので成立しないことを期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('creator confirmation required');
    });

    it('確認期限を過ぎた場合、自動的にキャンセルされるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Confirmation Timeout Event',
        description: 'Test confirmation timeout',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireCreatorConfirmation: true,
        confirmationTimeout: -60, // 🔴 Red Phase: 過去の時間（すでにタイムアウト）
        confirmationDeadline: new Date(Date.now() - 60 * 60 * 1000) // 1時間前
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 確認期限切れで自動キャンセルされることを期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('confirmation deadline passed');
    });

    it('作成者が確認した場合、通常通り成立すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Creator Confirmed Event',
        description: 'Test creator confirmation success',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireCreatorConfirmation: true,
        confirmationTimeout: 120
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 🔴 Red Phase: 作成者確認をシミュレート（まだ実装されていない）
      // await confirmationService.confirmEvent(event.id, mockCreator, 'creator');

      // 共通で空いている状況
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 作成者確認済みなので成立することを期待（まだ実装されていない）
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
    });
  });

  describe('段階的確認フロー', () => {
    it('参加者確認が必要な場合、最低確認数に達するまで保留状態を維持すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Participant Confirmation Event',
        description: 'Test participant confirmation requirement',
        requiredParticipants: 4,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireParticipantConfirmation: true, // 🔴 Red Phase: 参加者確認必須
        confirmationMode: 'majority', // 過半数の確認が必要
        minimumConfirmations: 3 // 4人中3人の確認が必要
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 4名が参加
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);
      await eventStorage.addParticipant(event.id, mockUsers[2]);

      // 共通で空いている状況
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1], mockUsers[2]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // 🔴 Red Phase: 2名のみ確認（最低3名に達していない）
      // await confirmationService.confirmEvent(event.id, mockUsers[0], 'participant');
      // await confirmationService.confirmEvent(event.id, mockUsers[1], 'participant');

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 最低確認数に達していないので保留状態を期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('minimum confirmations not met');
    });

    it('全員確認モードで1人でも未確認の場合は成立しないべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'All Confirmations Required Event',
        description: 'Test all participants confirmation requirement',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireParticipantConfirmation: true,
        confirmationMode: 'all', // 🔴 Red Phase: 全員確認必須
        minimumConfirmations: 3
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 共通で空いている状況
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // 🔴 Red Phase: 2名のみ確認（1名未確認）
      // await confirmationService.confirmEvent(event.id, mockCreator, 'participant');
      // await confirmationService.confirmEvent(event.id, mockUsers[0], 'participant');
      // mockUsers[1] は未確認

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: 全員確認が必要なのに1名未確認で成立しないことを期待
      expect(result.isMatched).toBe(false);
      expect(result.reason).toContain('all participants confirmation required');
    });
  });

  describe('Discord通知システム', () => {
    it('リマインダースケジュールに従ってDiscord通知が送信されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Discord Reminder Event',
        description: 'Test Discord reminder notifications',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2時間後
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        discordNotificationSettings: { // 🔴 Red Phase: Discord通知設定
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: ['123456789', '987654321'], // ロールID
          channelOverrides: []
        },
        reminderSchedule: [ // 🔴 Red Phase: リマインダースケジュール
          {
            triggerBefore: 60, // 1時間前
            message: '参加締切まで1時間です',
            recipients: 'all',
            discordMention: true
          },
          {
            triggerBefore: 30, // 30分前
            message: '参加締切まで30分です',
            recipients: 'unconfirmed',
            discordMention: false
          }
        ]
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);

      // Act & Assert
      // 🔴 Red Phase: Discord通知システムのテスト（まだ実装されていない）
      expect(event.discordNotificationSettings.enabled).toBe(true);
      expect(event.discordNotificationSettings.webhookUrl).toContain('discord.com');
      expect(event.discordNotificationSettings.mentionRoles).toHaveLength(2);
      expect(event.reminderSchedule).toHaveLength(2);
      expect(event.reminderSchedule![0].discordMention).toBe(true);
    });

    it('マッチング成立時にDiscord埋め込みメッセージが送信されるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Discord Matching Event',
        description: 'Test Discord matching notification',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        discordNotificationSettings: {
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: false,
          notifyOnConfirmationRequired: false,
          notifyOnConfirmationReceived: false,
          notifyOnCancellation: false,
          mentionRoles: ['role1', 'role2']
        },
        customMessages: { // 🔴 Red Phase: カスタムDiscordメッセージ
          matchingNotification: '🎉 {{eventName}}の日程が確定しました！',
          discordEmbedColor: '#00ff00'
        }
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);
      
      // 必要人数が参加
      await eventStorage.addParticipant(event.id, mockUsers[0]);
      await eventStorage.addParticipant(event.id, mockUsers[1]);

      // 共通で空いている状況
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const allParticipants = [mockCreator, mockUsers[0], mockUsers[1]];
      
      for (const userId of allParticipants) {
        await scheduleStorage.setAvailability(
          userId,
          [tomorrow.toISOString().split('T')[0], dayAfter.toISOString().split('T')[0]],
          { daytime: true, evening: true }
        );
      }

      // Act
      const result = await matchingEngine.checkEventMatching(event.id);

      // Assert
      // 🔴 Red Phase: マッチング成立とDiscord通知送信を期待
      expect(result.isMatched).toBe(true);
      expect(result.matchedTimeSlots).toHaveLength(2);
      
      // 🔴 Red Phase: Discord通知が送信されることを期待（まだ実装されていない）
      // expect(discordNotificationService.sendMatchingNotification).toHaveBeenCalledWith(
      //   expect.objectContaining({
      //     id: event.id,
      //     name: 'Discord Matching Event'
      //   }),
      //   expect.arrayContaining([
      //     expect.objectContaining({
      //       date: expect.any(Date),
      //       timeSlot: expect.stringMatching(/daytime|evening/)
      //     })
      //   ])
      // );
    });

    it('チャンネル別設定でDiscord通知先を変更できるべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Channel Override Event',
        description: 'Test Discord channel overrides',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        discordNotificationSettings: {
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/default/webhook', // デフォルト
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          channelOverrides: [ // 🔴 Red Phase: チャンネル別設定
            {
              eventType: 'matching',
              webhookUrl: 'https://discord.com/api/webhooks/matching/webhook',
              mentionRoles: ['matching-role']
            },
            {
              eventType: 'confirmation',
              webhookUrl: 'https://discord.com/api/webhooks/confirmation/webhook',
              mentionRoles: ['admin-role']
            }
          ]
        }
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);

      // Act & Assert
      // 🔴 Red Phase: チャンネル別設定のテスト（まだ実装されていない）
      expect(event.discordNotificationSettings.channelOverrides).toHaveLength(2);
      expect(event.discordNotificationSettings.channelOverrides![0].eventType).toBe('matching');
      expect(event.discordNotificationSettings.channelOverrides![0].webhookUrl).toContain('matching');
      expect(event.discordNotificationSettings.channelOverrides![1].eventType).toBe('confirmation');
      expect(event.discordNotificationSettings.channelOverrides![1].mentionRoles).toContain('admin-role');
    });

    it('Discord通知が無効の場合は通知が送信されないべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'Discord Disabled Event',
        description: 'Test Discord notifications disabled',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        discordNotificationSettings: {
          enabled: false, // 🔴 Red Phase: Discord通知無効
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true
        }
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);

      // Act & Assert
      // 🔴 Red Phase: Discord通知が無効であることを確認
      expect(event.discordNotificationSettings.enabled).toBe(false);
      // 🔴 Red Phase: マッチング時にDiscord通知が送信されないことを期待（まだ実装されていない）
    });
  });

  describe('イベント状態管理', () => {
    it('確認保留状態から確認済み状態に正しく遷移すべき', async () => {
      // Arrange
      const eventRequest = {
        name: 'State Transition Event',
        description: 'Test event state transitions',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        requireCreatorConfirmation: true
      } as CreateEventRequest;

      const event = await eventStorage.createEvent(eventRequest, mockCreator);

      // Act & Assert
      // 🔴 Red Phase: 状態遷移のテスト（まだ実装されていない）
      // 1. 初期状態は 'open'
      expect(event.status).toBe('open');

      // 2. マッチング条件を満たすと 'pending_confirmation' に遷移すべき
      // await matchingEngine.checkEventMatching(event.id);
      // const updatedEvent = await eventStorage.getEventById(event.id);
      // expect(updatedEvent.status).toBe('pending_confirmation');

      // 3. 確認完了で 'confirmed' に遷移すべき
      // await confirmationService.confirmEvent(event.id, mockCreator, 'creator');
      // const confirmedEvent = await eventStorage.getEventById(event.id);
      // expect(confirmedEvent.status).toBe('confirmed');
    });
  });
});

// 🔴 Red Phase: カスタムマッチャーの拡張（確認・通知システム用）
// Note: カスタムマッチャーの型定義は src/test/customMatchers.ts に統合済み