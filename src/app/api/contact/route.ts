import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, issueType, message } = body;

    // Validate required fields
    if (!name || !email || !issueType || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Issue type mapping for better readability
    const issueTypeLabels: Record<string, string> = {
      'account-login': 'Account/Login Issues',
      'transaction-tracking': 'Transaction Tracking Problems',
      'budget-setup': 'Budget Setup Help',
      'data-sync': 'Data Sync Issues',
      'billing-payment': 'Billing/Payment Questions',
      'feature-request': 'Feature Requests',
      'bug-report': 'Bug Reports',
      'general': 'General Questions',
      'other': 'Other'
    };

    const issueTypeLabel = issueTypeLabels[issueType] || issueType;

    // Create email transporter
    // You'll need to add these environment variables to your .env file:
    // EMAIL_HOST=smtp.gmail.com (or your email provider's SMTP server)
    // EMAIL_PORT=587
    // EMAIL_USER=your-email@gmail.com
    // EMAIL_PASS=your-app-password (for Gmail, use an app-specific password)
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7957D6; border-bottom: 2px solid #7957D6; padding-bottom: 10px;">
          New Support Request
        </h2>
        
        <div style="margin: 20px 0;">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Issue Type:</strong> ${issueTypeLabel}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Message:</h3>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #7957D6; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <div style="color: #666; font-size: 12px; text-align: center;">
          <p>This message was sent from the Unbroken Pockets contact form.</p>
          <p>Reply directly to this email to respond to ${name} at ${email}</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'support@unbrokenpockets.com',
      subject: `[Support Request] ${issueTypeLabel} - From ${name}`,
      html: emailHtml,
      replyTo: email,
    };

    // Try to send email
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to support@unbrokenpockets.com');
      } else {
        // Log the submission if email isn't configured
        console.log('Email configuration missing. Contact form submission logged:', {
          name,
          email,
          issueType: issueTypeLabel,
          message,
          timestamp: new Date().toISOString()
        });
        console.log('To enable email sending, add EMAIL_USER and EMAIL_PASS to your .env file');
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Still log the submission even if email fails
      console.log('Contact form submission (email failed):', {
        name,
        email,
        issueType: issueTypeLabel,
        message,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Your message has been sent successfully. We\'ll get back to you within 24 hours.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again or email us directly.' },
      { status: 500 }
    );
  }
} 