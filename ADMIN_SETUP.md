# Admin Portal Setup Guide

## Setting Up Your Admin Password

### Step 1: Generate Password Hash

Run the hash generator script with your desired password:

```bash
node scripts/generate-admin-hash.js YourSecurePassword123
```

This will output something like:
```
ADMIN_PASSWORD_HASH=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
```

### Step 2: Update Local Environment

1. Create a `.env` file in the project root (if it doesn't exist):
   ```bash
   cp .env.example .env
   ```

2. Add your hash to `.env`:
   ```bash
   ADMIN_PASSWORD_HASH=your_generated_hash_here
   ```

### Step 3: Update Render Environment Variables

1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Select your `inhouse-africa-tech` service
3. Navigate to the **Environment** tab
4. Add a new environment variable:
   - **Key:** `ADMIN_PASSWORD_HASH`
   - **Value:** (paste your generated hash)
5. Click **Save Changes**

Your service will automatically redeploy with the new password.

### Step 4: Access the Admin Portal

Visit your admin portal:
- **GitHub Pages:** https://kevinkutoane.github.io/inhouse-africa-tech/admin.html
- **Render:** https://inhouse-africa-tech.onrender.com/admin.html

Login with your new password!

## Security Best Practices

✅ **Do:**
- Use a strong, unique password (12+ characters, mix of letters, numbers, symbols)
- Keep your `.env` file secure and never commit it to git
- Change your password regularly
- Use different passwords for different environments (dev/prod)

❌ **Don't:**
- Use simple passwords like "admin123" or "password"
- Share your password hash publicly
- Commit `.env` to version control
- Use the same password as other services

## Testing Locally

To test with your new password locally:

1. Make sure your `.env` file has the `ADMIN_PASSWORD_HASH`
2. Start your server:
   ```bash
   npm start
   ```
3. Visit: http://localhost:3000/admin.html
4. Login with your password

## Troubleshooting

### "Invalid password" error
- Ensure the hash in Render matches what you generated
- Clear your browser cache and session storage
- Verify you're using the correct password

### Can't access admin portal
- Check that your backend is running on Render
- Verify the API endpoint is accessible: https://inhouse-africa-tech.onrender.com/api/admin/hash
- Check browser console for errors (F12)

### Forgot your password
1. Generate a new hash using the script
2. Update Render environment variables
3. Wait for automatic redeployment (~2 minutes)

## Quick Password Change

```bash
# Generate new hash
node scripts/generate-admin-hash.js MyNewPassword123

# Copy the output hash and update Render environment variables
# Service will auto-redeploy
```

---

**Need help?** Check the [main README](../README.md) or open an issue.
