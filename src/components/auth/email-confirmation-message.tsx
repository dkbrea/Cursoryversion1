"use client";

import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EmailConfirmationMessage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    const error = searchParams.get('error');

    if (confirmed === 'true') {
      setMessage({
        type: 'success',
        text: 'Email confirmation successful!'
      });
    } else if (error) {
      let errorText = 'Email confirmation failed.';
      
      switch (error) {
        case 'invalid-confirmation-link':
          errorText = 'Invalid confirmation link. Please try again.';
          break;
        case 'confirmation-failed':
          errorText = 'Email confirmation failed. Please try again or contact support.';
          break;
        default:
          errorText = 'An error occurred during email confirmation.';
      }
      
      setMessage({
        type: 'error',
        text: errorText
      });
    }

    // Clear the message after 5 seconds
    if (confirmed || error) {
      const timer = setTimeout(() => {
        setMessage({ type: null, text: '' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!message.type) {
    return null;
  }

  return (
    <div className={`w-full max-w-md mb-4 p-4 rounded-xl border transition-all duration-300 ${
      message.type === 'success' 
        ? 'bg-green-500/10 border-green-500/20 text-green-600' 
        : 'bg-red-500/10 border-red-500/20 text-red-600'
    }`}>
      <div className="flex items-center gap-3">
        {message.type === 'success' ? (
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="font-medium">{message.text}</span>
      </div>
      {message.type === 'success' && (
        <p className="text-sm mt-1 ml-8 opacity-80">
          Please sign in below to access your account.
        </p>
      )}
    </div>
  );
} 