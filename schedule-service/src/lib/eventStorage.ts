import { Event, CreateEventRequest, UpdateEventRequest, EventStatus } from '@/types/event';
import { db, runInTransaction } from './database';

interface EventRow {
  id: string;
  name: string;
  description: string;
  required_participants: number;
  required_days: number;
  creator_id: string;
  status: EventStatus;
  matched_dates: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

class EventStorageDB {
  private insertEvent = db.prepare(`
    INSERT INTO events (id, name, description, required_participants, required_days, creator_id, status, deadline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  private selectEventById = db.prepare(`
    SELECT * FROM events WHERE id = ?
  `);

  private selectAllEvents = db.prepare(`
    SELECT * FROM events ORDER BY created_at DESC
  `);

  private selectEventsByCreator = db.prepare(`
    SELECT * FROM events WHERE creator_id = ? ORDER BY created_at DESC
  `);

  private selectEventsByStatus = db.prepare(`
    SELECT * FROM events WHERE status = ? ORDER BY created_at DESC
  `);

  private updateEventStatusStmt = db.prepare(`
    UPDATE events SET status = ?, matched_dates = ?, updated_at = datetime('now') WHERE id = ?
  `);

  private deleteEventStmt = db.prepare(`
    DELETE FROM events WHERE id = ?
  `);

  private updateEventStmt = db.prepare(`
    UPDATE events SET name = ?, description = ?, required_participants = ?, required_days = ?, deadline = ?, updated_at = datetime('now') 
    WHERE id = ?
  `);

  private insertParticipant = db.prepare(`
    INSERT INTO event_participants (event_id, user_id, joined_at)
    VALUES (?, ?, datetime('now'))
  `);

  private deleteParticipant = db.prepare(`
    DELETE FROM event_participants WHERE event_id = ? AND user_id = ?
  `);

  private selectParticipants = db.prepare(`
    SELECT user_id FROM event_participants WHERE event_id = ? ORDER BY joined_at
  `);

  private selectParticipantEvents = db.prepare(`
    SELECT DISTINCT e.* FROM events e
    INNER JOIN event_participants ep ON e.id = ep.event_id
    WHERE ep.user_id = ?
    ORDER BY e.created_at DESC
  `);

  private checkParticipantExists = db.prepare(`
    SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?
  `);

  private countParticipants = db.prepare(`
    SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?
  `);

  private selectExpiredEvents = db.prepare(`
    SELECT * FROM events WHERE deadline < datetime('now') AND status = 'open' ORDER BY created_at DESC
  `);

  async createEvent(request: CreateEventRequest, creatorId: string): Promise<Event> {
    return runInTransaction(() => {
      const eventId = Math.random().toString(36).substring(2, 15);

      this.insertEvent.run(
        eventId,
        request.name,
        request.description,
        request.requiredParticipants,
        request.requiredDays,
        creatorId,
        'open',
        request.deadline ? request.deadline.toISOString() : null
      );

      const event = this.getEventById(eventId);
      if (!event) {
        throw new Error('Failed to create event');
      }

      return event;
    });
  }

  getEventById(id: string): Event | null {
    const eventRow = this.selectEventById.get(id) as EventRow | undefined;
    if (!eventRow) {
      return null;
    }

    const participants = this.selectParticipants.all(id) as { user_id: string }[];

    return this.mapRowToEvent(eventRow, participants.map(p => p.user_id));
  }

  async getAllEvents(): Promise<Event[]> {
    const eventRows = this.selectAllEvents.all() as EventRow[];
    
    return eventRows.map(row => {
      const participants = this.selectParticipants.all(row.id) as { user_id: string }[];
      return this.mapRowToEvent(row, participants.map(p => p.user_id));
    });
  }

  async getEventsByCreator(creatorId: string): Promise<Event[]> {
    const eventRows = this.selectEventsByCreator.all(creatorId) as EventRow[];
    
    return eventRows.map(row => {
      const participants = this.selectParticipants.all(row.id) as { user_id: string }[];
      return this.mapRowToEvent(row, participants.map(p => p.user_id));
    });
  }

  async getEventsByStatus(status: EventStatus): Promise<Event[]> {
    const eventRows = this.selectEventsByStatus.all(status) as EventRow[];
    
    return eventRows.map(row => {
      const participants = this.selectParticipants.all(row.id) as { user_id: string }[];
      return this.mapRowToEvent(row, participants.map(p => p.user_id));
    });
  }

  async addParticipant(eventId: string, userId: string): Promise<boolean> {
    return runInTransaction(() => {
      const event = this.getEventById(eventId);
      if (!event) {
        return false;
      }

      // 作成者は参加できない
      if (event.creatorId === userId) {
        return false;
      }

      // 既に参加しているかチェック
      const exists = this.checkParticipantExists.get(eventId, userId);
      if (exists) {
        return false;
      }

      try {
        this.insertParticipant.run(eventId, userId);
        return true;
      } catch {
        return false;
      }
    });
  }

  async removeParticipant(eventId: string, userId: string): Promise<boolean> {
    const result = this.deleteParticipant.run(eventId, userId);
    return result.changes > 0;
  }

  async getParticipantEvents(userId: string): Promise<Event[]> {
    const eventRows = this.selectParticipantEvents.all(userId) as EventRow[];
    
    return eventRows.map(row => {
      const participants = this.selectParticipants.all(row.id) as { user_id: string }[];
      return this.mapRowToEvent(row, participants.map(p => p.user_id));
    });
  }

  async updateEventStatus(eventId: string, status: EventStatus, matchedDates?: Date[]): Promise<boolean> {
    const matchedDatesJson = matchedDates ? JSON.stringify(matchedDates) : null;
    const result = this.updateEventStatusStmt.run(status, matchedDatesJson, eventId);
    return result.changes > 0;
  }

  async updateEvent(eventId: string, updates: UpdateEventRequest): Promise<Event | null> {
    return runInTransaction(() => {
      const event = this.getEventById(eventId);
      if (!event) {
        return null;
      }

      // Only update provided fields
      const name = updates.name ?? event.name;
      const description = updates.description ?? event.description;
      const requiredParticipants = updates.requiredParticipants ?? event.requiredParticipants;
      const requiredDays = updates.requiredDays ?? event.requiredDays;
      const deadline = updates.deadline !== undefined ? 
        (updates.deadline ? updates.deadline.toISOString() : null) : 
        (event.deadline ? event.deadline.toISOString() : null);

      this.updateEventStmt.run(name, description, requiredParticipants, requiredDays, deadline, eventId);

      // Return updated event
      const updatedEvent = this.getEventById(eventId);
      return updatedEvent;
    });
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    return runInTransaction(() => {
      // 外部キー制約により、event_participants も自動削除される
      const result = this.deleteEventStmt.run(eventId);
      return result.changes > 0;
    });
  }

  async getExpiredEvents(): Promise<Event[]> {
    const eventRows = this.selectExpiredEvents.all() as EventRow[];
    
    return eventRows.map(row => {
      const participants = this.selectParticipants.all(row.id) as { user_id: string }[];
      return this.mapRowToEvent(row, participants.map(p => p.user_id));
    });
  }

  async expireOverdueEvents(): Promise<number> {
    return runInTransaction(() => {
      const expiredEvents = this.selectExpiredEvents.all() as EventRow[];
      let expiredCount = 0;
      
      for (const event of expiredEvents) {
        this.updateEventStatusStmt.run('expired', null, event.id);
        expiredCount++;
      }
      
      return expiredCount;
    });
  }

  // Add missing getEventsByStatus method (called getOpenEvents in tests)
  async getOpenEvents(): Promise<Event[]> {
    return this.getEventsByStatus('open');
  }

  getStats() {
    const allEvents = this.selectAllEvents.all() as EventRow[];
    const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM event_participants').get() as { count: number };

    return {
      totalEvents: allEvents.length,
      openEvents: allEvents.filter(e => e.status === 'open').length,
      matchedEvents: allEvents.filter(e => e.status === 'matched').length,
      cancelledEvents: allEvents.filter(e => e.status === 'cancelled').length,
      totalParticipations: totalParticipants.count
    };
  }

  private mapRowToEvent(row: EventRow, participants: string[]): Event {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      requiredParticipants: row.required_participants,
      requiredDays: row.required_days,
      creatorId: row.creator_id,
      status: row.status,
      participants,
      matchedDates: row.matched_dates ? JSON.parse(row.matched_dates).map((d: string) => new Date(d)) : undefined,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const eventStorageDB = new EventStorageDB();
export const eventStorage = eventStorageDB;