require('dotenv').config();

const { cleanEnv, str, port } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  AGENTMAIL_API_KEY: str(),
  AGENTMAIL_INBOX_ID: str({ default: '' }),
  APP_BASE_URL: str({ default: 'http://localhost:3000' }),
});

module.exports = { env };
