# Authentication Setup Instructions

## Supabase Configuration Required

To fix the "cannot connect to the server" error with authentication links, you need to configure the following in your Supabase dashboard:

### 1. Site URL Configuration
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Set the **Site URL** to: `http://localhost:3000` (for development)
4. For production, set it to your actual domain (e.g., `https://yourdomain.com`)

### 2. Redirect URLs Configuration
Add the following redirect URLs to the **Redirect URLs** section:

**For Development:**
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/success`
- `http://localhost:3000/auth/error`
- `http://localhost:3000/dashboard`

**For Production (replace with your domain):**
- `https://yourdomain.com/auth/callback`
- `https://yourdomain.com/auth/success`
- `https://yourdomain.com/auth/error`
- `https://yourdomain.com/dashboard`

### 3. Email Templates (Optional)
You can customize the email templates in **Authentication** > **Email Templates** to match your brand.

### 4. Environment Variables
Make sure your `.env` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How It Works

1. When a user signs up, they receive an email with a verification link
2. The link points to your `NEXT_PUBLIC_SITE_URL/auth/callback` route
3. The callback route processes the verification and redirects appropriately:
   - **Success**: Redirects to `/auth/success` or specified page
   - **Error**: Redirects to `/auth/error` with helpful information

## Testing

1. Sign up with a valid email address
2. Check your email for the verification link
3. Click the link - it should now work without "cannot connect to server" errors
4. You should be redirected to either the success page or dashboard

## Troubleshooting

If you still get connection errors:
1. Verify the Site URL in Supabase matches your `NEXT_PUBLIC_SITE_URL`
2. Ensure all redirect URLs are added to the allowed list
3. Check that your development server is running on the correct port
4. Clear your browser cache and cookies 