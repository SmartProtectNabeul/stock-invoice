# Supabase Authentication & Account Management Setup Guide

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project name: `stock-invoice`
4. Choose your region
5. Set a strong password
6. Wait for project to be created

## Step 2: Get Your Credentials

1. Go to Settings → API in your Supabase project
2. Copy your project URL (e.g., `https://YOUR_PROJECT_ID.supabase.co`)
3. Copy your `anon` public key
4. Update `supabase-config.js` with these values:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

## Step 3: Create Database Tables

In Supabase SQL Editor, run the following SQL commands in order:

### 1. User Profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  activation_key_used TEXT,
  created_at TIMESTAMP DEFAULT now(),
  approved_at TIMESTAMP,
  suspended_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### 2. Activation Keys Table
```sql
CREATE TABLE activation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT (now() + interval '30 days'),
  created_by TEXT
);

CREATE INDEX idx_activation_keys_key ON activation_keys(key);
CREATE INDEX idx_activation_keys_used ON activation_keys(is_used);
```

### 3. User Stocks Table
```sql
CREATE TABLE user_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10, 3),
  stock INTEGER DEFAULT 0,
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  image TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_stocks_user_id ON user_stocks(user_id);
```

### 4. User Invoices Table
```sql
CREATE TABLE user_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  client_name TEXT,
  client_email TEXT,
  total_amount DECIMAL(12, 3),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  invoice_data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_invoices_user_id ON user_invoices(user_id);
CREATE INDEX idx_user_invoices_number ON user_invoices(invoice_number);
```

## Step 4: Configure Authentication URLs (CRITICAL)

**This step is REQUIRED for email verification to work!**

1. **Go to Supabase project → Settings → Authentication**

2. **Update Site URL:**
   - Find the **"Site URL"** field
   - Change from `http://localhost:3000` to:
     ```
     https://smartprotectnabeul.github.io/stock-invoice/
     ```

3. **Add Redirect URLs** (click "Add redirect URL" for each):
   ```
   https://smartprotectnabeul.github.io/stock-invoice/
   https://smartprotectnabeul.github.io/stock-invoice/index.html
   https://smartprotectnabeul.github.io/stock-invoice/admin.html
   ```
   
   **Local testing (if needed):**
   ```
   http://localhost/stock-invoice/
   http://localhost/stock-invoice/index.html
   ```

4. **Click "Save"**

---

## Step 5: Email Notifications (Optional)

Email notifications are **optional** and work automatically when a user is approved.

### Option 1: Use Supabase Built-in Email (Recommended)
1. Go to Settings → Email Templates
2. Verify "Confirm signup" is enabled
3. Users will receive verification emails automatically

### Option 2: Use SendGrid (For production)
1. Get SendGrid API key from https://sendgrid.com
2. Go to Settings → Email Configuration
3. Select "SendGrid" and paste your API key

### Option 3: Skip emails
Users can still signup - just no email notifications.

**Note:** After Step 4 is done, email links will work properly!

## Step 5: Enable Row Level Security (RLS)

### Activation Keys RLS (IMPORTANT - Do this first!)
```sql
ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated users) to check if a key is valid
CREATE POLICY "Anyone can check unused keys" ON activation_keys
  FOR SELECT USING (is_used = false);
```

### User Profiles RLS
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );
```

### User Stocks RLS
```sql
ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stocks" ON user_stocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stocks" ON user_stocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stocks" ON user_stocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stocks" ON user_stocks
  FOR DELETE USING (auth.uid() = user_id);
```

### User Invoices RLS
```sql
ALTER TABLE user_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON user_invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON user_invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON user_invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON user_invoices
  FOR DELETE USING (auth.uid() = user_id);
```

## Step 6: Generate Initial Admin Activation Keys

```sql
INSERT INTO activation_keys (key, created_by) VALUES
  ('ADMIN-' || gen_random_uuid()::text, 'system'),
  ('ADMIN-' || gen_random_uuid()::text, 'system'),
  ('ADMIN-' || gen_random_uuid()::text, 'system');
```

Get these keys from Supabase and share them with your admin users to sign up.

## Step 7: Create Additional Admin Accounts

After generating activation keys:
1. Go to http://localhost/stock-invoice (or your domain)
2. Click "Sign Up"
3. Enter email, password, and use one of the ADMIN- keys
4. After signup, go to Supabase → user_profiles table
5. Update the new user's role to 'admin' and status to 'approved'

## Step 8: Access Admin Dashboard

Once admin account is approved, visit:
- http://localhost/stock-invoice/admin.html

## Features Implemented

### For All Users:
- ✅ Email/Password registration with activation key
- ✅ Login and session management
- ✅ Personal stock management (Create, Read, Update, Delete)
- ✅ Invoice creation and viewing
- ✅ Account dashboard

### For Admins:
- ✅ View pending user approvals
- ✅ Approve/Reject users
- ✅ Suspend/Resume accounts
- ✅ View all users and their status
- ✅ Generate activation keys
- ✅ Manage system settings

### Automatic:
- ✅ Email notifications on account approval (when configured)
- ✅ Account status checks on login
- ✅ Real-time data sync via Supabase subscriptions

## Troubleshooting

### Users can't sign up:
- Check if activation key is valid and not already used
- Verify Supabase auth is enabled in Settings → Authentication

### Email notifications not working:
- Configure Supabase email service in Settings → Email Templates
- Or use external service like SendGrid via Edge Functions

### RLS blocking access:
- Verify user is authenticated: `supabaseClient.auth.getUser()`
- Check RLS policies are correctly set in Table Editor
- Use Supabase Studio → Logs to debug

## Security Notes

- All credentials are stored securely in Supabase Auth
- Passwords are hashed with bcrypt
- Activation keys expire after 30 days
- RLS prevents users from accessing other users' data
- Admin panel requires 'admin' role in user_profiles
