# Capital.com API Setup Guide

This guide will help you properly set up your Capital.com API credentials to use with the Trade Tracker application.

## 1. Create a Capital.com Account

If you don't already have one:

1. Go to [Capital.com](https://capital.com/) and click "Sign Up"
2. Choose between a real account or demo account (recommended for testing)
3. Complete the registration process

## 2. Enable Two-Factor Authentication (2FA)

Capital.com requires 2FA to be enabled before you can create API keys:

1. Log in to your Capital.com account
2. Go to Account Settings
3. Select "Security"
4. Enable Two-Factor Authentication and follow the instructions

## 3. Generate an API Key

1. Log in to your Capital.com account
2. Go to Settings > API integrations
3. Click on "Generate API key"
4. You will be asked to enter your 2FA code
5. Provide a name for your API key (e.g., "Trade Tracker")
6. Set a custom password for your API key (this is different from your account password)
7. Choose an expiration date (optional - defaults to 1 year)
8. Click "Generate API Key"
9. **IMPORTANT**: Save the API key that is displayed. It will only be shown once!

## 4. Update Your .env File

Update the `.env` file in the root of your Trade Tracker project with your actual credentials:

```
CAPITAL_API_KEY=your_api_key_here  # The API key you just generated
CAPITAL_USERNAME=your_username     # Your Capital.com login username/email
CAPITAL_PASSWORD=your_password     # The custom password you set for this API key (not your account password)
CAPITAL_DEMO_MODE=true             # Set to true for demo account, false for live account
```

## 5. API Base URL

The application will automatically use the correct base URL based on the `CAPITAL_DEMO_MODE` setting:

- Demo account: `https://demo-api-capital.backend-capital.com/`
- Live account: `https://api-capital.backend-capital.com/`

## 6. Testing Your Setup

After updating your credentials:

1. Restart the application
2. Check the logs for successful authentication messages
3. Verify that the bot evaluation process can fetch market data and generate charts

## Troubleshooting

If you continue to experience authentication issues:

1. Double-check that your API key, username, and password are entered correctly
2. Ensure that 2FA is properly enabled on your Capital.com account
3. Verify that your API key has not expired or been deactivated
4. Check if your account has any restrictions that might prevent API access

For more detailed information about the Capital.com API, refer to their [official API documentation](https://open-api.capital.com/).
