// 🔴 Red Phase: Flexible Participants Event Storage Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventStorage } from '@/lib/eventStorage';
import { prisma } from '@/lib/prisma';
import type { CreateEventRequest } from '@/types/event';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

const mockedPrisma = vi.mocked(prisma);

describe('🔴 Red Phase: Flexible Participants Event Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCreateRequest: CreateEventRequest = {
    name: 'テストイベント',
    description: 'テスト用イベントです',
    requiredParticipants: 3, // 下位互換性のため
    minParticipants: 3,
    maxParticipants: 8,
    requiredHours: 3,
    deadline: new Date('2024-01-15T23:59:59Z'),
    periodStart: new Date('2024-01-16T00:00:00Z'),
    periodEnd: new Date('2024-01-30T23:59:59Z'),
  };

  describe('イベント作成', () => {
    it('flexible participant fieldsが正しくデータベースに保存されるべき', async () => {
      // Arrange
      const mockPrismaEvent = {
        id: 'event1',
        name: validCreateRequest.name,
        description: validCreateRequest.description,
        requiredParticipants: validCreateRequest.requiredParticipants,
        minParticipants: validCreateRequest.minParticipants,
        maxParticipants: validCreateRequest.maxParticipants,
        requiredHours: validCreateRequest.requiredHours,
        creatorId: 'creator1',
        status: 'open',
        deadline: validCreateRequest.deadline,
        periodStart: validCreateRequest.periodStart,
        periodEnd: validCreateRequest.periodEnd,
        reservationStatus: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [{ userId: 'creator1' }]
      };

      mockedPrisma.event.create.mockResolvedValue(mockPrismaEvent);

      // Act
      const result = await eventStorage.createEvent(validCreateRequest, 'creator1');

      // Assert
      expect(mockedPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiredParticipants: 3, // 下位互換性のため
          minParticipants: 3,
          maxParticipants: 8,
        }),
        include: {
          participants: {
            select: { userId: true },
            orderBy: { joinedAt: 'asc' }
          }
        }
      });

      expect(result.minParticipants).toBe(3);
      expect(result.maxParticipants).toBe(8);
      expect(result.requiredParticipants).toBe(3); // 下位互換性
    });

    it('maxParticipantsがnull（無制限）の場合も正しく処理されるべき', async () => {
      // Arrange
      const unlimitedRequest: CreateEventRequest = {
        ...validCreateRequest,
        maxParticipants: null
      };

      const mockPrismaEvent = {
        id: 'event1',
        name: unlimitedRequest.name,
        description: unlimitedRequest.description,
        requiredParticipants: unlimitedRequest.requiredParticipants,
        minParticipants: unlimitedRequest.minParticipants,
        maxParticipants: null,
        requiredHours: unlimitedRequest.requiredHours,
        creatorId: 'creator1',
        status: 'open',
        deadline: unlimitedRequest.deadline,
        periodStart: unlimitedRequest.periodStart,
        periodEnd: unlimitedRequest.periodEnd,
        reservationStatus: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [{ userId: 'creator1' }]
      };

      mockedPrisma.event.create.mockResolvedValue(mockPrismaEvent);

      // Act
      const result = await eventStorage.createEvent(unlimitedRequest, 'creator1');

      // Assert
      expect(mockedPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minParticipants: 3,
          maxParticipants: null,
        }),
        include: {
          participants: {
            select: { userId: true },
            orderBy: { joinedAt: 'asc' }
          }
        }
      });

      expect(result.maxParticipants).toBe(null);
    });
  });

  describe('イベント取得', () => {
    it('データベースから取得したイベントが正しくマッピングされるべき', async () => {
      // Arrange
      const mockPrismaEvent = {
        id: 'event1',
        name: 'テストイベント',
        description: 'テスト用イベント',
        requiredParticipants: 3,
        minParticipants: 3,
        maxParticipants: 8,
        requiredHours: 3,
        creatorId: 'creator1',
        status: 'open',
        matchedTimeSlots: null,
        deadline: new Date('2024-01-15T23:59:59Z'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        periodStart: new Date('2024-01-16T00:00:00Z'),
        periodEnd: new Date('2024-01-30T23:59:59Z'),
        reservationStatus: 'open',
        participants: [
          { userId: 'creator1' },
          { userId: 'user1' },
          { userId: 'user2' }
        ]
      };

      mockedPrisma.event.findUnique.mockResolvedValue(mockPrismaEvent);

      // Act
      const result = await eventStorage.getEventById('event1');

      // Assert
      expect(result).not.toBe(null);
      expect(result!.minParticipants).toBe(3);
      expect(result!.maxParticipants).toBe(8);
      expect(result!.requiredParticipants).toBe(3); // 下位互換性
      expect(result!.participants).toEqual(['creator1', 'user1', 'user2']);
    });

    it('データベースのフィールドがundefinedの場合適切なデフォルト値を設定すべき', async () => {
      // Arrange - minParticipants, maxParticipantsがundefinedのケース
      const mockPrismaEvent = {
        id: 'event1',
        name: 'テストイベント',
        description: 'テスト用イベント',
        requiredParticipants: 3,
        minParticipants: undefined, // undefinedの場合
        maxParticipants: undefined, // undefinedの場合
        requiredHours: 3,
        creatorId: 'creator1',
        status: 'open',
        matchedTimeSlots: null,
        deadline: new Date('2024-01-15T23:59:59Z'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        periodStart: new Date('2024-01-16T00:00:00Z'),
        periodEnd: new Date('2024-01-30T23:59:59Z'),
        reservationStatus: 'open',
        participants: [{ userId: 'creator1' }]
      };

      mockedPrisma.event.findUnique.mockResolvedValue(mockPrismaEvent);

      // Act
      const result = await eventStorage.getEventById('event1');

      // Assert
      expect(result).not.toBe(null);
      expect(result!.minParticipants).toBe(3); // requiredParticipantsフォールバック
      expect(result!.maxParticipants).toBe(null); // nullにフォールバック
    });
  });

  describe('複数イベント取得', () => {
    it('複数のイベントがすべて正しくマッピングされるべき', async () => {
      // Arrange
      const mockPrismaEvents = [
        {
          id: 'event1',
          name: 'イベント1',
          description: 'イベント1の説明',
          requiredParticipants: 2,
          minParticipants: 2,
          maxParticipants: 5,
          requiredHours: 3,
          creatorId: 'creator1',
          status: 'open',
          matchedTimeSlots: null,
          deadline: new Date('2024-01-15'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          periodStart: new Date('2024-01-16'),
          periodEnd: new Date('2024-01-30'),
          reservationStatus: 'open',
          participants: [{ userId: 'creator1' }]
        },
        {
          id: 'event2',
          name: 'イベント2',
          description: 'イベント2の説明',
          requiredParticipants: 3,
          minParticipants: 3,
          maxParticipants: null, // 無制限
          requiredHours: 6,
          creatorId: 'creator2',
          status: 'open',
          matchedTimeSlots: null,
          deadline: new Date('2024-01-20'),
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          periodStart: new Date('2024-01-21'),
          periodEnd: new Date('2024-01-31'),
          reservationStatus: 'open',
          participants: [
            { userId: 'creator2' },
            { userId: 'user1' },
            { userId: 'user2' },
            { userId: 'user3' }
          ]
        }
      ];

      mockedPrisma.event.findMany.mockResolvedValue(mockPrismaEvents);

      // Act
      const result = await eventStorage.getEventsByStatus('open');

      // Assert
      expect(result).toHaveLength(2);
      
      // 最初のイベント
      expect(result[0].minParticipants).toBe(2);
      expect(result[0].maxParticipants).toBe(5);
      expect(result[0].participants).toEqual(['creator1']);

      // 2番目のイベント（無制限）
      expect(result[1].minParticipants).toBe(3);
      expect(result[1].maxParticipants).toBe(null);
      expect(result[1].participants).toEqual(['creator2', 'user1', 'user2', 'user3']);
    });
  });

  describe('エラーハンドリング', () => {
    it('期間の検証エラーが適切に処理されるべき', async () => {
      // Arrange - 不正な期間設定
      const invalidRequest: CreateEventRequest = {
        ...validCreateRequest,
        periodStart: new Date('2024-01-20'), // 終了日より後
        periodEnd: new Date('2024-01-15')   // 開始日より前
      };

      // Act & Assert
      await expect(eventStorage.createEvent(invalidRequest, 'creator1'))
        .rejects.toThrow('Period start must be before period end');
    });

    it('存在しないイベントの取得でnullを返すべき', async () => {
      // Arrange
      mockedPrisma.event.findUnique.mockResolvedValue(null);

      // Act
      const result = await eventStorage.getEventById('nonexistent');

      // Assert
      expect(result).toBe(null);
    });
  });
});