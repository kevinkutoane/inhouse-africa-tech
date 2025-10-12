# Database Upgrade Options for Lead Storage

## Current Problem
- Render free tier uses ephemeral storage
- `leads.json` file gets deleted on server restarts
- Leads are being lost

## Solution Options

### Option 1: MongoDB Atlas (Free Tier)
- **Pros:** Free tier, 512MB storage, persistent
- **Setup:** 
  1. Create MongoDB Atlas account
  2. Add connection string to environment variables
  3. Update server.js to use MongoDB instead of file storage

### Option 2: PostgreSQL (Render PostgreSQL)
- **Pros:** SQL database, good for structured data
- **Setup:**
  1. Add PostgreSQL service to your Render account
  2. Create leads table
  3. Update server.js to use PostgreSQL

### Option 3: External Email Service (Immediate Fix)
- **Pros:** No database needed, leads sent to your email
- **Setup:** Configure SMTP environment variables on Render
- **Variables needed:**
  - SMTP_HOST
  - SMTP_PORT  
  - SMTP_USER
  - SMTP_PASS
  - LEAD_NOTIFY_TO (your email)
  - LEAD_NOTIFY_FROM

### Option 4: Third-party Form Service
- **Pros:** Zero backend management
- **Services:** Formspree, Netlify Forms, Typeform
- **Setup:** Replace form action with service endpoint

## Recommended: MongoDB Atlas + Email Notifications
This gives you both persistent storage AND email notifications.