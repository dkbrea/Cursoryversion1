"use client";

import { ArrowLeft, Send, Mail, User, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issueType: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const issueTypes = [
    { value: '', label: 'Select an issue type' },
    { value: 'account-login', label: 'Account/Login Issues' },
    { value: 'transaction-tracking', label: 'Transaction Tracking Problems' },
    { value: 'budget-setup', label: 'Budget Setup Help' },
    { value: 'data-sync', label: 'Data Sync Issues' },
    { value: 'billing-payment', label: 'Billing/Payment Questions' },
    { value: 'feature-request', label: 'Feature Requests' },
    { value: 'bug-report', label: 'Bug Reports' },
    { value: 'general', label: 'General Questions' },
    { value: 'other', label: 'Other' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.issueType) {
      newErrors.issueType = 'Please select an issue type';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', issueType: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/landing" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-8 sm:p-12">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-6 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
              Contact Support
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Have a question or need help? We're here to assist you. Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="font-medium">Message sent successfully!</span>
              </div>
              <p className="text-sm mt-1 ml-7">We'll get back to you within 24 hours.</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Failed to send message</span>
              </div>
              <p className="text-sm mt-1">Please try again or email us directly at support@unbrokenpockets.com</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  errors.name ? 'border-red-500' : 'border-border/30 hover:border-primary/30'
                }`}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  errors.email ? 'border-red-500' : 'border-border/30 hover:border-primary/30'
                }`}
                placeholder="Enter your email address"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Issue Type Dropdown */}
            <div>
              <label htmlFor="issueType" className="block text-sm font-medium text-foreground mb-2">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Issue Type *
              </label>
              <select
                id="issueType"
                value={formData.issueType}
                onChange={(e) => handleInputChange('issueType', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  errors.issueType ? 'border-red-500' : 'border-border/30 hover:border-primary/30'
                }`}
                disabled={isSubmitting}
              >
                {issueTypes.map((type) => (
                  <option key={type.value} value={type.value} disabled={type.value === ''}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.issueType && (
                <p className="text-red-500 text-sm mt-1">{errors.issueType}</p>
              )}
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Message *
              </label>
              <textarea
                id="message"
                rows={6}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${
                  errors.message ? 'border-red-500' : 'border-border/30 hover:border-primary/30'
                }`}
                placeholder="Please describe your issue or question in detail..."
                disabled={isSubmitting}
              />
              {errors.message && (
                <p className="text-red-500 text-sm mt-1">{errors.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 10 characters ({formData.message.length}/10)
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground py-3 px-6 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Message
                  </div>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-border/30 text-center">
            <p className="text-sm text-muted-foreground">
              You can also reach us directly at{' '}
              <a 
                href="mailto:support@unbrokenpockets.com" 
                className="text-primary hover:text-primary/80 transition-colors underline"
              >
                support@unbrokenpockets.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 