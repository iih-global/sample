require('dotenv').config();
module.exports = {
  "config_type": process.env.CONFIG_TYPE,
  "sitehost": process.env.SITEHOST,
  "siteport": process.env.SITEPORT,
  "host": process.env.HOST,
  "port": process.env.PORT,
  "database": process.env.DATABASE,
  "username": process.env.DBUSERNAME,
  "password": process.env.PASSWORD,
  "dialect" : process.env.DIALECT,
  "jwtPrivateKey" : process.env.JWT_PRIVATE_KEY,
  "FRONT_URL": process.env.FRONT_URL,
  "SMTP_HOST" : process.env.SMTP_HOST,
  "SMTP_PORT" : process.env.SMTP_PORT,
  "SMTP_USER" : process.env.SMTP_USER,
  "SMTP_PASS" : process.env.SMTP_PASS,
  "SMTP_SEC" : process.env.SMTP_SEC
};