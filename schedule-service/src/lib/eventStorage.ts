import { Event, CreateEventRequest, UpdateEventRequest, EventParticipation } from '@/types/event';

class EventStorage {
  private events: Event[] = [];
  private participations: EventParticipation[] = [];

  async createEvent(request: CreateEventRequest, creatorId: string): Promise<Event> {
    const event: Event = {
      id: Math.random().toString(36).substring(2, 15),
      name: request.name,
      description: request.description,
      requiredParticipants: request.requiredParticipants,
      requiredDays: request.requiredDays,
      creatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'open',
      participants: []
    };

    this.events.push(event);
    return event;
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.events.find(event => event.id === id) || null;
  }

  async getAllEvents(): Promise<Event[]> {
    return [...this.events];
  }

  async getEventsByCreator(creatorId: string): Promise<Event[]> {
    return this.events.filter(event => event.creatorId === creatorId);
  }

  async getOpenEvents(): Promise<Event[]> {
    return this.events.filter(event => event.status === 'open');
  }

  async updateEvent(id: string, updates: UpdateEventRequest): Promise<Event | null> {
    const eventIndex = this.events.findIndex(event => event.id === id);
    if (eventIndex === -1) {
      return null;
    }

    const event = this.events[eventIndex];
    this.events[eventIndex] = {
      ...event,
      ...updates,
      updatedAt: new Date()
    };

    return this.events[eventIndex];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const eventIndex = this.events.findIndex(event => event.id === id);
    if (eventIndex === -1) {
      return false;
    }

    this.events.splice(eventIndex, 1);
    // 関連する参加記録も削除
    this.participations = this.participations.filter(p => p.eventId !== id);
    return true;
  }

  async addParticipant(eventId: string, userId: string): Promise<boolean> {
    const event = await this.getEventById(eventId);
    if (!event) {
      return false;
    }

    // 既に参加しているかチェック
    if (event.participants.includes(userId)) {
      return false;
    }

    // イベントの参加者リストに追加
    event.participants.push(userId);
    event.updatedAt = new Date();

    // 参加記録を追加
    const participation: EventParticipation = {
      eventId,
      userId,
      joinedAt: new Date()
    };
    this.participations.push(participation);

    return true;
  }

  async removeParticipant(eventId: string, userId: string): Promise<boolean> {
    const event = await this.getEventById(eventId);
    if (!event) {
      return false;
    }

    // 参加者リストから削除
    const participantIndex = event.participants.indexOf(userId);
    if (participantIndex === -1) {
      return false;
    }

    event.participants.splice(participantIndex, 1);
    event.updatedAt = new Date();

    // 参加記録も削除
    this.participations = this.participations.filter(
      p => !(p.eventId === eventId && p.userId === userId)
    );

    return true;
  }

  async getParticipantEvents(userId: string): Promise<Event[]> {
    const userParticipations = this.participations.filter(p => p.userId === userId);
    const eventIds = userParticipations.map(p => p.eventId);
    
    return this.events.filter(event => eventIds.includes(event.id));
  }

  async updateEventStatus(eventId: string, status: Event['status'], matchedDates?: Date[]): Promise<boolean> {
    const event = await this.getEventById(eventId);
    if (!event) {
      return false;
    }

    event.status = status;
    event.updatedAt = new Date();
    
    if (matchedDates) {
      event.matchedDates = matchedDates;
    }

    return true;
  }

  // 統計情報取得
  getStats() {
    return {
      totalEvents: this.events.length,
      openEvents: this.events.filter(e => e.status === 'open').length,
      matchedEvents: this.events.filter(e => e.status === 'matched').length,
      totalParticipations: this.participations.length
    };
  }
}

export const eventStorage = new EventStorage();