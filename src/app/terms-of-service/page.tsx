"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
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
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-lg">
              Effective Date: June 2, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <div className="space-y-8 text-foreground/90">
              <div>
                <p className="text-lg leading-relaxed">
                  Welcome to Unbroken Pockets! By using our website (unbrokenpockets.com) or app, you agree to these Terms of Service.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  1. Use of Service
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>You must be at least 18 or have parental consent.</li>
                  <li>You agree to use the service for lawful purposes only.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  2. Accounts
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>You are responsible for maintaining the security of your account and password.</li>
                  <li>You agree to provide accurate, complete information.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  3. Fees and Payments
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>Certain features may require payment. All fees are disclosed before purchase.</li>
                  <li>We reserve the right to change pricing with notice.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  4. Intellectual Property
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>All content, branding, and software are owned by Unbroken Pockets and protected by copyright and trademark laws.</li>
                  <li>You may not copy, modify, or distribute our materials without permission.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  5. Termination
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>We may suspend or terminate accounts for violations of these terms.</li>
                  <li>You may cancel your account at any time.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  6. Disclaimers
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>Service is provided "as-is" without warranties.</li>
                  <li>We are not liable for financial decisions made using the app.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  7. Governing Law
                </h2>
                <p>These terms are governed by the laws of the State of Ohio, United States.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  Contact
                </h2>
                <p>
                  Email: <a href="mailto:support@unbrokenpockets.com" className="text-primary hover:text-primary/80 transition-colors underline">support@unbrokenpockets.com</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 