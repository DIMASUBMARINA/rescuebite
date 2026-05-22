require('dotenv').config({ path: '.env.test' });

process.env.DISABLE_CRON = 'true';

process.env.AGENTMAIL_API_KEY = 'test-key';
process.env.AGENTMAIL_INBOX_ID = 'test@test.agentmail.to';
