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

    console.log('\n🧪 テスト手順:');
    console.log('1. user2 または user3 でログイン');
    console.log('2. 「新年準備会」に参加を試行 → ダブルブッキングエラーが表示される');
    console.log('3. 「クリスマスパーティー」に参加を試行 → 正常に参加できる');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();