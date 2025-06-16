import { NextResponse } from 'next/server';
import { userStorage } from '@/lib/userStorage';

export async function GET() {
  try {
    const users = await userStorage.getAllUsers();
    return NextResponse.json({ 
      users,
      count: users.length 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}