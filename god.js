/*
 * God sees everything, knows everything, controls everything ...
 */
var acquire = require('acquire')
  , os = require('os')
  , sugar = require('sugar')
  , winston = require('winston')
  , io = require('socket.io-client')
  , util = require('util')
  , events = require('events')
  , config = acquire('config')
  ;

require('winston-papertrail').Papertrail;

function setupSignals() {
  process.on('SIGINT', function() {
    process.exit(1);
  });
}

var logger = new winston.Logger({
  transports: [
      new winston.transports.Papertrail({
          host: 'logs.papertrailapp.com',
          port: 38599
      })
  ]
});

var Reign =  function(argv, done) {
  this.argv_ = argv;
  this.done_ = done;
  this.seraphim = {};
  this.god_ = null;
  this.server_ = null;
  this.init();
}

util.inherits(Reign, events.EventEmitter);

Reign.prototype.init = function() {
  var self = this;

  self.god_ = io.connect(config.GOD_ADDRESS + '/channel', { port: config.GOD_CHANNEL, secure: true });
  self.god_.on('connect', self.onConnection.bind(self));
  self.god_.on('error', self.done_.bind(self));
  self.god_.on('disconnect', self.onDisconnection.bind(self));
  self.god_.on('stateChanged', self.onStateChanged.bind(self));
}

Reign.prototype.onConnection = function() {
  var self = this;
  Console.log("OnConnection");
}

Reign.prototype.onDisconnection = function() {
  Console.log("Disconnection");
}

Reign.prototype.onStateChanged = function() {
  Console.log("onStateChanged");
}

Reign.prototype.ping = function(argv) {
  var self = this;
}

Reign.prototype.getInfo = function(argv) {
  var self = this;
}

Reign.prototype.getSeraphim = function(argv) {
  var self = this;
}

Reign.prototype.getState = function(argv) {
  var self = this;
}

Reign.prototype.getVersion = function(argv) {
  var self = this;
}

Reign.prototype.setState = function(argv) {
}

function usage() {
  console.log('Usage: node god.js [options]');
  console.log('');
  console.log('Options:');
  console.log('');

  console.log('\tgod state', '\tGets the state of God.');
  console.log('\tgod version', '\tGets the version of God');

  console.log('');
}

function done(err) {
  if (err) {
    console.warn(err);
    console.trace();
  }
  process.exit(err ? 1 : 0);
}

function main() {
  var args = process.argv.slice(4)
    , longReign = null
    ;

  setupSignals();

  if (args === 'help' ) {
    usage();
    done();
  }
  else{
    longReign = new Reign(args, done);
  }
  setTimeout(function() {}, 10000);
}

main();
