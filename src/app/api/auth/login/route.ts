import { NextRequest, NextResponse } from 'next/server';
import { userStorage } from '@/lib/userStorage';
import { generateToken } from '@/lib/auth';
import { LoginRequest } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    
    if (!body.userId || !body.password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
        { status: 400 }
      );
    }

    const user = await userStorage.verifyPassword(body.userId, body.password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userSession = {
      id: user.id
    };
    
    const token = generateToken(userSession);
    
    return NextResponse.json({
      user: userSession,
      token
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}