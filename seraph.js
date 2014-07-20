var acquire = require('acquire')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , config = acquire('config')
  , events = require('events')
  , express = require('express')   
  , http = require('http')
  , io = require('socket.io-client')
  , net = require('net')
  , Seq = require('seq')
  , spawn = require('child_process').spawn
  , sugar = require('sugar')
  , timers = require('timers') 
  , utilities = acquire('utilities')
  , Summoner = acquire('summoner')
  , winston = require('winston')
  , osm = require("os-monitor")
  ;

var Seraph = module.exports = function() {
  this._angels = {};
  this._backChannel = null;
  this._health = {};
  this._ip = "";
  this._maxAngels = 0;
  this._reserverdPorts = [];  
  this._location = {};
  this.init();
};

Seraph.prototype.init = function() {
  var self = this;    
  var app = express();
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.all('*', function(req, res) { self._handleRequest(req, res); });
  app.listen(config.SERAPH_PORT);

  self._openBackChannel(function(err) { if (err) console.log(err); });
};

Seraph.prototype._exit = function(err){
  var self = this;
  if(err)
    console.warn('Seraph is going down because of an error ' + err);
  else
    console.log('Seraph exited cleanly ...');
  self._backChannel.emit('disconnect', err);
};

Seraph.prototype._openBackChannel = function(done) {
  var self = this;
  var seraph = require(config.SERAPH_CONFIG_PATH);
  self._maxAngels = seraph.maxAngels;
  self._location = seraph.location;
  Seq()
    .seq(function() {
      utilities.getNetworkIP(this);
    })
    .seq(function(data) {
      self._ip = data.ip;
      self._monitorHealth(this);
    })
    .seq(function() {
      self._talkToGod(this);
    })
    .seq(function(){
      console.log("Seraph up and going");      
    })
    .catch(function(err) {
      done(err);
    })
    ;
};

Seraph.prototype._monitorHealth = function(done) {
  var self = this;
  osm.start();    
  osm.on('monitor', function(event) {
    self._health = Object.reject(event, "type");
  });
  done();
};

Seraph.prototype._talkToGod = function(done) {
  var self = this;
  // Establish the back channel to God !
  var socketOptions = {
    transports : ['websocket']
  };

  self._backChannel = io.connect('http://' + config.GOD_ADDRESS + ':' + config.GOD_BACK_CHANNEL_PORT, socketOptions);

  self._backChannel.on('connect_error', function(err) {
    console.log('BackChannel Error received : ' + err);
    done(err);
  });

  self._backChannel.on('connect', function() {
    console.log('BackChannel open and ready for use');
    // Every minute send an health update to God.
    self._sendUpdateToGod.bind(self);
    var tenSeconds = 10 * 1000;
    setInterval(self._sendUpdateToGod.bind(self), tenSeconds);
  });
};

Seraph.prototype._sendUpdateToGod = function() {
  var self = this;
  self._backChannel.emit('seraphUpdate', {health : self._health,
                                         ip : self._ip,
                                         activeAngels : Object.size(self._angels),
                                         maxAngels: self._maxAngels,
                                         location : self._location});
};

Seraph.prototype._new = function(callback) {
  var self = this;
  
  var func = function(port) {
    if (port === null)
      return callback({url: null});

    var onExit = function() {
      console.log("Purging :" + port);
      self._angels[port].removeAllListeners(['exit']);
      delete self._angels[port];
      self._reserverdPorts.splice(self._reserverdPorts.indexOf(self.id), 1);
      self._sendUpdateToGod();
    };
    
    self._reserverdPorts.push(port);
    self._angels[port] = new Summoner(port, callback);
    self._angels[port].on('exit', onExit);
    // fire off a new update now that we have a new angel 
    self._sendUpdateToGod();
  }; 
  utilities.getFreePort(self._reserverdPorts, func);
};

Seraph.prototype._announceAngel = function(data, callback) {
  var self = this;
  var port = data.port;
  console.log(data.port);
  self._angels[port].release();
  callback({});
};

Seraph.prototype._handleRequest = function(req, res) {
  var self = this;
  var url = req.url;
  console.log(url);
  var data = req.body;    
  var callback = function(data) {
    res.statusCode = 200;
    res.write(JSON.stringify(data));
    res.end();
  };
  
  switch (url) {
    case "/new":
      self._new(callback);
      break;
    case "/announceAngel":
      self._announceAngel(data, callback);
      break;
    default:
      break;
  }
};

new Seraph();