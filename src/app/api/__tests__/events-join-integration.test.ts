import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../events/[id]/join/route';
import { POST as CreateEvent } from '../events/route';
import { POST as Register } from '../auth/register/route';
import { POST as SetAvailability } from '../schedules/availability/route';
import { eventStorage } from '@/lib/eventStorage';
import { userStorage } from '@/lib/userStorage';

describe('Event Join API Integration - Automatic Matching', () => {
  // テスト毎にユニークなIDを生成する変数
  let mockUser1: string;
  let mockUser2: string; 
  let mockCreator: string;
  let user1Token: string;
  let user2Token: string;
  let creatorToken: string;

  beforeEach(async () => {
    // テスト毎にユニークなIDを生成
    const testRunId = Math.random().toString(36).substring(7);
    mockUser1 = `user1-${testRunId}`;
    mockUser2 = `user2-${testRunId}`;
    mockCreator = `creator-${testRunId}`;

    // 既存イベントをクリーンアップ
    const allEvents = await eventStorage.getAllEvents();
    for (const event of allEvents) {
      await eventStorage.deleteEvent(event.id);
    }

    // テストユーザーを作成してトークンを取得
    const creatorRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockCreator, password: 'password123' })
    });
    const creatorResponse = await Register(creatorRequest);
    const creatorData = await creatorResponse.json();
    creatorToken = creatorData.token;

    const user1Request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUser1, password: 'password123' })
    });
    const user1Response = await Register(user1Request);
    const user1Data = await user1Response.json();
    user1Token = user1Data.token;

    const user2Request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUser2, password: 'password123' })
    });
    const user2Response = await Register(user2Request);
    const user2Data = await user2Response.json();
    user2Token = user2Data.token;
  });

  it('should automatically match event when second participant joins via API', async () => {
    // Step 1: Create event
    const createEventRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify({
        name: 'API統合マッチングテスト',
        description: 'API経由での自動マッチング検証',
        requiredParticipants: 2,
        requiredDays: 1
      })
    });

    const createEventResponse = await CreateEvent(createEventRequest);
    expect(createEventResponse.status).toBe(200);
    const eventData = await createEventResponse.json();
    expect(eventData.status).toBe('open');
    expect(eventData.participants).toHaveLength(0);
    const eventId = eventData.id;

    // Step 2: Set common schedule for both users
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // User1のスケジュール設定
    const user1ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        dates: [tomorrowISO],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });

    const user1ScheduleResponse = await SetAvailability(user1ScheduleRequest);
    expect(user1ScheduleResponse.status).toBe(200);
    const user1ScheduleData = await user1ScheduleResponse.json();
    expect(user1ScheduleData.matching.eventsChecked).toBe(0); // まだイベントに参加していない

    // User2のスケジュール設定
    const user2ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        dates: [tomorrowISO],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });

    const user2ScheduleResponse = await SetAvailability(user2ScheduleRequest);
    expect(user2ScheduleResponse.status).toBe(200);

    // Step 3: First user joins event (should not trigger matching)
    const user1JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });

    const user1JoinResponse = await POST(user1JoinRequest, { params: Promise.resolve({ id: eventId }) });
    expect(user1JoinResponse.status).toBe(200);
    const user1JoinData = await user1JoinResponse.json();
    
    // マッチングが実行されたが成立しなかった
    expect(user1JoinData.matching.checked).toBe(true);
    expect(user1JoinData.matching.isMatched).toBe(false);
    expect(user1JoinData.matching.reason).toContain('Insufficient participants');

    // イベントステータスの確認（まだopen）
    const eventAfterUser1 = eventStorage.getEventById(eventId);
    expect(eventAfterUser1?.status).toBe('open');
    expect(eventAfterUser1?.participants).toHaveLength(1);
    expect(eventAfterUser1?.participants).toContain(mockUser1);

    // Step 4: Second user joins event (should trigger automatic matching!)
    const user2JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });

    const user2JoinResponse = await POST(user2JoinRequest, { params: Promise.resolve({ id: eventId }) });
    expect(user2JoinResponse.status).toBe(200);
    const user2JoinData = await user2JoinResponse.json();

    // マッチングが実行され成立した
    expect(user2JoinData.matching.checked).toBe(true);
    expect(user2JoinData.matching.isMatched).toBe(true);
    expect(user2JoinData.matching.reason).toBe('Successfully matched');

    // Step 5: Verify event status was automatically updated
    const finalEvent = eventStorage.getEventById(eventId);
    expect(finalEvent?.status).toBe('matched');
    expect(finalEvent?.participants).toHaveLength(2);
    expect(finalEvent?.participants).toContain(mockUser1);
    expect(finalEvent?.participants).toContain(mockUser2);
    expect(finalEvent?.matchedDates).toHaveLength(1);
    expect(finalEvent?.matchedDates?.[0]).toBeInstanceOf(Date);
    
    // 更新日時が設定されている（作成日時以降）
    expect(finalEvent?.updatedAt.getTime()).toBeGreaterThanOrEqual(finalEvent?.createdAt.getTime());
  });

  it('should handle schedule updates triggering automatic matching via API', async () => {
    // Step 1: Create event and add participants first
    const createEventRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify({
        name: 'スケジュール更新マッチングテスト',
        description: 'スケジュール更新時の自動マッチング検証',
        requiredParticipants: 2,
        requiredDays: 1
      })
    });

    const createEventResponse = await CreateEvent(createEventRequest);
    const eventData = await createEventResponse.json();
    const eventId = eventData.id;

    // 両ユーザーをイベントに参加させる
    const user1JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    await POST(user1JoinRequest, { params: Promise.resolve({ id: eventId }) });

    const user2JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });
    await POST(user2JoinRequest, { params: Promise.resolve({ id: eventId }) });

    // まだマッチングしていないことを確認
    let currentEvent = eventStorage.getEventById(eventId);
    expect(currentEvent?.status).toBe('open');

    // Step 2: User1がスケジュールを設定（まだマッチングしない）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const user1ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });

    const user1ScheduleResponse = await SetAvailability(user1ScheduleRequest);
    const user1ScheduleData = await user1ScheduleResponse.json();
    
    // User1のスケジュール更新でマッチングがチェックされたが、User2のスケジュールがないので成立しない
    expect(user1ScheduleData.matching.eventsChecked).toBe(1);
    expect(user1ScheduleData.matching.newMatches).toBe(0);

    // Step 3: User2がスケジュールを設定（これでマッチング成立）
    const user2ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });

    const user2ScheduleResponse = await SetAvailability(user2ScheduleRequest);
    const user2ScheduleData = await user2ScheduleResponse.json();

    // User2のスケジュール更新でマッチングが成立
    expect(user2ScheduleData.matching.eventsChecked).toBe(1);
    expect(user2ScheduleData.matching.newMatches).toBe(1);

    // Step 4: Verify automatic status update
    currentEvent = eventStorage.getEventById(eventId);
    expect(currentEvent?.status).toBe('matched');
    expect(currentEvent?.matchedDates).toHaveLength(1);
  });

  it('should not match when participants have no common schedule via API', async () => {
    // Step 1: Create event
    const createEventRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify({
        name: '共通スケジュールなしテスト',
        description: '共通スケジュールがない場合のテスト',
        requiredParticipants: 2,
        requiredDays: 1
      })
    });

    const createEventResponse = await CreateEvent(createEventRequest);
    const eventData = await createEventResponse.json();
    const eventId = eventData.id;

    // Step 2: Set different schedules for users
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    // User1は明日空いている
    const user1ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        dates: [tomorrow.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });
    await SetAvailability(user1ScheduleRequest);

    // User2は明後日空いている（共通日程なし）
    const user2ScheduleRequest = new NextRequest('http://localhost:3000/api/schedules/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        dates: [dayAfter.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      })
    });
    await SetAvailability(user2ScheduleRequest);

    // Step 3: Both users join event
    const user1JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    await POST(user1JoinRequest, { params: Promise.resolve({ id: eventId }) });

    const user2JoinRequest = new NextRequest(`http://localhost:3000/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });
    const user2JoinResponse = await POST(user2JoinRequest, { params: Promise.resolve({ id: eventId }) });
    const user2JoinData = await user2JoinResponse.json();

    // マッチングが実行されたが成立しなかった
    expect(user2JoinData.matching.checked).toBe(true);
    expect(user2JoinData.matching.isMatched).toBe(false);
    expect(user2JoinData.matching.reason).toContain('No common available dates');

    // イベントはopenのまま
    const finalEvent = eventStorage.getEventById(eventId);
    expect(finalEvent?.status).toBe('open');
    expect(finalEvent?.matchedDates).toBeUndefined();
  });
});