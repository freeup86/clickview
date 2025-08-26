# ClickUp API Setup Guide

## Getting Your ClickUp API Key

1. **Log in to ClickUp**
   - Go to https://app.clickup.com and log in to your account

2. **Navigate to Apps Settings**
   - Click on your avatar/profile picture in the bottom left corner
   - Select "Apps" from the menu
   - Or go directly to: https://app.clickup.com/settings/apps

3. **Generate API Token**
   - Scroll down to find "API Token" section
   - Click on "Generate" button
   - Copy the generated token (it will look like: `pk_123456_XXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - **Important**: Save this token securely as you won't be able to see it again

## Running the Setup Script

Once you have your API key, run the setup script to configure your workspace:

```bash
cd backend
npx tsx scripts/setup-clickup-workspace.ts
```

The script will:
1. Prompt you for your ClickUp API key
2. Test the connection to verify the key is valid
3. Fetch your available teams/workspaces
4. Let you select which team to connect
5. Store the encrypted API key in the database
6. Show you available spaces and lists to verify the connection

## Verifying the Setup

After setup, you can verify everything is working:

```bash
npx tsx scripts/check-workspace.ts
```

This will show:
- Your workspace configuration
- Connection status to ClickUp
- Available spaces in your team

## Troubleshooting

If you encounter issues:

1. **Invalid API Key Error**
   - Make sure you copied the entire API key including the `pk_` prefix
   - Verify the key hasn't expired or been revoked

2. **No Teams Found**
   - Ensure your ClickUp account has at least one workspace/team
   - Check that your API key has the necessary permissions

3. **Connection Failed**
   - Verify your internet connection
   - Check if ClickUp's API is accessible: https://api.clickup.com/api/v2/user

## Required ClickUp Custom Fields

For the Task Completion Dashboard to work properly, ensure your ClickUp workspace has:

- Tasks with completion dates (date_done field)
- Custom field: `overall_due_date` (Date field type)
- Custom field: `modality` (Dropdown or Text field)
- Custom field: `value_stream` (Dropdown or Text field)
- Priority field (built-in ClickUp field)

These fields are used by the dashboard widgets to filter and display task data.