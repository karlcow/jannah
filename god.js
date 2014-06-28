/*
 * God sees everything, knows everything, controls everything ...
 */
var acquire = require('acquire')
  , config = acquire('config')
  , events = require('events') 
  , fs = require('fs')  
  , http = require('http')  
  , io = require('socket.io')  
  , os = require('os')
  , sugar = require('sugar')
  , util = require('util')  
  , winston = require('winston')   
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
  this.seraphim_ = {};
  this.server_ = null;
  this.backChannel_ = null;
  this.init();
}

util.inherits(God, events.EventEmitter);

God.prototype.init = function() {
  var self = this;
  self.server_ = http.createServer(self.httpHandler);
  self.backChannel_ = new io();
  self.backChannel_.on('connection', self.onConnect.bind(self));
  //self.server_.listen(80);
  self.backChannel_.listen(3000);
}

God.prototype.httpHandler = function (req, res) {
  console.log('http handler');
  res.writeHead(200);
  res.end();
}

God.prototype.onConnect = function(socket) {
  var self = this;
  console.log("On Connect.");
  self.seraphim_[socket.id] = {"status" : {}};
  socket.on('disconnect', self.onDisconnect.bind(self, socket));
  socket.on('seraphUpdate', self.onSeraphUpdate.bind(self, socket));
  console.log('active seraphim ' + JSON.stringify(self.seraphim_));
  console.log('\n\n'); 
}

God.prototype.onSeraphUpdate = function(socket, status) {
  var self = this;
  console.log("On StatusUpdate !! " + socket.id + JSON.stringify(status));
  console.log('\n\n');
  self.seraphim_[socket.id] = status;
}

God.prototype.onDisconnect = function(socket) {
  var self = this;
  console.log("On DisConnect !! " + socket.id);
  self.seraphim_ = Object.reject(self.seraphim_, socket.id);
  console.log('active seraphim ' + JSON.stringify(self.seraphim_));
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
