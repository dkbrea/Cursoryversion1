"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              Effective Date: June 2, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <div className="space-y-8 text-foreground/90">
              <div>
                <p className="text-lg leading-relaxed">
                  Welcome to Unbroken Pockets ("we," "us," "our"). Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our services via the website unbrokenpockets.com and related applications.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  1. Information We Collect
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Personal Information:</h3>
                    <p>Name, email address, account details when you sign up.</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Financial Information:</h3>
                    <p>Inputted income, expenses, debts, and budgets you enter into the app.</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Usage Data:</h3>
                    <p>How you interact with the app, IP address, browser type, and device identifiers.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  2. How We Use Your Information
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>Provide, maintain, and improve the service.</li>
                  <li>Communicate with you about updates, promotions, or support.</li>
                  <li>Analyze usage to improve user experience.</li>
                  <li>Maintain security and prevent fraud.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  3. Data Sharing
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>We do not sell your personal or financial data.</li>
                  <li>We may share data with trusted service providers for hosting, analytics, or payment processing under strict confidentiality.</li>
                  <li>We may disclose information if required by law or to protect our rights.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  4. Your Choices
                </h2>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>You can update or delete your account at any time.</li>
                  <li>You can opt out of promotional communications.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  5. Data Security
                </h2>
                <p>We use encryption, secure servers, and access controls to protect your data.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  6. Children
                </h2>
                <p>Our services are not intended for children under 13.</p>
              </section>

              <section>
                <h2 className="text-2xl font-bold gradient-text mb-4">
                  7. Changes
                </h2>
                <p>We may update this policy and will notify users of significant changes.</p>
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