import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateGoalInsights } from '@/ai/flows/goal-insights';

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalsData, userId } = body;
    
    if (!userId || !goalsData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Check if AI is configured and enabled
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      console.log('Goal AI analysis disabled - no API key configured');
      return NextResponse.json({ 
        insights: [],
        generatedAt: new Date().toISOString(),
      });
    }

    if (process.env.ENABLE_AI_FEATURES === 'false') {
      console.log('Goal AI analysis disabled - ENABLE_AI_FEATURES=false');
      return NextResponse.json({ 
        insights: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user's transaction history for context
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('amount, detailed_type, date')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('date', { ascending: false })
      .limit(100);

    // Prepare context for AI analysis
    const goalContext = {
      goalsData,
      recentTransactions: recentTransactions || [],
      userId
    };

    // Generate insights using AI
    const insights = await generateGoalInsights({ goalContext });

    return NextResponse.json({ 
      insights: insights.insights,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Goal insights error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate goal insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 