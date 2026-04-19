# StockInvoice Pro - Complete Setup Guide

## 🎯 Overview

Your StockInvoice Pro application now includes:
- ✅ User Authentication (Email/Password)
- ✅ Account Approval Workflow
- ✅ Activation Keys System
- ✅ Admin Dashboard
- ✅ Account Suspension Management
- ✅ Email Notifications (optional)
- ✅ Personal Stock Management
- ✅ Invoice History

## 📋 Quick Start (5 steps)

### Step 1: Create Supabase Project
1. Go to **https://app.supabase.com**
2. Click **"New Project"**
3. Fill in:
   - Name: `stock-invoice`
   - Password: (choose strong password)
   - Region: (select closest to you)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project initialization

### Step 2: Get API Credentials
1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public key** (under `Project API keys`)
3. Save these for Step 4

### Step 3: Create Database Tables
1. In Supabase, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste ALL SQL from `SUPABASE_SETUP.md` file
4. Run each SQL block one by one
5. Tables should be created without errors

### Step 4: Update Configuration
1. Open `supabase-config.js` in your text editor
2. Replace:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```
   With your actual credentials from Step 2

3. Save the file

### Step 5: Generate First Admin Key
1. In Supabase SQL Editor, run:
   ```sql
   SELECT key FROM activation_keys WHERE is_used = false LIMIT 5;
   ```
2. If empty, run from `SUPABASE_SETUP.md` the "Generate Initial Admin Activation Keys" section
3. Copy one of the generated keys (starts with `ADMIN-` or `KEY-`)

## 🔐 First Admin Account Setup

### Create Admin Account
1. Open `http://localhost/stock-invoice` (or your domain)
2. Click **"Sign Up"** tab
3. Fill in:
   - Email: your@email.com
   - Password: (8+ characters)
   - Confirm Password: (same)
   - Activation Key: (paste the key from Step 5)
4. Click **"Create Account"**

### Approve Admin Account
1. Go to Supabase → **Table Editor**
2. Open `user_profiles` table
3. Find your email row
4. Change:
   - `status`: `approved`
   - `role`: `admin`
5. Click **"Update"**

### Access Admin Panel
1. Go to **http://localhost/stock-invoice/admin.html**
2. Login with your email and password
3. You should see:
   - Pending Approvals
   - All Users
   - Activation Keys
   - Settings

## 👥 User Management

### Create Activation Keys for Users
1. In Admin Panel, click **"Activation Keys"** tab
2. Click **"+ Generate Key"** button
3. (Optional) Add description
4. Click **"Generate"**
5. Copy the key and share with users

### Approve User Signups
1. In Admin Panel, click **"Pending Approvals"** tab
2. Review email address
3. Click **"Approve"** to accept or **"Reject"** to deny
4. User receives approval email (if configured)

### Suspend Accounts
1. In Admin Panel, click **"All Users"** tab
2. Find user
3. Click **"Suspend"** button
4. User cannot login until resumed

## 📱 User Features

### Login
1. Go to `http://localhost/stock-invoice`
2. Enter email and password
3. Click **"Sign In"**
4. You'll see your dashboard

### Import Stock
1. Click **"📥 Modèle"** to download template CSV
2. Fill in your products:
   ```
   ID,Name,Category,Price,Stock,Colors,Image
   P001,Product Name,Category,100.000,50,Red|Blue,
   ```
3. Click **"📂 Importer Stock"** and select file
4. Products appear in stock table

### Create Invoices
1. Select products from stock table
2. Click **"➕ Nouvelle Facture"**
3. Fill in company and client details
4. Adjust quantities, discounts, taxes
5. Click **"✅ Valider & Sauvegarder"**
6. View/Print invoices in "🧾 Factures" tab

## 📧 Email Notifications (Optional)

### Enable Email Sending
1. In Supabase, go to **Settings → Email Configuration**
2. Choose:
   - Built-in Supabase email (limited)
   - SendGrid integration
   - Your own SMTP server

### Default Email Template
Users receive approval email with message:
```
Your account has been approved! You can now login to StockInvoice Pro.
Email: [user-email]
```

## 🔧 Troubleshooting

### "Invalid activation key" error
- Check key hasn't been used before
- Verify key isn't expired (30 days from creation)
- Ensure admin copied it correctly

### Can't login after approval
- Check `user_profiles` table:
  - `status` should be `approved`
  - Account shouldn't be `suspended`
- Clear browser cache and try again

### Admin panel shows 403 error
- Verify your account `role` is set to `admin`
- Check `status` is `approved`
- Try logging out and back in

### Stock/Invoices not saving
- Check browser localStorage is enabled
- Verify Row Level Security (RLS) policies exist
- Check Supabase project is active

### Users can't see stocks/invoices
- RLS policies may be blocking access
- Verify user is logged in (check auth token)
- Check data was saved to correct `user_id`

## 🔒 Security Checklist

- [ ] Changed Supabase project password
- [ ] Kept `SUPABASE_ANON_KEY` private (don't share)
- [ ] Enabled Row Level Security (RLS) on all tables
- [ ] Set strong passwords for admin accounts
- [ ] Reviewed Supabase authentication settings
- [ ] Tested user isolation (users can't see others' data)

## 📁 File Structure

```
stock-invoice/
├── index.html                 # Main app + login UI
├── admin.html                 # Admin dashboard
├── supabase-config.js         # Supabase credentials
├── auth.js                    # Authentication logic
├── user-dashboard.js          # User data management
├── admin-dashboard.js         # Admin functions
├── SUPABASE_SETUP.md          # Database setup guide
├── README.md                  # This file
├── service-worker.js          # PWA support
├── manifest.json              # PWA manifest
└── model.csv                  # Sample data
```

## 🚀 Deployment

### Local Development
```bash
# Start XAMPP/WAMP
cd /path/to/stock-invoice
# Open: http://localhost/stock-invoice
```

### Production Deployment
1. Update domain in `index.html` and `admin.html`
2. Configure Supabase CORS in Settings → Authentication
3. Add your domain to CORS allowed origins
4. Set strong Supabase password
5. Enable HTTPS (required for Supabase)
6. Deploy files to web server

### PWA Installation
1. Visit app in Chrome/Edge
2. Click install icon (top-right)
3. App works offline with cached data
4. Syncs when connection restored

## 📞 Support

### Common Issues
- See **Troubleshooting** section above
- Check Supabase documentation: https://supabase.com/docs
- Review RLS policies in Table Editor

### Database Issues
- Check SQL syntax in Editor
- Verify table names match exactly
- Look at Supabase Logs (Logs tab)

## 🎓 Next Steps

1. **Customize branding**: Update logo in HTML
2. **Add more fields**: Extend `user_profiles` table
3. **SMS notifications**: Configure Twilio integration
4. **Payment integration**: Add Stripe for invoices
5. **API**: Build REST API for mobile app

## 📊 Database Schema

### user_profiles
Stores user account info and status

### activation_keys
One-time keys for account signup

### user_stocks
Products managed by each user

### user_invoices
Invoices created by users

See `SUPABASE_SETUP.md` for full schema details.

---

**Last Updated**: April 2026  
**Version**: 1.0.0
