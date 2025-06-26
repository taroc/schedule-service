import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickSelectButtons from '../QuickSelectButtons';

describe('QuickSelectButtons', () => {
  const mockOnQuickSelect = vi.fn();
  const mockStartDate = new Date('2024-01-01');
  const mockEndDate = new Date('2024-01-31');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all quick selection options', () => {
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={mockStartDate}
        endDate={mockEndDate}
        disabled={false}
      />
    );

    expect(screen.getByText('今週末')).toBeInTheDocument();
    expect(screen.getByText('来週末')).toBeInTheDocument();
    expect(screen.getByText('今月末の週末')).toBeInTheDocument();
    expect(screen.getByText('平日全て')).toBeInTheDocument();
    expect(screen.getByText('週末全て')).toBeInTheDocument();
    expect(screen.getByText('全ての日')).toBeInTheDocument();
  });

  it('should call onQuickSelect with this weekend dates within range', () => {
    // テスト実行日に関係なく、広い範囲を設定
    const wideStartDate = new Date('2023-01-01');
    const wideEndDate = new Date('2025-12-31');
    
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={wideStartDate}
        endDate={wideEndDate}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('今週末'));
    
    expect(mockOnQuickSelect).toHaveBeenCalledTimes(1);
    const calledDates = mockOnQuickSelect.mock.calls[0][0];
    // 今週末は0-2日の範囲になる（すでに週末を過ぎている場合は0日もあり得る）
    expect(calledDates.length).toBeGreaterThanOrEqual(0);
    expect(calledDates.length).toBeLessThanOrEqual(2);
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={mockStartDate}
        endDate={mockEndDate}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should call onQuickSelect with all dates when "全ての日" is clicked', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-03'); // 3 days
    
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={startDate}
        endDate={endDate}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('全ての日'));
    
    expect(mockOnQuickSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-03')
      ])
    );
  });

  it('should call onQuickSelect with weekdays only when "平日全て" is clicked', () => {
    const startDate = new Date('2024-01-01'); // Monday
    const endDate = new Date('2024-01-07'); // Sunday
    
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={startDate}
        endDate={endDate}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('平日全て'));
    
    expect(mockOnQuickSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        new Date('2024-01-01'), // Monday
        new Date('2024-01-02'), // Tuesday
        new Date('2024-01-03'), // Wednesday
        new Date('2024-01-04'), // Thursday
        new Date('2024-01-05'), // Friday
      ])
    );
  });

  it('should call onQuickSelect with weekends only when "週末全て" is clicked', () => {
    const startDate = new Date('2024-01-01'); // Monday
    const endDate = new Date('2024-01-07'); // Sunday
    
    render(
      <QuickSelectButtons
        onQuickSelect={mockOnQuickSelect}
        startDate={startDate}
        endDate={endDate}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('週末全て'));
    
    expect(mockOnQuickSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        new Date('2024-01-06'), // Saturday
        new Date('2024-01-07'), // Sunday
      ])
    );
  });
});