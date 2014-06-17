var config = exports
  , env = process.env
  ;

// GOD
config.GOD_ADDRESS = getEnv(env.GOD_ADDRESS, "127.0.0.1");
config.GOD_PORT = getEnv(env.GOD_PORT, 4444);
config.GOD_CHANNEL = getEnv(env.GOD_CHANNEL, 6666);
