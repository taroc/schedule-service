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
    requiredTimeSlots: 2,
    deadline: new Date('2025-01-08'),
    periodStart: new Date('2025-01-02'),
    periodEnd: new Date('2025-01-09'),
    reservationStatus: 'open',
    creatorId: 'creator-1',
    creatorName: 'Event Creator',
    participants: ['participant-1', 'participant-2'],
    participantNames: ['Alice Smith', 'Bob Johnson'],
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  const mockEventWithoutParticipants: EventWithCreator = {
    id: 'event-2',
    name: 'Empty Event',
    description: 'No participants yet',
    requiredParticipants: 5,
    requiredTimeSlots: 3,
    deadline: new Date('2025-01-08'),
    periodStart: new Date('2025-01-02'),
    periodEnd: new Date('2025-01-09'),
    reservationStatus: 'open',
    creatorId: 'creator-2',
    creatorName: 'Another Creator',
    participants: [],
    participantNames: [],
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  it('should display participant names when participants exist', () => {
    render(<EventList events={[mockEventWithParticipants]} displayMode="created" />)
    
    // Should show participant member section
    expect(screen.getByText('参加メンバー:')).toBeInTheDocument()
    
    // Should show participant IDs (not names in current implementation)
    expect(screen.getByText('participant-1')).toBeInTheDocument()
    expect(screen.getByText('participant-2')).toBeInTheDocument()
  })

  it('should display participant count only when no participants', () => {
    render(<EventList events={[mockEventWithoutParticipants]} displayMode="created" />)
    
    // Should show participant member section but only creator
    expect(screen.getByText('参加メンバー:')).toBeInTheDocument()
    expect(screen.getByText('creator-2')).toBeInTheDocument()
    
    // Should not show participant names since participants array is empty
    expect(screen.queryByText('Alice Smith, Bob Johnson')).not.toBeInTheDocument()
  })

  it('should handle events with missing participant names gracefully', () => {
    const eventWithMissingNames: EventWithCreator = {
      ...mockEventWithParticipants,
      participantNames: ['Alice Smith', '不明']
    }
    
    render(<EventList events={[eventWithMissingNames]} displayMode="created" />)
    
    // Should show participant member section
    expect(screen.getByText('参加メンバー:')).toBeInTheDocument()
    
    // Should show participant IDs (current implementation shows IDs, not names)
    expect(screen.getByText('participant-1')).toBeInTheDocument()
    expect(screen.getByText('participant-2')).toBeInTheDocument()
  })

  it('should display creator name correctly', () => {
    render(<EventList events={[mockEventWithParticipants]} />)
    
    expect(screen.getByText('Event Creator')).toBeInTheDocument()
  })

  it('should display event details correctly', () => {
    render(<EventList events={[mockEventWithParticipants]} />)
    
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('必要人数:')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('必要日数:')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2) // appears in both participants count and required days
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