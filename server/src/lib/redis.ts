import Redis from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: 13092,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (e) => console.error("Redis error", e));

export default redisClient;
