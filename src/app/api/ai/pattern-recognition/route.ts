import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeTransactionPatterns } from '@/ai/flows/pattern-recognition';
import { AIContextService } from '@/lib/ai-context-service';

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction, userId } = body;
    
    if (!userId || !transaction) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Check if AI is configured and enabled
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      console.log('AI analysis disabled - no API key configured');
      return NextResponse.json({ 
        anomalies: [],
        patterns: [],
        generatedAt: new Date().toISOString(),
      });
    }

    if (process.env.ENABLE_AI_FEATURES === 'false') {
      console.log('AI analysis disabled - ENABLE_AI_FEATURES=false');
      return NextResponse.json({ 
        anomalies: [],
        patterns: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Build context using the service - ensure date is properly parsed
    const contextService = new AIContextService(supabase);
    const transactionWithDate = {
      ...transaction,
      date: new Date(transaction.date)
    };
    const patternContext = await contextService.buildPatternContext(userId, transactionWithDate);

    // Generate pattern analysis
    const analysis = await analyzeTransactionPatterns({ patternContext });

    return NextResponse.json({ 
      anomalies: analysis.anomalies,
      patterns: analysis.patterns,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Pattern recognition error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate pattern analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 