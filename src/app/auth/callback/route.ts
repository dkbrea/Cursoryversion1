import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
      }
      
      // Verification successful - redirect to success page or specified next page
      const successUrl = next || '/auth/success'
      return NextResponse.redirect(new URL(successUrl, requestUrl.origin))
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
    }
  }

  // No code provided - redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin))
} 