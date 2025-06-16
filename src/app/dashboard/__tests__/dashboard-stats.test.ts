import { describe, it, expect } from 'vitest';
import { EventWithCreator } from '@/types/event';

// ダッシュボード統計計算ロジックのテスト
interface DashboardStats {
  createdEvents: number;
  participatingEvents: number;
  matchedEvents: number;
  pendingEvents: number;
}

function calculateDashboardStats(
  myCreatedEventsData: EventWithCreator[],
  myParticipatingEventsData: EventWithCreator[]
): DashboardStats {
  const allMyEvents = [...myCreatedEventsData, ...myParticipatingEventsData];
  
  // 成立済みイベントは作成したものと参加しているもの両方をカウント
  const myMatchedEvents = myCreatedEventsData.filter(e => e.status === 'matched').length +
                         myParticipatingEventsData.filter(e => e.status === 'matched').length;
  
  return {
    createdEvents: myCreatedEventsData.length,
    participatingEvents: myParticipatingEventsData.length,
    matchedEvents: myMatchedEvents,
    pendingEvents: allMyEvents.filter(e => e.status === 'open').length,
  };
}

describe('Dashboard Statistics Calculation', () => {
  const mockUser = { id: 'user1', hashedPassword: 'hash' };
  
  const createMockEvent = (
    id: string,
    name: string,
    creatorId: string,
    status: 'open' | 'matched' | 'cancelled' | 'expired',
    participants: string[] = []
  ): EventWithCreator => ({
    id,
    name,
    description: `Description for ${name}`,
    creatorId,
    requiredParticipants: 2,
    requiredDays: 1,
    status,
    participants,
    creator: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: null,
    matchedDates: status === 'matched' ? [new Date()] : null
  });

  it('正しく作成したイベント数をカウントする', () => {
    const myCreatedEvents = [
      createMockEvent('1', 'Event 1', 'user1', 'open'),
      createMockEvent('2', 'Event 2', 'user1', 'matched'),
      createMockEvent('3', 'Event 3', 'user1', 'open')
    ];
    const myParticipatingEvents: EventWithCreator[] = [];

    const stats = calculateDashboardStats(myCreatedEvents, myParticipatingEvents);
    
    expect(stats.createdEvents).toBe(3);
  });

  it('正しく参加中のイベント数をカウントする', () => {
    const myCreatedEvents: EventWithCreator[] = [];
    const myParticipatingEvents = [
      createMockEvent('4', 'Event 4', 'user2', 'open', ['user1']),
      createMockEvent('5', 'Event 5', 'user3', 'matched', ['user1'])
    ];

    const stats = calculateDashboardStats(myCreatedEvents, myParticipatingEvents);
    
    expect(stats.participatingEvents).toBe(2);
  });

  it('正しく成立済みイベント数をカウントする（作成＋参加）', () => {
    const myCreatedEvents = [
      createMockEvent('1', 'Created Matched', 'user1', 'matched'),
      createMockEvent('2', 'Created Open', 'user1', 'open')
    ];
    const myParticipatingEvents = [
      createMockEvent('3', 'Participating Matched', 'user2', 'matched', ['user1']),
      createMockEvent('4', 'Participating Open', 'user3', 'open', ['user1'])
    ];

    const stats = calculateDashboardStats(myCreatedEvents, myParticipatingEvents);
    
    // 作成した成立済み(1) + 参加している成立済み(1) = 2
    expect(stats.matchedEvents).toBe(2);
  });

  it('正しく調整中イベント数をカウントする', () => {
    const myCreatedEvents = [
      createMockEvent('1', 'Created Open 1', 'user1', 'open'),
      createMockEvent('2', 'Created Matched', 'user1', 'matched')
    ];
    const myParticipatingEvents = [
      createMockEvent('3', 'Participating Open', 'user2', 'open', ['user1']),
      createMockEvent('4', 'Participating Matched', 'user3', 'matched', ['user1'])
    ];

    const stats = calculateDashboardStats(myCreatedEvents, myParticipatingEvents);
    
    // 作成したopen(1) + 参加しているopen(1) = 2
    expect(stats.pendingEvents).toBe(2);
  });

  it('空のデータで正しく動作する', () => {
    const stats = calculateDashboardStats([], []);
    
    expect(stats.createdEvents).toBe(0);
    expect(stats.participatingEvents).toBe(0);
    expect(stats.matchedEvents).toBe(0);
    expect(stats.pendingEvents).toBe(0);
  });

  it('複雑なケースで正しく動作する', () => {
    const myCreatedEvents = [
      createMockEvent('1', 'Created Open 1', 'user1', 'open'),
      createMockEvent('2', 'Created Open 2', 'user1', 'open'),
      createMockEvent('3', 'Created Matched 1', 'user1', 'matched'),
      createMockEvent('4', 'Created Matched 2', 'user1', 'matched'),
      createMockEvent('5', 'Created Cancelled', 'user1', 'cancelled')
    ];
    
    const myParticipatingEvents = [
      createMockEvent('6', 'Participating Open', 'user2', 'open', ['user1']),
      createMockEvent('7', 'Participating Matched', 'user3', 'matched', ['user1']),
      createMockEvent('8', 'Participating Expired', 'user4', 'expired', ['user1'])
    ];

    const stats = calculateDashboardStats(myCreatedEvents, myParticipatingEvents);
    
    expect(stats.createdEvents).toBe(5); // 作成したイベント総数
    expect(stats.participatingEvents).toBe(3); // 参加しているイベント総数
    expect(stats.matchedEvents).toBe(3); // 作成した成立済み(2) + 参加している成立済み(1)
    expect(stats.pendingEvents).toBe(3); // 作成したopen(2) + 参加しているopen(1)
  });
});