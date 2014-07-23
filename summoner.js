var acquire = require('acquire')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , config = acquire('config')
  , events = require('events')
  , express = require('express')   
  , http = require('http')
  , net = require('net')
  , spawn = require('child_process').spawn
  , sugar = require('sugar')
  , timers = require('timers') 
  , utilities = acquire('utilities')
  , winston = require('winston')
  ;

// TODO 
// Summoner should be moved to his own file.
var Summoner = module.exports = function(ip, port, callback) {
  this.init(ip, port, callback);
};

Summoner.prototype = new events.EventEmitter();

Summoner.prototype.init = function(ip, port, callback) {
  console.log(ip + ":" + port);
  var self = this;
  self._summonVerified = false;
  self.id = port; 
  self._ip = ip;
  self._port = port;
  self._callback = callback;
  self._angel = null;
  self._date = Date.create('today');
  self._angel = spawn("submodules/slimerjs/src/slimerjs", ["angel.js", ip, port]);
  self._noSpawnTimer = timers.setTimeout(function() { self._onNoSpawn(); }, 10000);
  self._angel.stdout.on('data', function(data) { console.log('stdout: ' + data); });
  self._angel.stderr.on('data', function(data) { console.log('stderr: ' + data); });
};

Summoner.prototype._kill = function() {
  var self = this;
  console.log("killing angel on port " + self.id);
  self._angel.kill();
  self.emit('exit');
};

Summoner.prototype.release = function() {
  var self = this;
  self._callback({url: "http://" + self._ip + ":" + this.id});
  self._monitor();
};

Summoner.prototype._onNoSpawn = function() {
  var self = this;
  self._callback({url: null});
  self._kill();
};

Summoner.prototype._monitor = function() {
  var self = this;
  timers.clearTimeout(self._noSpawnTimer);
  console.log("Angel: " + self.id + " is alive.");
  var uri = "http://127.0.0.1:" + self.id + "/ping";
  console.log(uri);
  var request = http.get(uri, function() { self._monitor(); })
                .on('error', function() { self._kill(); });
  request.setTimeout(10000, function() { self._kill(); });
};
