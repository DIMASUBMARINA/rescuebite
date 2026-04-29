require('dotenv').config(); // ADD THIS LINE AT THE VERY TOP

const { cleanEnv, str, port } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
});

module.exports = { env };   