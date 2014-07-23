/* global exports, process, require */
/* jshint unused: false */

var config = exports
  , system = null
  , env    = null
  , sugar  = null;

try {
    system = require('system');
    env = system.env;
} catch (ex) {
    env = process.env;
    sugar = require('sugar');
}
    
function getEnv(value, defaultValue) {
    return (typeof value !== 'undefined' && value !== '') ? value : defaultValue;
}

// GOD
config.GOD_ADDRESS = getEnv(env.GOD_ADDRESS, "127.0.0.1");
config.GOD_PORT = getEnv(env.GOD_PORT, 7331);
config.GOD_BACK_CHANNEL_PORT = getEnv(env.GOD_BACK_CHANNEL_PORT, 3000);

// SERAPH TODO its seraph singular and seraphim plural ! 
config.SERAPH_PORT = getEnv(env.SERAPH_PORT, 8421);
config.SERAPH_CONFIG_PATH = getEnv(env.SERAPH_CONFIG_PATH, '/tmp/seraphConfig.json');
config.ANGEL_START_PORT = getEnv(env.ANGEL_START_PORT, 55550);
config.ANGEL_PORT_COUNT = getEnv(env.ANGEL_PORT_COUNT, 5);
try {
    config.ANGEL_PORTS = Number.range(config.ANGEL_START_PORT, config.ANGEL_START_PORT + config.ANGEL_PORT_COUNT - 1).every();
} catch (ex) {
}