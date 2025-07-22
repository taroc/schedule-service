// 🔴 Red Phase: Flexible Participant System Tests
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { eventStorage } from '@/lib/eventStorage';
import { userStorage } from '@/lib/userStorage';
import { verifyToken } from '@/lib/auth';

// テスト用のモック設定
vi.mock('@/lib/eventStorage');
vi.mock('@/lib/userStorage');
vi.mock('@/lib/auth');

const mockedEventStorage = vi.mocked(eventStorage);
const mockedUserStorage = vi.mocked(userStorage);
const mockedVerifyToken = vi.mocked(verifyToken);

describe('🔴 Red Phase: Flexible Participant Numbers API', () => {
  const mockUser = { id: 'user1' };
  const validEventRequest = {
    name: 'テストイベント',
    description: 'テスト用イベントです',
    requiredParticipants: 2, // 下位互換性のため
    minParticipants: 2,
    maxParticipants: 5,
    requiredHours: 3,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日後
    periodStart: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 8日後
    periodEnd: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(), // 22日後
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedVerifyToken.mockReturnValue(mockUser);
    mockedUserStorage.getUserById.mockResolvedValue({
      id: 'user1',
      hashedPassword: 'hashed123'
    });
  });

  describe('最小参加人数のバリデーション', () => {
    it('最小参加人数が1未満の場合はエラーを返すべき', async () => {
      // Arrange
      const invalidRequest = {
        ...validEventRequest,
        minParticipants: 0
      };
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Minimum participants and required hours must be greater than 0');
    });

    it('最小参加人数が正の値の場合は正常に処理されるべき', async () => {
      // Arrange
      const mockCreatedEvent = {
        id: 'event1',
        ...validEventRequest,
        requiredParticipants: validEventRequest.minParticipants,
        creatorId: 'user1',
        status: 'open',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: new Date(validEventRequest.deadline),
        periodStart: new Date(validEventRequest.periodStart),
        periodEnd: new Date(validEventRequest.periodEnd),
        reservationStatus: 'open' as const
      };
      
      mockedEventStorage.createEvent.mockResolvedValue(mockCreatedEvent);
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validEventRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert - デバッグのため詳細ログ出力
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response data:', data);
      }
      expect(response.status).toBe(200);
      expect(data.minParticipants).toBe(2);
      expect(data.requiredParticipants).toBe(2); // 下位互換性のため同期
    });
  });

  describe('最大参加人数のバリデーション', () => {
    it('最大参加人数が最小参加人数未満の場合はエラーを返すべき', async () => {
      // Arrange
      const invalidRequest = {
        ...validEventRequest,
        minParticipants: 5,
        maxParticipants: 3
      };
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum participants must be greater than or equal to minimum participants');
    });

    it('最大参加人数がnullの場合（無制限）は正常に処理されるべき', async () => {
      // Arrange
      const unlimitedRequest = {
        ...validEventRequest,
        maxParticipants: null
      };
      
      const mockCreatedEvent = {
        id: 'event1',
        ...unlimitedRequest,
        requiredParticipants: unlimitedRequest.minParticipants,
        creatorId: 'user1',
        status: 'open',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: new Date(unlimitedRequest.deadline),
        periodStart: new Date(unlimitedRequest.periodStart),
        periodEnd: new Date(unlimitedRequest.periodEnd),
        reservationStatus: 'open' as const
      };
      
      mockedEventStorage.createEvent.mockResolvedValue(mockCreatedEvent);
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(unlimitedRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert - デバッグのため詳細ログ出力
      if (response.status !== 200) {
        console.log('Unlimited Response status:', response.status);
        console.log('Unlimited Response data:', data);
      }
      expect(response.status).toBe(200);
      expect(data.maxParticipants).toBe(null);
    });
  });

  describe('フィールドの同期', () => {
    it('requiredParticipantsがminParticipantsと同期されるべき', async () => {
      // Arrange
      const mockCreatedEvent = {
        id: 'event1',
        ...validEventRequest,
        requiredParticipants: validEventRequest.minParticipants,
        creatorId: 'user1',
        status: 'open',
        participants: ['user1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: new Date(validEventRequest.deadline),
        periodStart: new Date(validEventRequest.periodStart),
        periodEnd: new Date(validEventRequest.periodEnd),
        reservationStatus: 'open' as const
      };
      
      mockedEventStorage.createEvent.mockResolvedValue(mockCreatedEvent);
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(validEventRequest)
      });

      // Act
      await POST(request);

      // Assert
      expect(mockedEventStorage.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          minParticipants: 2,
          requiredParticipants: 2
        }),
        'user1'
      );
    });
  });

  describe('必須フィールドのバリデーション', () => {
    it('minParticipantsが未設定の場合はエラーを返すべき', async () => {
      // Arrange
      const incompleteRequest = {
        ...validEventRequest
      };
      // @ts-expect-error - テストのためminParticipantsを削除
      delete incompleteRequest.minParticipants;
      
      const request = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(incompleteRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('All required fields must be provided');
    });
  });
});