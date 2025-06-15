import { NextRequest, NextResponse } from 'next/server';
import { userStorageDB as userStorage } from '@/lib/userStorage';
import { generateToken } from '@/lib/auth';
import { CreateUserRequest } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const user = await userStorage.createUser(body);
    const userSession = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    const token = generateToken(userSession);
    
    return NextResponse.json({
      user: userSession,
      token
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}