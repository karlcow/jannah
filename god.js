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

var Reign =  function(task, argv, done) {
  this.duty_ = task;
  this.argv_ = argv;
  this.done_ = done;
  this.seraphim = {};
  this.god_ = null;
  this.duties_ = {};
  this.server_ = null;
  this.init();
}

util.inherits(Reign, events.EventEmitter);

Reign.prototype.init = function() {
  var self = this;

  self.loadDuties();

  self.god_ = io.connect(config.GOD_ADDRESS + '/channel', { port: config.GOD_CHANNEL, secure: true });
  self.god_.on('connect', self.onConnection.bind(self));
  self.god_.on('error', self.done_);
}

Reign.prototype.loadDuties = function() {
  var self = this;

  self.duties_ = {
    info: self.getInfo,
    seraphim: self.getSeraphs,
    state: self.getState,
    version: self.getVersion,
    ping: self.ping,
    newAngel : self.newAngel,
  };
}

Reign.prototype.onConnection = function() {
  var self = this;
  var duty = self.duties_[self.duty_];
  if (taskFunction) {
    duty.call(self, self.argv_);
  } else {
    self.done_(util.format('Hub task %s does not exist', self.duty_));
  }
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
  var task = process.argv[2]
    , taskArgs = process.argv.slice(4)
    , longReign = null
    ;

  setupSignals();

  if (task ) {
    longReign = new Reign(task, taskArgs, done);
  } else {
    usage();
    done();
  }
  setTimeout(function() {}, 10000);
}

main(); 