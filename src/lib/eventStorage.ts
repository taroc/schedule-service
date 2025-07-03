import { Event, CreateEventRequest, UpdateEventRequest, EventStatus, ReservationStatus, EventParticipation } from '@/types/event';
import { MatchingTimeSlot } from '@/types/schedule';
import { prisma } from './prisma';

class EventStorageDB {
  async createEvent(request: CreateEventRequest, creatorId: string): Promise<Event> {
    const eventId = Math.random().toString(36).substring(2, 15);

    // 入力値の検証
    if (!request.periodStart || !request.periodEnd) {
      throw new Error('Period start and end dates are required');
    }
    if (request.periodStart >= request.periodEnd) {
      throw new Error('Period start must be before period end');
    }

    const event = await prisma.event.create({
      data: {
        id: eventId,
        name: request.name,
        description: request.description,
        requiredParticipants: request.requiredParticipants,
        requiredTimeSlots: request.requiredTimeSlots,
        creatorId,
        status: 'open',
        deadline: request.deadline || null,
        
        // 期間指定フィールド（必須）
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        reservationStatus: 'open',
        
        // 作成者を最初から参加者として追加
        participants: {
          create: {
            userId: creatorId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    return this.mapPrismaToEvent(event);
  }

  async getEventById(id: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return this.mapPrismaToEvent(event);
  }

  async getAllEvents(): Promise<Event[]> {
    const events = await prisma.event.findMany({
      include: {
        creator: {
          select: {
            id: true,
            password: true,
          },
        },
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEventWithCreator(event));
  }

  async getEventsByCreator(creatorId: string): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: { creatorId },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async getEventsByStatus(status: EventStatus): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: { status },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async addParticipant(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { creatorId: true },
      });

      if (!event) {
        return { success: false, error: 'Event not found' };
      }


      // 既に参加しているかチェック
      const existingParticipant = await prisma.eventParticipant.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (existingParticipant) {
        return { success: false, error: 'Already joined this event' };
      }

      // ダブルブッキングチェック
      const conflictCheck = await this.checkForScheduleConflicts(eventId, userId);
      if (!conflictCheck.canJoin) {
        return { 
          success: false, 
          error: `日程が重複しています: ${conflictCheck.conflictingEvents.join(', ')}`
        };
      }

      await prisma.eventParticipant.create({
        data: {
          eventId,
          userId,
        },
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Failed to join event' };
    }
  }

  async removeParticipant(eventId: string, userId: string): Promise<boolean> {
    try {
      await prisma.eventParticipant.delete({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getEventParticipants(eventId: string): Promise<EventParticipation[]> {
    try {
      const participants = await prisma.eventParticipant.findMany({
        where: { eventId },
        orderBy: { joinedAt: 'asc' },
      });

      return participants.map(p => ({
        eventId: p.eventId,
        userId: p.userId,
        joinedAt: p.joinedAt,
      }));
    } catch {
      return [];
    }
  }

  /**
   * ユーザーがイベントに参加する際の日程競合をチェック
   */
  async checkForScheduleConflicts(eventId: string, userId: string): Promise<{
    canJoin: boolean;
    conflictingEvents: string[];
  }> {
    try {
      // 参加しようとするイベントの情報を取得
      const targetEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { 
          name: true,
          matchedTimeSlots: true,
          status: true
        }
      });

      if (!targetEvent) {
        return { canJoin: false, conflictingEvents: ['Event not found'] };
      }

      // まだ成立していないイベントは競合チェック不要
      if (targetEvent.status !== 'matched' || !targetEvent.matchedTimeSlots) {
        return { canJoin: true, conflictingEvents: [] };
      }

      // 成立済みイベントの時間帯を取得
      const targetTimeSlots = JSON.parse(targetEvent.matchedTimeSlots) as { date: string; timeSlot: string }[];

      // ユーザーが参加している他の成立済みイベントを取得
      const userEvents = await prisma.event.findMany({
        where: {
          status: 'matched',
          matchedTimeSlots: { not: null },
          participants: {
            some: {
              userId: userId
            }
          }
        },
        select: {
          id: true,
          name: true,
          matchedTimeSlots: true
        }
      });

      const conflictingEvents: string[] = [];

      // 時間帯の重複をチェック
      for (const userEvent of userEvents) {
        if (userEvent.matchedTimeSlots) {
          const userEventTimeSlots = JSON.parse(userEvent.matchedTimeSlots) as { date: string; timeSlot: string }[];
          
          // 時間帯が重複している場合
          const hasOverlap = targetTimeSlots.some(targetTs => 
            userEventTimeSlots.some(userTs => 
              targetTs.date.split('T')[0] === userTs.date.split('T')[0] &&
              targetTs.timeSlot === userTs.timeSlot
            )
          );
          
          if (hasOverlap) {
            conflictingEvents.push(userEvent.name);
          }
        }
      }

      return {
        canJoin: conflictingEvents.length === 0,
        conflictingEvents
      };
    } catch {
      return { canJoin: false, conflictingEvents: ['Error checking schedule conflicts'] };
    }
  }

  async getParticipantEvents(userId: string): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  // 効率的なダッシュボード用クエリメソッド
  async getCreatedEventsInRange(creatorId: string): Promise<Event[]> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        creatorId,
        deadline: { gt: now } // 締め切りが過ぎていないもののみ
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 確定済みイベントは確定日程の最後の日もチェック
    const filteredEvents = events
      .map(event => this.mapPrismaToEvent(event))
      .filter(event => {
        // 確定済みイベントの場合は確定日程の最後の日をチェック
        if (event.status === 'matched') {
          if (!event.matchedTimeSlots || event.matchedTimeSlots.length === 0) {
            return false;
          }
          
          // 確定日程の最後の日をチェック
          const lastEventDate = event.matchedTimeSlots
            .map(ts => new Date(ts.date))
            .sort((a, b) => b.getTime() - a.getTime())[0];
          
          // 最後の日が過ぎていない場合のみ表示
          return lastEventDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        
        // 確定前のイベントはすべて表示（締め切りチェックは既にクエリで実行済み）
        return true;
      });

    return filteredEvents;
  }

  async getParticipatingEventsInRange(userId: string): Promise<Event[]> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
        creatorId: {
          not: userId
        },
        status: {
          not: 'matched'
        },
        deadline: { gt: now } // 締め切りが過ぎていないもののみ
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async getMatchedEventsForUser(userId: string): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: {
        status: 'matched',
        OR: [
          { creatorId: userId },
          {
            participants: {
              some: {
                userId,
              },
            },
          }
        ]
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();
    const filteredEvents = events
      .map(event => this.mapPrismaToEvent(event))
      .filter(event => {
        // matchedTimeSlotsがない場合は除外
        if (!event.matchedTimeSlots || event.matchedTimeSlots.length === 0) {
          return false;
        }
        
        // 確定日程の最後の日をチェック
        const lastEventDate = event.matchedTimeSlots
          .map(ts => new Date(ts.date))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        
        // 最後の日が過ぎていない場合のみ表示
        return lastEventDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      });

    return filteredEvents;
  }

  async getAvailableEventsForUser(userId: string): Promise<Event[]> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: 'open',
        creatorId: {
          not: userId
        },
        deadline: { gt: now }, // 締め切りが過ぎていないもののみ
        NOT: {
          participants: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 必要人数に達していないイベントのみフィルタ
    const availableEvents = events
      .map(event => this.mapPrismaToEvent(event))
      .filter(event => event.requiredParticipants > event.participants.length);

    // ユーザーの予定と照合して参加可能なイベントのみ返す
    const eventsWithScheduleMatch = [];
    
    for (const event of availableEvents) {
      const canParticipate = await this.checkUserScheduleCompatibility(userId, event);
      if (canParticipate) {
        eventsWithScheduleMatch.push(event);
      }
    }
    
    return eventsWithScheduleMatch;
  }


  // 件数のみ取得する軽量メソッド
  async getCreatedEventsCount(creatorId: string): Promise<number> {
    // 複雑なフィルタリングロジックがあるため、実際のイベントリストから件数を取得
    const events = await this.getCreatedEventsInRange(creatorId);
    return events.length;
  }

  async getParticipatingEventsCount(userId: string): Promise<number> {
    const now = new Date();
    return await prisma.event.count({
      where: {
        participants: {
          some: {
            userId,
          },
        },
        creatorId: {
          not: userId
        },
        status: {
          not: 'matched'
        },
        deadline: { gt: now } // 締め切りが過ぎていないもののみ
      }
    });
  }

  async getMatchedEventsCount(userId: string): Promise<number> {
    // 実際のフィルタリングロジックを使用
    const matchedEvents = await this.getMatchedEventsForUser(userId);
    return matchedEvents.length;
  }

  async getAvailableEventsCount(userId: string): Promise<number> {
    const availableEvents = await this.getAvailableEventsForUser(userId);
    return availableEvents.length;
  }

  async updateEventStatus(
    eventId: string, 
    status: EventStatus, 
    matchedTimeSlots?: MatchingTimeSlot[]
  ): Promise<boolean> {
    try {
      const matchedTimeSlotsJson = matchedTimeSlots ? JSON.stringify(matchedTimeSlots) : null;
      
      await prisma.event.update({
        where: { id: eventId },
        data: {
          status,
          matchedTimeSlots: matchedTimeSlotsJson,
        },
      });

      return true;
    } catch (error) {
      console.error(`Failed to update event ${eventId}:`, error);
      return false;
    }
  }

  async updateEvent(eventId: string, updates: UpdateEventRequest): Promise<Event | null> {
    try {
      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!existingEvent) {
        return null;
      }

      // 入力値の検証
      if (updates.periodStart && updates.periodEnd) {
        if (updates.periodStart >= updates.periodEnd) {
          throw new Error('Period start must be before period end');
        }
      }

      // Only update provided fields
      const updateData: {
        name?: string;
        description?: string;
        requiredParticipants?: number;
        deadline?: Date;
        periodStart?: Date;
        periodEnd?: Date;
      } = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.requiredParticipants !== undefined) updateData.requiredParticipants = updates.requiredParticipants;
      if (updates.deadline !== undefined) updateData.deadline = updates.deadline;
      
      // 期間指定フィールド
      if (updates.periodStart !== undefined && updates.periodStart !== null) updateData.periodStart = updates.periodStart;
      if (updates.periodEnd !== undefined && updates.periodEnd !== null) updateData.periodEnd = updates.periodEnd;

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
        include: {
          participants: {
            select: {
              userId: true,
            },
            orderBy: {
              joinedAt: 'asc',
            },
          },
        },
      });

      return this.mapPrismaToEvent(updatedEvent);
    } catch {
      return null;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Prisma will handle the cascade delete of participants due to foreign key constraints
      await prisma.event.delete({
        where: { id: eventId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getExpiredEvents(): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: {
        deadline: {
          lt: new Date(),
        },
        status: 'open',
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async getEventsWithDeadlinesPassed(): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: {
        deadline: {
          lte: new Date(),
        },
        status: 'open',
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async expireOverdueEvents(): Promise<number> {
    const result = await prisma.event.updateMany({
      where: {
        deadline: {
          lt: new Date(),
        },
        status: 'open',
      },
      data: {
        status: 'expired',
        matchedTimeSlots: null,
      },
    });

    return result.count;
  }

  /**
   * ユーザーの予定とイベントの期間が合致するかチェック
   */
  async checkUserScheduleCompatibility(userId: string, event: Event): Promise<boolean> {
    try {
      // イベント期間内のユーザーの空き時間を取得
      const userSchedules = await prisma.userSchedule.findMany({
        where: {
          userId,
          date: {
            gte: event.periodStart,
            lte: event.periodEnd,
          },
        },
      });

      // イベント期間内の全日程を生成
      const eventDates: Date[] = [];
      const currentDate = new Date(event.periodStart);
      const endDate = new Date(event.periodEnd);
      
      while (currentDate <= endDate) {
        eventDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 各日付でユーザーが利用可能かチェック
      const availableDates: Date[] = [];
      
      for (const date of eventDates) {
        const dateStr = date.toDateString();
        const schedule = userSchedules.find(s => s.date.toDateString() === dateStr);
        
        // その日にスケジュールが登録されている（= 空いている）場合
        if (schedule && (schedule.timeSlotsDaytime || schedule.timeSlotsEvening)) {
          availableDates.push(date);
        }
      }

      // 必要日数分の空きがあるかチェック
      return availableDates.length >= event.requiredTimeSlots;
    } catch {
      return false;
    }
  }

  // Add missing getEventsByStatus method (called getOpenEvents in tests)
  async getOpenEvents(): Promise<Event[]> {
    return this.getEventsByStatus('open');
  }

  async getStats() {
    const [totalEvents, openEvents, matchedEvents, cancelledEvents, totalParticipations] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'open' } }),
      prisma.event.count({ where: { status: 'matched' } }),
      prisma.event.count({ where: { status: 'cancelled' } }),
      prisma.eventParticipant.count(),
    ]);

    return {
      totalEvents,
      openEvents,
      matchedEvents,
      cancelledEvents,
      totalParticipations,
    };
  }

  private mapPrismaToEvent(
    prismaEvent: {
      id: string;
      name: string;
      description: string;
      requiredParticipants: number;
      requiredTimeSlots?: number | null;
      creatorId: string;
      status: string;
      matchedTimeSlots?: string | null;
      deadline: Date;
      createdAt: Date;
      updatedAt: Date;
      periodStart: Date | null;
      periodEnd: Date | null;
      reservationStatus: string;
      participants?: { userId: string }[];
    }
  ): Event {
    return {
      id: prismaEvent.id,
      name: prismaEvent.name,
      description: prismaEvent.description,
      requiredParticipants: prismaEvent.requiredParticipants,
      requiredTimeSlots: prismaEvent.requiredTimeSlots || 1,
      creatorId: prismaEvent.creatorId,
      status: prismaEvent.status as EventStatus,
      participants: prismaEvent.participants?.map((p) => p.userId) || [],
      matchedTimeSlots: prismaEvent.matchedTimeSlots ? 
        JSON.parse(prismaEvent.matchedTimeSlots).map((ts: { date: string; timeSlot: string }) => ({
          date: new Date(ts.date),
          timeSlot: ts.timeSlot as 'daytime' | 'evening'
        })) : 
        undefined,
      deadline: new Date(prismaEvent.deadline),
      createdAt: new Date(prismaEvent.createdAt),
      updatedAt: new Date(prismaEvent.updatedAt),
      
      // 期間指定フィールド（必須）
      periodStart: new Date(prismaEvent.periodStart!),
      periodEnd: new Date(prismaEvent.periodEnd!),
      reservationStatus: prismaEvent.reservationStatus as ReservationStatus,
    };
  }

  private mapPrismaToEventWithCreator(
    prismaEvent: {
      id: string;
      name: string;
      description: string;
      requiredParticipants: number;
      requiredTimeSlots?: number | null;
      creatorId: string;
      status: string;
      matchedTimeSlots?: string | null;
      deadline: Date;
      createdAt: Date;
      updatedAt: Date;
      periodStart: Date | null;
      periodEnd: Date | null;
      reservationStatus: string;
      participants?: { userId: string }[];
      creator?: { id: string; password: string };
    }
  ): Event & { creator: { id: string; hashedPassword: string } } {
    return {
      id: prismaEvent.id,
      name: prismaEvent.name,
      description: prismaEvent.description,
      requiredParticipants: prismaEvent.requiredParticipants,
      requiredTimeSlots: prismaEvent.requiredTimeSlots || 1,
      creatorId: prismaEvent.creatorId,
      status: prismaEvent.status as EventStatus,
      participants: prismaEvent.participants?.map((p) => p.userId) || [],
      matchedTimeSlots: prismaEvent.matchedTimeSlots ? 
        JSON.parse(prismaEvent.matchedTimeSlots).map((ts: { date: string; timeSlot: string }) => ({
          date: new Date(ts.date),
          timeSlot: ts.timeSlot as 'daytime' | 'evening'
        })) : 
        undefined,
      deadline: new Date(prismaEvent.deadline),
      createdAt: new Date(prismaEvent.createdAt),
      updatedAt: new Date(prismaEvent.updatedAt),
      
      // 期間指定フィールド（必須）
      periodStart: new Date(prismaEvent.periodStart!),
      periodEnd: new Date(prismaEvent.periodEnd!),
      reservationStatus: prismaEvent.reservationStatus as ReservationStatus,
      
      creator: {
        id: prismaEvent.creator?.id || prismaEvent.creatorId,
        hashedPassword: prismaEvent.creator?.password || '',
      },
    };
  }
}

export const eventStorage = new EventStorageDB();