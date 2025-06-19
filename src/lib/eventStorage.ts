import { Event, CreateEventRequest, UpdateEventRequest, EventStatus, DateMode, ReservationStatus, EventParticipation } from '@/types/event';
import { prisma } from './prisma';

class EventStorageDB {
  async createEvent(request: CreateEventRequest, creatorId: string): Promise<Event> {
    const eventId = Math.random().toString(36).substring(2, 15);

    // 入力値の検証
    if (request.dateMode === 'within_period') {
      if (!request.periodStart || !request.periodEnd) {
        throw new Error('Period start and end dates are required for within_period mode');
      }
      if (request.periodStart >= request.periodEnd) {
        throw new Error('Period start must be before period end');
      }
    }

    const event = await prisma.event.create({
      data: {
        id: eventId,
        name: request.name,
        description: request.description,
        requiredParticipants: request.requiredParticipants,
        requiredDays: request.requiredDays,
        creatorId,
        status: 'open',
        deadline: request.deadline || null,
        
        // 新機能フィールド
        dateMode: request.dateMode || 'consecutive',
        periodStart: request.periodStart || null,
        periodEnd: request.periodEnd || null,
        reservationStatus: 'open',
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

      // 作成者は参加できない
      if (event.creatorId === userId) {
        return { success: false, error: 'Event creator cannot join their own event' };
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
          matchedDates: true,
          status: true
        }
      });

      if (!targetEvent) {
        return { canJoin: false, conflictingEvents: ['Event not found'] };
      }

      // まだ成立していないイベントは競合チェック不要
      if (targetEvent.status !== 'matched' || !targetEvent.matchedDates) {
        return { canJoin: true, conflictingEvents: [] };
      }

      // 成立済みイベントの日程を取得
      const targetDates = JSON.parse(targetEvent.matchedDates) as string[];

      // ユーザーが参加している他の成立済みイベントを取得
      const userEvents = await prisma.event.findMany({
        where: {
          status: 'matched',
          matchedDates: { not: null },
          participants: {
            some: {
              userId: userId
            }
          }
        },
        select: {
          id: true,
          name: true,
          matchedDates: true
        }
      });

      const conflictingEvents: string[] = [];

      // 日程の重複をチェック
      for (const userEvent of userEvents) {
        if (userEvent.matchedDates) {
          const userEventDates = JSON.parse(userEvent.matchedDates) as string[];
          
          // 日程が重複している場合
          const hasOverlap = targetDates.some(date => userEventDates.includes(date));
          if (hasOverlap) {
            conflictingEvents.push(userEvent.name);
          }
        }
      }

      return {
        canJoin: conflictingEvents.length === 0,
        conflictingEvents
      };
    } catch (error) {
      console.error('Schedule conflict check failed:', error);
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
        OR: [
          { deadline: null },
          { deadline: { gt: now } },
          { 
            deadline: { lt: now },
            status: 'matched'
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

    return events.map(event => this.mapPrismaToEvent(event));
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
        OR: [
          { deadline: null },
          { deadline: { gt: now } },
          { 
            deadline: { lt: now },
            status: 'matched'
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

    return events.map(event => this.mapPrismaToEvent(event));
  }

  async getAvailableEventsForUser(userId: string): Promise<Event[]> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: 'open',
        creatorId: {
          not: userId
        },
        OR: [
          { deadline: null },
          { deadline: { gt: now } }
        ],
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
    return events
      .map(event => this.mapPrismaToEvent(event))
      .filter(event => event.requiredParticipants > event.participants.length);
  }


  // 件数のみ取得する軽量メソッド
  async getCreatedEventsCount(creatorId: string): Promise<number> {
    const now = new Date();
    return await prisma.event.count({
      where: {
        creatorId,
        OR: [
          { deadline: null },
          { deadline: { gt: now } },
          { 
            deadline: { lt: now },
            status: 'matched'
          }
        ]
      }
    });
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
        OR: [
          { deadline: null },
          { deadline: { gt: now } },
          { 
            deadline: { lt: now },
            status: 'matched'
          }
        ]
      }
    });
  }

  async getMatchedEventsCount(userId: string): Promise<number> {
    return await prisma.event.count({
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
      }
    });
  }

  async getAvailableEventsCount(userId: string): Promise<number> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: 'open',
        creatorId: {
          not: userId
        },
        OR: [
          { deadline: null },
          { deadline: { gt: now } }
        ],
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
        },
      },
    });

    // 必要人数に達していないイベントのみカウント
    return events.filter(event => 
      event.requiredParticipants > event.participants.length
    ).length;
  }

  async updateEventStatus(eventId: string, status: EventStatus, matchedDates?: Date[]): Promise<boolean> {
    try {
      const matchedDatesJson = matchedDates ? JSON.stringify(matchedDates) : null;
      
      await prisma.event.update({
        where: { id: eventId },
        data: {
          status,
          matchedDates: matchedDatesJson,
        },
      });

      return true;
    } catch {
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
      if (updates.dateMode === 'within_period') {
        if (!updates.periodStart || !updates.periodEnd) {
          throw new Error('Period start and end dates are required for within_period mode');
        }
        if (updates.periodStart >= updates.periodEnd) {
          throw new Error('Period start must be before period end');
        }
      }

      // Only update provided fields
      const updateData: {
        name?: string;
        description?: string;
        requiredParticipants?: number;
        requiredDays?: number;
        deadline?: Date | null;
        dateMode?: string;
        periodStart?: Date | null;
        periodEnd?: Date | null;
      } = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.requiredParticipants !== undefined) updateData.requiredParticipants = updates.requiredParticipants;
      if (updates.requiredDays !== undefined) updateData.requiredDays = updates.requiredDays;
      if (updates.deadline !== undefined) updateData.deadline = updates.deadline;
      
      // 新機能フィールド
      if (updates.dateMode !== undefined) updateData.dateMode = updates.dateMode;
      if (updates.periodStart !== undefined) updateData.periodStart = updates.periodStart;
      if (updates.periodEnd !== undefined) updateData.periodEnd = updates.periodEnd;

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
        matchedDates: null,
      },
    });

    return result.count;
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
      requiredDays: number;
      creatorId: string;
      status: string;
      matchedDates: string | null;
      deadline: Date | null;
      createdAt: Date;
      updatedAt: Date;
      dateMode: string;
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
      requiredDays: prismaEvent.requiredDays,
      creatorId: prismaEvent.creatorId,
      status: prismaEvent.status as EventStatus,
      participants: prismaEvent.participants?.map((p) => p.userId) || [],
      matchedDates: prismaEvent.matchedDates ? 
        JSON.parse(prismaEvent.matchedDates).map((d: string) => new Date(d)) : 
        undefined,
      deadline: prismaEvent.deadline ? new Date(prismaEvent.deadline) : undefined,
      createdAt: new Date(prismaEvent.createdAt),
      updatedAt: new Date(prismaEvent.updatedAt),
      
      // 新機能フィールド
      dateMode: prismaEvent.dateMode as DateMode,
      periodStart: prismaEvent.periodStart ? new Date(prismaEvent.periodStart) : undefined,
      periodEnd: prismaEvent.periodEnd ? new Date(prismaEvent.periodEnd) : undefined,
      reservationStatus: prismaEvent.reservationStatus as ReservationStatus,
    };
  }

  private mapPrismaToEventWithCreator(
    prismaEvent: {
      id: string;
      name: string;
      description: string;
      requiredParticipants: number;
      requiredDays: number;
      creatorId: string;
      status: string;
      matchedDates: string | null;
      deadline: Date | null;
      createdAt: Date;
      updatedAt: Date;
      dateMode: string;
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
      requiredDays: prismaEvent.requiredDays,
      creatorId: prismaEvent.creatorId,
      status: prismaEvent.status as EventStatus,
      participants: prismaEvent.participants?.map((p) => p.userId) || [],
      matchedDates: prismaEvent.matchedDates ? 
        JSON.parse(prismaEvent.matchedDates).map((d: string) => new Date(d)) : 
        undefined,
      deadline: prismaEvent.deadline ? new Date(prismaEvent.deadline) : undefined,
      createdAt: new Date(prismaEvent.createdAt),
      updatedAt: new Date(prismaEvent.updatedAt),
      
      // 新機能フィールド
      dateMode: prismaEvent.dateMode as DateMode,
      periodStart: prismaEvent.periodStart ? new Date(prismaEvent.periodStart) : undefined,
      periodEnd: prismaEvent.periodEnd ? new Date(prismaEvent.periodEnd) : undefined,
      reservationStatus: prismaEvent.reservationStatus as ReservationStatus,
      
      creator: {
        id: prismaEvent.creator?.id || prismaEvent.creatorId,
        hashedPassword: prismaEvent.creator?.password || '',
      },
    };
  }
}

export const eventStorage = new EventStorageDB();