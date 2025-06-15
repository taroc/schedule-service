import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventList from '../EventList'
import { EventWithCreator } from '@/types/event'

describe('EventList', () => {
  const mockEventWithParticipants: EventWithCreator = {
    id: 'event-1',
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredDays: 2,
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
    requiredDays: 3,
    creatorId: 'creator-2',
    creatorName: 'Another Creator',
    participants: [],
    participantNames: [],
    status: 'open',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }

  it('should display participant names when participants exist', () => {
    render(<EventList events={[mockEventWithParticipants]} />)
    
    // Should show participant count parts
    expect(screen.getByText('参加者:')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2) // appears twice: participants count and required days
    expect(screen.getAllByText('人')).toHaveLength(2) // appears twice: participants and required participants
    
    // Should show participant names
    expect(screen.getByText('Alice Smith, Bob Johnson')).toBeInTheDocument()
  })

  it('should display participant count only when no participants', () => {
    render(<EventList events={[mockEventWithoutParticipants]} />)
    
    // Should show participant count parts
    expect(screen.getByText('参加者:')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getAllByText('人')).toHaveLength(2) // appears twice: participants and required participants
    
    // Should not show participant names
    expect(screen.queryByText('Alice Smith, Bob Johnson')).not.toBeInTheDocument()
  })

  it('should handle events with missing participant names gracefully', () => {
    const eventWithMissingNames: EventWithCreator = {
      ...mockEventWithParticipants,
      participantNames: ['Alice Smith', '不明']
    }
    
    render(<EventList events={[eventWithMissingNames]} />)
    
    // Should show participant count parts
    expect(screen.getByText('参加者:')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2) // appears twice: participants count and required days
    expect(screen.getAllByText('人')).toHaveLength(2) // appears twice: participants and required participants
    
    // Should show participant names including unknown
    expect(screen.getByText('Alice Smith, 不明')).toBeInTheDocument()
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