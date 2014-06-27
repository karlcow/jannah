/* global require, module */
var acquire = require('acquire')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , config = acquire('config')
  , events = require('events')
  , express = require('express')   
  , http = require('http')
  , io = require('socket.io-client')
  , methodOverride = require('method-override')
  , reserverdPorts = []
  , spawn = require('child_process').spawn
  , sugar = require('sugar')
  , timers = require('timers')
  , util = require('util')  
  , utilities = acquire('utilities')
  , winston = require('winston')
  , osm = require("os-monitor")
  ;

// TODO 
// Summoner should be moved to his own file.
var Summoner = module.exports = function(port, callback) {
  this.init(port, callback);
};

Summoner.prototype = new events.EventEmitter();

Summoner.prototype.init = function(port, callback) {
  var self = this;
  self._summonVerified = false;
  reserverdPorts.push(port);
  self.id = port; 
  self._callback = callback;
  self._angel = null;
  self._date = Date.create('today');
  self._angel = spawn("slimerjs", ["angel.js", self.id]);
  self._noSpawnTimer = timers.setTimeout(function() { self._onNoSpawn(); }, 10000);
  self._angel.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });
  self._angel.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
};

Summoner.prototype._kill = function() {
  var self = this;
  console.log("killing angel on port " + self.id);
  self._angel.kill();
  self.emit('exit');
  reserverdPorts.splice(reserverdPorts.indexOf(self.id), 1);
};

Summoner.prototype.release = function () {
  var self = this;
  self._callback({url: "http://" + config.SEPHARM_ADDRESS + ":" + this.id});
  self._monitor();
};

Summoner.prototype._onNoSpawn = function () {
  var self = this;
  self._callback({url: null});
  self._kill();
};

Summoner.prototype._monitor = function() {
  var self = this;
  timers.clearTimeout(self._noSpawnTimer);
  console.log("Angel: " + self.id + " is alive.");
  var uri = "http://" + config.SEPHARM_ADDRESS + ":" + self.id + "/ping";
  console.log(uri);
  var request = http.get(uri, function() {
    self._monitor();
  }).on('error', function() {
    self._kill();
  });
  request.setTimeout(10000, function() {
    self._kill();
  });
};

/*---------------------------------------------*/
// todo plug in winston

var Seraph = module.exports = function() {
  this._angels = {};
  this.backChannel = null;
  this.health = {};
  this.init();
};

Seraph.prototype.init = function() {
  var self = this;    

  self.monitorHealth();
  osm.start();
  
  self.talkToGod();

  var app = express();
  app.use(compression());
  app.use(bodyParser());
  app.use(methodOverride());
  app.use(bodyParser.urlencoded({extended: true}));

  app.all('*', function(req, res) {
    self._handleRequest(req, res);
  });
  
  app.listen(config.SEPHARM_PORT);
};

Seraph.prototype.monitorHealth = function(){
  var self = this;    
  osm.on('monitor', function(event) {
    self.health = Object.reject(event, "type");
  });  
}

Seraph.prototype.talkToGod = function(){
  var self = this;
  // Establish the back channel to God !
  socketOptions = {
    transports : ['websocket']
  };

  self.backChannel = io.connect('http://localhost:3000', socketOptions);

  self.backChannel.on('connect_error', function(err){
    console.log('BackChannel Error received : ' + err)});

  self.backChannel.on('connect', function(){
    console.log('BackChannel open and ready for use');
    // Every minute send an health update to God. 
    var minutes = 1, the_interval = minutes * 60 * 1000;
    setInterval(function() {
      self.backChannel.emit('health', self.health), 3000}, the_interval);
  });

}

Seraph.prototype._new = function(callback) {
  var self = this;
  var func = function(port) {
    if (port === null) {
      return callback({url: null});
    }
    self._angels[port] = new Summoner(port, callback);
    self._angels[port].on('exit', function() {
      console.log("Purging :" + port);
      delete self._angels[port];
    });
  };
    
  utilities.getFreePort(reserverdPorts, func);
};

Seraph.prototype._announceAngel = function(data, callback) {
  var self = this;
  var port = data.port;
  console.log(data.port);
  self._angels[port].release();
  callback({});
};

Seraph.prototype._handleRequest = function (req, res) {
  var self = this;
  var url = req.url;
  var data = req.body;    
  var callback = function(data){
    res.statusCode = 200;
    res.write(JSON.stringify(data));
    res.end();
  };
  
  switch (url) {
    case "/new":
      self._new(callback);
      break;
    case "/announceAngel":
      console.log("---");
      self._announceAngel(data, callback);
      break;
    default:
      break;
  }
};

new Seraph();