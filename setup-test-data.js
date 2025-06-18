const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupTestData() {
  try {
    console.log('🚀 テストデータのセットアップを開始...');

    // 既存データをクリア
    console.log('📝 既存データをクリア中...');
    await prisma.userSchedule.deleteMany({});
    await prisma.eventParticipant.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({});

    // テストユーザーを作成
    console.log('👥 テストユーザーを作成中...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'user1',
          password: hashedPassword,
        },
      }),
      prisma.user.create({
        data: {
          id: 'user2', 
          password: hashedPassword,
        },
      }),
      prisma.user.create({
        data: {
          id: 'user3',
          password: hashedPassword,
        },
      }),
    ]);

    console.log('✅ ユーザー作成完了:', users.map(u => u.id));

    // 成立済みイベントを作成（2024-12-20, 2024-12-21で成立）
    console.log('🎯 成立済みイベントを作成中...');
    const matchedEvent = await prisma.event.create({
      data: {
        id: 'event-matched-1',
        name: '成立済みイベント（忘年会）',
        description: '12月20日〜21日で成立済みのイベントです',
        requiredParticipants: 2,
        requiredDays: 2,
        creatorId: 'user1',
        status: 'matched',
        matchedDates: JSON.stringify(['2024-12-20', '2024-12-21']),
        deadline: new Date('2024-12-25'),
        dateMode: 'consecutive',
        reservationStatus: 'confirmed',
      },
    });

    // 成立済みイベントに参加者を追加
    await prisma.eventParticipant.createMany({
      data: [
        { eventId: 'event-matched-1', userId: 'user2' },
        { eventId: 'event-matched-1', userId: 'user3' },
      ],
    });

    console.log('✅ 成立済みイベント作成完了:', matchedEvent.name);

    // 募集中イベント1（12月20日を含む期間で募集）- ダブルブッキングが発生する
    console.log('📅 募集中イベント1を作成中（ダブルブッキング対象）...');
    const openEvent1 = await prisma.event.create({
      data: {
        id: 'event-open-1',
        name: '新年準備会（ダブルブッキング対象）',
        description: '12月20日前後で開催予定。成立済みイベントと重複します。',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date('2024-12-25'),
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    console.log('✅ 募集中イベント1作成完了:', openEvent1.name);

    // 募集中イベント2（12月22日以降で募集）- ダブルブッキングしない
    console.log('📅 募集中イベント2を作成中（ダブルブッキングしない）...');
    const openEvent2 = await prisma.event.create({
      data: {
        id: 'event-open-2', 
        name: 'クリスマスパーティー',
        description: '12月22日以降で開催予定。成立済みイベントと重複しません。',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date('2024-12-25'),
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    console.log('✅ 募集中イベント2作成完了:', openEvent2.name);

    // 期限切れテスト用イベント群を作成
    console.log('⏰ 期限切れテスト用イベントを作成中...');
    
    // 1. 既に期限切れのイベント（昨日期限）
    const expiredEvent1 = await prisma.event.create({
      data: {
        id: 'event-expired-1',
        name: '期限切れイベント（昨日期限）',
        description: '昨日が期限で既に期限切れのイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨日
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 2. 今日期限切れのイベント（1時間前期限）
    const expiredEvent2 = await prisma.event.create({
      data: {
        id: 'event-expired-2',
        name: '期限切れイベント（1時間前期限）',
        description: '1時間前が期限で既に期限切れのイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 3. 今日期限切れのイベント（数分前期限）
    const expiredEvent3 = await prisma.event.create({
      data: {
        id: 'event-expired-3',
        name: '期限切れイベント（5分前期限）',
        description: '5分前が期限で既に期限切れのイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() - 5 * 60 * 1000), // 5分前
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 4. まだ有効なイベント（1時間後期限）
    const validEvent1 = await prisma.event.create({
      data: {
        id: 'event-valid-1',
        name: '有効イベント（1時間後期限）',
        description: '1時間後が期限でまだ有効なイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() + 60 * 60 * 1000), // 1時間後
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 5. 明日期限のイベント
    const validEvent2 = await prisma.event.create({
      data: {
        id: 'event-valid-2',
        name: '有効イベント（明日期限）',
        description: '明日が期限でまだ有効なイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 6. 期限なしのイベント（deadlineがnull）
    const noDeadlineEvent = await prisma.event.create({
      data: {
        id: 'event-no-deadline',
        name: '期限なしイベント',
        description: '期限が設定されていないイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: null,
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // 7. 期限切れで既に参加しているイベント（user2が参加済み）
    const expiredParticipatingEvent = await prisma.event.create({
      data: {
        id: 'event-expired-participating',
        name: '期限切れ参加済みイベント',
        description: '期限切れだがuser2が既に参加しているイベント',
        requiredParticipants: 2,
        requiredDays: 1,
        creatorId: 'user1',
        status: 'open',
        deadline: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
        dateMode: 'flexible',
        reservationStatus: 'open',
      },
    });

    // user2を期限切れイベントに参加させる
    await prisma.eventParticipant.create({
      data: { eventId: 'event-expired-participating', userId: 'user2' },
    });

    console.log('✅ 期限切れテスト用イベント作成完了');

    // ユーザーのスケジュールを設定
    console.log('📋 ユーザースケジュールを設定中...');
    
    // user2のスケジュール（成立済みイベントの参加者）
    const user2Schedules = [
      { date: '2024-12-20', morning: true, afternoon: true, fullday: false }, // 成立済み
      { date: '2024-12-21', morning: true, afternoon: true, fullday: false }, // 成立済み
      { date: '2024-12-22', morning: true, afternoon: true, fullday: false }, // 空き
      { date: '2024-12-23', morning: true, afternoon: true, fullday: false }, // 空き
    ];

    // user3のスケジュール（成立済みイベントの参加者）
    const user3Schedules = [
      { date: '2024-12-20', morning: true, afternoon: true, fullday: false }, // 成立済み
      { date: '2024-12-21', morning: true, afternoon: true, fullday: false }, // 成立済み
      { date: '2024-12-22', morning: true, afternoon: true, fullday: false }, // 空き
      { date: '2024-12-23', morning: true, afternoon: true, fullday: false }, // 空き
    ];

    for (const schedule of user2Schedules) {
      await prisma.userSchedule.create({
        data: {
          id: `user2-${schedule.date}`,
          userId: 'user2',
          date: new Date(schedule.date),
          timeSlotsMorning: schedule.morning,
          timeSlotsAfternoon: schedule.afternoon,
          timeSlotsFullday: schedule.fullday,
        },
      });
    }

    for (const schedule of user3Schedules) {
      await prisma.userSchedule.create({
        data: {
          id: `user3-${schedule.date}`,
          userId: 'user3',
          date: new Date(schedule.date),
          timeSlotsMorning: schedule.morning,
          timeSlotsAfternoon: schedule.afternoon,
          timeSlotsFullday: schedule.fullday,
        },
      });
    }

    console.log('✅ スケジュール設定完了');

    console.log('\n🎉 テストデータのセットアップが完了しました！\n');
    
    console.log('📊 作成されたデータ:');
    console.log('👥 ユーザー:');
    console.log('  - user1 (パスワード: password123) - イベント作成者');
    console.log('  - user2 (パスワード: password123) - 成立済みイベント参加者');
    console.log('  - user3 (パスワード: password123) - 成立済みイベント参加者');
    
    console.log('\n🎯 イベント:');
    console.log('  - 成立済みイベント（忘年会）: 12/20-21で成立済み（user2, user3が参加）');
    console.log('  - 新年準備会: 募集中（user2, user3が参加すると12/20でダブルブッキング）');
    console.log('  - クリスマスパーティー: 募集中（12/22以降なのでダブルブッキングしない）');
    
    console.log('\n⏰ 期限切れテスト用イベント:');
    console.log('  - 期限切れイベント（昨日期限）: 表示されない');
    console.log('  - 期限切れイベント（1時間前期限）: 表示されない');
    console.log('  - 期限切れイベント（5分前期限）: 表示されない');
    console.log('  - 有効イベント（1時間後期限）: 表示される');
    console.log('  - 有効イベント（明日期限）: 表示される');
    console.log('  - 期限なしイベント: 表示される');
    console.log('  - 期限切れ参加済みイベント: user2の参加一覧に表示されない');

    console.log('\n🧪 テスト手順:');
    console.log('1. user2 または user3 でログイン');
    console.log('2. 「新年準備会」に参加を試行 → ダブルブッキングエラーが表示される');
    console.log('3. 「クリスマスパーティー」に参加を試行 → 正常に参加できる');
    console.log('4. 参加可能イベント一覧で期限切れイベントが表示されないことを確認');
    console.log('5. user2で参加表明したイベント一覧に期限切れイベントが表示されないことを確認');
    console.log('6. 有効期限のイベント（1時間後、明日、期限なし）のみ表示されることを確認');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();