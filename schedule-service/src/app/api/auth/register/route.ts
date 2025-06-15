import { NextRequest, NextResponse } from 'next/server';
import { userStorageDB as userStorage } from '@/lib/userStorage';
import { generateToken } from '@/lib/auth';
import { CreateUserRequest } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    
    if (!body.userId || !body.password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
        { status: 400 }
      );
    }

    const user = await userStorage.createUser(body);
    const userSession = {
      id: user.id
    };
    
    const token = generateToken(userSession);
    
    return NextResponse.json({
      user: userSession,
      token
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User ID already exists') {
      return NextResponse.json(
        { error: 'User ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}