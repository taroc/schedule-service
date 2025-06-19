import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Checking events for user: ${userId}`);

    // ユーザーが作成したイベント
    const createdEvents = await prisma.event.findMany({
      where: { creatorId: userId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    // ユーザーが参加しているイベント
    const participatingEvents = await prisma.event.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    // 成立済みイベント（作成者または参加者として）
    const matchedEvents = await prisma.event.findMany({
      where: {
        status: 'matched',
        OR: [
          { creatorId: userId },
          {
            participants: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    const response = {
      userId,
      createdEvents: createdEvents.map(event => ({
        id: event.id,
        name: event.name,
        status: event.status,
        participants: event.participants.map(p => p.userId),
        matchedDates: event.matchedDates
      })),
      participatingEvents: participatingEvents.map(event => ({
        id: event.id,
        name: event.name,
        status: event.status,
        creatorId: event.creatorId,
        participants: event.participants.map(p => p.userId),
        matchedDates: event.matchedDates
      })),
      matchedEvents: matchedEvents.map(event => ({
        id: event.id,
        name: event.name,
        status: event.status,
        creatorId: event.creatorId,
        participants: event.participants.map(p => p.userId),
        matchedDates: event.matchedDates,
        isCreator: event.creatorId === userId,
        isParticipant: event.participants.some(p => p.userId === userId)
      })),
      stats: {
        created: createdEvents.length,
        participating: participatingEvents.length,
        matched: matchedEvents.length
      }
    };

    console.log(`[DEBUG] User ${userId} stats:`, response.stats);
    console.log(`[DEBUG] User ${userId} matched events:`, response.matchedEvents);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in debug user events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}