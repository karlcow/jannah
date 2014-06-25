/*
 * God sees everything, knows everything, controls everything ...
 */
var acquire = require('acquire')
  , os = require('os')
  , sugar = require('sugar')
  , winston = require('winston')
  , io = require('socket.io-client')
  , events = require('events')
  , Server = require('socket.io')
  , util = require('util')  
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

var God =  function(argv, done) {
  this.argv_ = argv;
  this.done_ = done;
  this.seraphim = {};
  this.god_ = null;
  this.init();
}

util.inherits(God, events.EventEmitter);

God.prototype.init = function() {
  var self = this;
  self.god_ = new Server();
  self.god_.on('connection', self.onConnect.bind(self));
  self.god_.on('connect_error', self.done_.bind(self));
  self.god_.listen(3000);
}

God.prototype.onConnect = function(socket) {
  var self = this;
  console.log("On Connect !! ");
  console.log(socket);
  console.log('\n\n'); 
}

God.prototype.disConnect = function(socket) {
  var self = this;
  console.log("On DisConnect !! ");
  console.log(socket);
  console.log('\n\n');  
}

God.prototype.newListener = function(socket) {
  var self = this;
  console.log("On newListener !! ");
  console.log(socket);
  console.log('\n\n');
}

God.prototype.removeListener = function(socket) {
  var self = this;
  console.log("On removeListener !! ");
  console.log(socket);
  console.log('\n\n');
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
    , longGod = null
    ;

  setupSignals();

  if (args === 'help' ) {
    usage();
    done();
  }
  else{
    longGod = new God(args, done);
  }
  setTimeout(function() {}, 10000);
}

main();
