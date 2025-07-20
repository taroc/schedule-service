import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventList from '../EventList'
import { EventWithCreator } from '@/types/event'

describe('EventList', () => {
  const mockEventWithParticipants: EventWithCreator = {
    id: 'event-1',
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredHours: 2,
    deadline: new Date('2025-01-08'),
    periodStart: new Date('2025-01-02'),
    periodEnd: new Date('2025-01-09'),
    reservationStatus: 'open',
    creatorId: 'creator-1',
    participants: ['participant-1', 'participant-2'],
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  const mockEventWithoutParticipants: EventWithCreator = {
    id: 'event-2',
    name: 'Empty Event',
    description: 'No participants yet',
    requiredParticipants: 5,
    requiredHours: 3,
    deadline: new Date('2025-01-08'),
    periodStart: new Date('2025-01-02'),
    periodEnd: new Date('2025-01-09'),
    reservationStatus: 'open',
    creatorId: 'creator-2',
    participants: [],
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  it('should display participant IDs when participants exist', () => {
    render(<EventList events={[mockEventWithParticipants]} displayMode="created" />)
    
    // Should show participant member section
    expect(screen.getByText('参加メンバー:')).toBeInTheDocument()
    
    // Should show creator ID
    expect(screen.getByText('creator-1')).toBeInTheDocument()
    
    // Should show participant IDs (not names in current implementation)
    expect(screen.getByText('participant-1')).toBeInTheDocument()
    expect(screen.getByText('participant-2')).toBeInTheDocument()
  })

  it('should display only creator when no participants', () => {
    render(<EventList events={[mockEventWithoutParticipants]} displayMode="created" />)
    
    // Should show participant member section but only creator
    expect(screen.getByText('参加メンバー:')).toBeInTheDocument()
    expect(screen.getByText('creator-2')).toBeInTheDocument()
  })

  it('should display creator ID correctly', () => {
    render(<EventList events={[mockEventWithParticipants]} displayMode="created" />)
    
    expect(screen.getByText('creator-1')).toBeInTheDocument()
  })

  it('should display event details correctly', () => {
    render(<EventList events={[mockEventWithParticipants]} displayMode="available" />)
    
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('募集人数:')).toBeInTheDocument()
    expect(screen.getByText('3人')).toBeInTheDocument()
    expect(screen.getByText('必要時間:')).toBeInTheDocument()
    expect(screen.getByText('2時間')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<EventList events={[]} isLoading={true} />)
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show empty state when no events', () => {
    render(<EventList events={[]} />)
    
    expect(screen.getByText('イベントがありません')).toBeInTheDocument()
  })
})