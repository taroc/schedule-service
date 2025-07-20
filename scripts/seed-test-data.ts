#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

async function seedTestData() {
  console.log('🌱 テストデータの登録を開始します...');

  try {
    // 既存のテストデータをクリア（既存ユーザーは保持）
    console.log('📝 既存のテストデータをクリア中...');
    await prisma.userSchedule.deleteMany({
      where: {
        userId: {
          in: ['alice', 'bob', 'charlie', 'diana', 'taro']
        }
      }
    });
    await prisma.eventParticipant.deleteMany({
      where: {
        OR: [
          { userId: { in: ['alice', 'bob', 'charlie', 'diana', 'taro'] } },
          { event: { creatorId: { in: ['alice', 'bob', 'charlie', 'diana', 'taro'] } } }
        ]
      }
    });
    await prisma.event.deleteMany({
      where: {
        creatorId: {
          in: ['alice', 'bob', 'charlie', 'diana', 'taro']
        }
      }
    });
    
    // テストユーザーのみ削除して再作成
    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['alice', 'bob', 'charlie', 'diana', 'taro']
        }
      }
    });

    // テストユーザーの作成
    console.log('👥 テストユーザーを作成中...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'alice',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          id: 'bob',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          id: 'charlie',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          id: 'diana',
          password: await bcrypt.hash('password123', 10),
        },
      }),
      prisma.user.create({
        data: {
          id: 'taro',
          password: await bcrypt.hash('aaa', 10),
        },
      }),
    ]);

    console.log(`✅ ${users.length}人のユーザーを作成しました`);

    // テストイベントの作成
    console.log('📅 テストイベントを作成中...');
    
    // Alice主催のイベント
    const aliceEvent1 = await prisma.event.create({
      data: {
        id: 'alice-event-1',
        name: 'チーム懇親会',
        description: 'プロジェクト完了を祝って懇親会を開催します！',
        creatorId: 'alice',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'matched',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
        matchedTimeSlots: JSON.stringify([
          { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), timeSlot: 'daytime' },
          { date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), timeSlot: 'evening' }
        ]),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日から
        periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Alice イベント1の参加者を追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'alice-event-1', userId: 'bob' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'alice-event-1', userId: 'charlie' },
      }),
    ]);

    const aliceEvent2 = await prisma.event.create({
      data: {
        id: 'alice-event-2',
        name: '年末忘年会',
        description: 'みんなで楽しく年末を締めくくりましょう！',
        creatorId: 'alice',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14日後
        periodStart: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後から
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後まで
        minParticipants: 3,
        minimumConfirmations: 3,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Alice イベント2の参加者を追加
    await prisma.eventParticipant.create({
      data: { eventId: 'alice-event-2', userId: 'bob' },
    });

    // Bob主催のイベント
    const bobEvent1 = await prisma.event.create({
      data: {
        id: 'bob-event-1',
        name: '技術勉強会',
        description: '最新の技術トレンドについて学習しましょう',
        creatorId: 'bob',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'matched',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
        matchedTimeSlots: JSON.stringify([
          { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), timeSlot: 'daytime' },
          { date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), timeSlot: 'evening' }
        ]),
        periodStart: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後から
        periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Bob イベント1の参加者を追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'bob-event-1', userId: 'alice' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'bob-event-1', userId: 'diana' },
      }),
    ]);

    const bobEvent2 = await prisma.event.create({
      data: {
        id: 'bob-event-2',
        name: 'ハッカソン',
        description: '48時間でアプリを作成するイベントです',
        creatorId: 'bob',
        requiredParticipants: 4,
        requiredTimeSlots: 4,
        requiredHours: 12,
        status: 'open',
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21日後
        periodStart: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後から
        periodEnd: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35日後まで
        minParticipants: 4,
        minimumConfirmations: 4,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Bob イベント2の参加者を追加
    await prisma.eventParticipant.create({
      data: { eventId: 'bob-event-2', userId: 'charlie' },
    });

    // Charlie主催のイベント
    const charlieEvent1 = await prisma.event.create({
      data: {
        id: 'charlie-event-1',
        name: 'ランチ会',
        description: '美味しいレストランでランチしませんか？',
        creatorId: 'charlie',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
        periodStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後から
        periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Diana主催のイベント
    const dianaEvent1 = await prisma.event.create({
      data: {
        id: 'diana-event-1',
        name: 'ボードゲーム会',
        description: '様々なボードゲームを楽しみましょう！',
        creatorId: 'diana',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'matched',
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12日後
        matchedTimeSlots: JSON.stringify([
          { date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), timeSlot: 'daytime' },
          { date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), timeSlot: 'evening' }
        ]),
        periodStart: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後から
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後まで
        minParticipants: 3,
        minimumConfirmations: 3,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Diana イベント1の参加者を追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'diana-event-1', userId: 'alice' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'diana-event-1', userId: 'bob' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'diana-event-1', userId: 'charlie' },
      }),
    ]);

    // Taro主催の成立済みイベント
    const taroEvent1 = await prisma.event.create({
      data: {
        id: 'taro-event-1',
        name: 'カラオケ大会',
        description: 'みんなで楽しくカラオケしましょう！',
        creatorId: 'taro',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'matched',
        deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6日後
        matchedTimeSlots: JSON.stringify([
          { date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), timeSlot: 'evening' },
          { date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), timeSlot: 'daytime' }
        ]),
        periodStart: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後から
        periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Taro イベント1の参加者を追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'taro-event-1', userId: 'alice' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'taro-event-1', userId: 'bob' },
      }),
    ]);

    // Taroが参加する他の成立済みイベント
    const taroEvent2 = await prisma.event.create({
      data: {
        id: 'taro-event-2',
        name: 'スポーツ観戦',
        description: 'サッカーの試合を一緒に見に行きませんか？',
        creatorId: 'alice',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'matched',
        deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9日後
        matchedTimeSlots: JSON.stringify([
          { date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000), timeSlot: 'daytime' },
          { date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), timeSlot: 'evening' }
        ]),
        periodStart: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後から
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後まで
        minParticipants: 3,
        minimumConfirmations: 3,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Taro イベント2の参加者を追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'taro-event-2', userId: 'taro' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'taro-event-2', userId: 'bob' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'taro-event-2', userId: 'charlie' },
      }),
    ]);

    // あと一人で成立するイベント（Charlie主催、あと1人必要）
    const charlieEvent2 = await prisma.event.create({
      data: {
        id: 'charlie-event-2',
        name: '映画鑑賞会',
        description: '最新作を一緒に見に行きませんか？',
        creatorId: 'charlie',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8日後
        periodStart: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後から
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // Charlie イベント2の参加者を追加（あと1人で成立）
    await prisma.eventParticipant.create({
      data: { eventId: 'charlie-event-2', userId: 'alice' },
    });

    // 追加のテスト用イベント（参加可能なイベント）
    const testEvent1 = await prisma.event.create({
      data: {
        id: 'test-event-1',
        name: '週末ピクニック',
        description: '公園でゆったりと過ごしませんか？お弁当とレジャーシートを持参してください。',
        creatorId: 'diana',
        requiredParticipants: 3,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        periodStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後から
        periodEnd: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21日後まで
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後
        minParticipants: 3,
        minimumConfirmations: 3,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    const testEvent2 = await prisma.event.create({
      data: {
        id: 'test-event-2',
        name: '料理教室体験',
        description: 'プロのシェフから本格的なイタリア料理を学びましょう！初心者歓迎です。',
        creatorId: 'bob',
        requiredParticipants: 4,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後（緊急）
        periodStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2日後から
        periodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後まで
        minParticipants: 4,
        minimumConfirmations: 4,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // 料理教室に1人参加者追加
    await prisma.eventParticipant.create({
      data: { eventId: 'test-event-2', userId: 'charlie' },
    });

    const testEvent3 = await prisma.event.create({
      data: {
        id: 'test-event-3',
        name: '美術館巡り',
        description: '現代美術の展示を見に行きませんか？芸術について語り合いましょう。',
        creatorId: 'alice',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        periodStart: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25日後
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    const testEvent4 = await prisma.event.create({
      data: {
        id: 'test-event-4',
        name: 'キャンプ旅行',
        description: '2泊3日の自然を満喫するキャンプです。テントや寝袋の準備をお忘れなく！',
        creatorId: 'charlie',
        requiredParticipants: 5,
        requiredTimeSlots: 6,
        requiredHours: 18,
        status: 'open',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
        periodStart: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20日後から
        periodEnd: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), // 40日後まで
        minParticipants: 5,
        minimumConfirmations: 5,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    // キャンプに2人参加者追加
    await Promise.all([
      prisma.eventParticipant.create({
        data: { eventId: 'test-event-4', userId: 'alice' },
      }),
      prisma.eventParticipant.create({
        data: { eventId: 'test-event-4', userId: 'bob' },
      }),
    ]);

    const testEvent5 = await prisma.event.create({
      data: {
        id: 'test-event-5',
        name: 'カフェ巡り',
        description: '話題のカフェを一緒に回りませんか？コーヒーの飲み比べも楽しめます。',
        creatorId: 'diana',
        requiredParticipants: 2,
        requiredTimeSlots: 2,
        requiredHours: 6,
        status: 'open',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
        periodStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後から
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14日後まで
        minParticipants: 2,
        minimumConfirmations: 2,
        discordNotificationSettings: JSON.stringify({
          enabled: true,
          webhookUrl: 'https://discord.com/api/webhooks/test/webhook',
          notifyOnMatching: true,
          notifyOnDeadlineApproaching: true,
          notifyOnConfirmationRequired: true,
          notifyOnConfirmationReceived: true,
          notifyOnCancellation: true,
          mentionRoles: [],
          channelOverrides: []
        }),
      },
    });

    const allEvents = [aliceEvent1, aliceEvent2, bobEvent1, bobEvent2, charlieEvent1, charlieEvent2, dianaEvent1, taroEvent1, taroEvent2, testEvent1, testEvent2, testEvent3, testEvent4, testEvent5];
    console.log(`✅ ${allEvents.length}個のイベントを作成しました`);

    // スケジュールデータの作成
    console.log('📋 スケジュールデータを作成中...');
    
    const schedules = await Promise.all([
      // Alice のスケジュール
      prisma.userSchedule.create({
        data: {
          id: 'alice-schedule-1',
          userId: 'alice',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'alice-schedule-2',
          userId: 'alice',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'alice-schedule-3',
          userId: 'alice',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),

      // Bob のスケジュール
      prisma.userSchedule.create({
        data: {
          id: 'bob-schedule-1',
          userId: 'bob',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'bob-schedule-2',
          userId: 'bob',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'bob-schedule-3',
          userId: 'bob',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),

      // Charlie のスケジュール
      prisma.userSchedule.create({
        data: {
          id: 'charlie-schedule-1',
          userId: 'charlie',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'charlie-schedule-2',
          userId: 'charlie',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),

      // Diana のスケジュール
      prisma.userSchedule.create({
        data: {
          id: 'diana-schedule-1',
          userId: 'diana',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'diana-schedule-2',
          userId: 'diana',
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),

      // Taro のスケジュール
      prisma.userSchedule.create({
        data: {
          id: 'taro-schedule-1',
          userId: 'taro',
          date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
      prisma.userSchedule.create({
        data: {
          id: 'taro-schedule-2',
          userId: 'taro',
          date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
          timeSlotsDaytime: true,
          timeSlotsEvening: true,
        },
      }),
    ]);

    console.log(`✅ ${schedules.length}個のスケジュールを作成しました`);

    // データの確認
    console.log('\n📊 作成されたデータの概要:');
    console.log('='.repeat(50));
    
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();
    const scheduleCount = await prisma.userSchedule.count();
    const matchedEventCount = await prisma.event.count({ where: { status: 'matched' } });
    const openEventCount = await prisma.event.count({ where: { status: 'open' } });

    console.log(`👥 ユーザー数: ${userCount}`);
    console.log(`📅 イベント数: ${eventCount}`);
    console.log(`📋 スケジュール数: ${scheduleCount}`);
    console.log(`✅ 成立済みイベント: ${matchedEventCount}`);
    console.log(`⏳ 調整中イベント: ${openEventCount}`);

    console.log('\n🔑 テストユーザーのログイン情報:');
    console.log('='.repeat(50));
    console.log('ユーザーID: alice, パスワード: password123');
    console.log('ユーザーID: bob, パスワード: password123');
    console.log('ユーザーID: charlie, パスワード: password123');
    console.log('ユーザーID: diana, パスワード: password123');
    console.log('ユーザーID: taro, パスワード: aaa');

    console.log('\n🎯 各ユーザーの状況:');
    console.log('='.repeat(50));
    console.log('Alice: 主催4, 参加4, 成立済み4');
    console.log('Bob: 主催3, 参加3, 成立済み4');
    console.log('Charlie: 主催3, 参加3, 成立済み3');
    console.log('Diana: 主催3, 参加1, 成立済み2');
    console.log('Taro: 主催1, 参加1, 成立済み2');
    console.log('');
    console.log('💡 参加可能なテストイベント:');
    console.log('- 「映画鑑賞会」(Charlie主催) - あと1人参加すれば成立');
    console.log('- 「週末ピクニック」(Diana主催) - 参加可能');
    console.log('- 「料理教室体験」(Bob主催) - 3日後締切、緊急');
    console.log('- 「美術館巡り」(Alice主催) - 期間指定日程');
    console.log('- 「キャンプ旅行」(Charlie主催) - 3日間、2/5人参加済み');
    console.log('- 「カフェ巡り」(Diana主催) - 参加可能');

    console.log('\n🎉 テストデータの登録が完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合にのみ実行
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('✨ スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { seedTestData };