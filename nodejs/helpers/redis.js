const redis = require("redis");

const redisClient = redis
  .createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  })
  .on("error", (err) => console.log(err))
  .on("connect", () => console.log(`Redis connected successfully.`));
redisClient.connect();
global.redisClient = redisClient;

/**
 *
 * @param {String} key
 * @param {Any} value
 */
exports.set = async (key, value) => {
  try {
    await redisClient.set(key, JSON.stringify(value));
  } catch (error) {
    console.log("set error", error);
  }
};

/**
 *
 * @param {String} key
 */
exports.get = async (key) => {
  try {
    let data = await redisClient.get(key);
    return JSON.parse(data);
  } catch (error) {
    console.log("get error", error);
  }
};
