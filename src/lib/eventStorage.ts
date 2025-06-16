import { Event, CreateEventRequest, UpdateEventRequest, EventStatus } from '@/types/event';
import { prisma } from './prisma';

class EventStorageDB {
  async createEvent(request: CreateEventRequest, creatorId: string): Promise<Event> {
    const eventId = Math.random().toString(36).substring(2, 15);

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

  async addParticipant(eventId: string, userId: string): Promise<boolean> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { creatorId: true },
      });

      if (!event) {
        return false;
      }

      // 作成者は参加できない
      if (event.creatorId === userId) {
        return false;
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
        return false;
      }

      await prisma.eventParticipant.create({
        data: {
          eventId,
          userId,
        },
      });

      return true;
    } catch {
      return false;
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

      // Only update provided fields
      const updateData: {
        name?: string;
        description?: string;
        requiredParticipants?: number;
        requiredDays?: number;
        deadline?: Date | null;
      } = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.requiredParticipants !== undefined) updateData.requiredParticipants = updates.requiredParticipants;
      if (updates.requiredDays !== undefined) updateData.requiredDays = updates.requiredDays;
      if (updates.deadline !== undefined) updateData.deadline = updates.deadline;

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
    };
  }
}

export const eventStorage = new EventStorageDB();