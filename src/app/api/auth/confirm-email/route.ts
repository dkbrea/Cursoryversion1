import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    // No token provided, redirect to login with error
    return NextResponse.redirect(
      new URL('/auth?error=invalid-confirmation-link', request.url)
    );
  }

  try {
    // Here you would verify the email confirmation token with your auth system
    // Replace this with your actual email verification logic
    
    /*
    // Example verification with Supabase or your auth provider:
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) {
      return NextResponse.redirect(
        new URL('/auth?error=confirmation-failed', request.url)
      );
    }
    */

    // For now, we'll assume verification is successful
    // In production, replace this with actual verification logic
    
    console.log('Email confirmation token received:', token);
    
    // Redirect to login page with success message
    return NextResponse.redirect(
      new URL('/auth?confirmed=true', request.url)
    );

  } catch (error) {
    console.error('Email confirmation error:', error);
    
    // Redirect to login with error message
    return NextResponse.redirect(
      new URL('/auth?error=confirmation-failed', request.url)
    );
  }
} 