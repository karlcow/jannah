/*
 * God sees everything, knows everything, controls everything ...
 * Handle Seraphs that only want one angel exclusively.
 */
 
var acquire = require('acquire')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , config = acquire('config')
  , express = require('express')
  , http = require('http')
  , geoip = require('geoip-lite')  
  , io = require('socket.io')
  , Papertrail = require('winston-papertrail').Papertrail
  , util = require('util')
  , winston = require('winston')
  ;

var logger = new winston.Logger({
  transports: [
      new Papertrail({
          host: 'logs.papertrailapp.com',
          port: 38599
      })
  ]
});

var God =  function(argv, done) {
  this._argv = argv;
  this._seraphim = {};
  this._server = null;
  this._backChannel = null;
  this.init();
};

God.prototype.init = function() {
  var self = this;
  self._backChannel = new io();
  self._backChannel.on('connection', self._onConnect.bind(self));
  self._backChannel.listen(config.GOD_BACK_CHANNEL_PORT);
  var app = express();
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.all('*', function(req, res) { self._handleRequest(req, res); });
  app.listen(config.GOD_PORT);
};

God.prototype._handleRequest = function(req, res) {
  var self = this;
  var url = req.url;
  var callback = function(data) {
    res.statusCode = 200;
    res.write(JSON.stringify(data));
    res.end();
  };
  
  switch (url) {
    case "/new":
      var seraph = self._delegate();
      if (!seraph){
        logger.warn('New request for an Angel failed because God doesnt think any are available !');
        callback(Object.merge({"status" : "There doesn't seem to be any Seraph available "},
                              self._seraphim));
        break;
      }
      // TODO temp, remove once live
      seraph.ip = "localhost";
      var seraphUrl = "http://" + seraph.ip + ":" + parseInt(config.SERAPH_PORT) + "/new";
      logger.info('New request for an Angel - redirect to ' + seraphUrl);
      res.redirect(302, seraphUrl);
      break;
    case "/health":
      callback(self._seraphim);
      break;
    case "/locations":
      callback(self.formatLocations());
      break;
    default:
      break;
  }
};

God.prototype.formatLocations = function(){
  var self = this;
  var result;
  result = Object.keys(self._seraphim).map(function(seraph){return seraph.location});
  return JSON.stringify(result);
}

God.prototype._delegate = function() {
  var self = this;
  var notFound = true;
  var ignore = [];
  var theChosenOne = null;

  while(notFound){
    var seraph = self._mostIdleSeraph(ignore);
    if(!seraph)
      break;
    // high io will cause high load avg put not mem issues
    // often points to browser issues, watch this first.
    if(seraph.health.loadavg.average() > 3){
      ignore.push(seraph);
      continue;
    }
    // check for mem issues
    // check for high cpu
    theChosenOne = seraph;
    notFound = false;
  }

  return theChosenOne;
};

// Finds a seraph which has the least number of active angels going on.
God.prototype._mostIdleSeraph = function(ignore){
  var self = this;
  var seraphim = Object.keys(self._seraphim).map(function(key) {return self._seraphim[key];});
  if(ignore)
    seraphim = seraphim.subtract(ignore);
  return seraphim.max(function(seraph) {return seraph.maxAngels - seraph.activeAngels;});  
};

God.prototype._onConnect = function(socket) {
  var self = this;
  // let the health updates begin. to avoid any race condition, fill in the blanks to begin with. 
  // there is no chance this seraph will be chosen to produce a tab
  self._seraphim[socket.id] = {"health":{"timestamp":0,"loadavg":[0],"uptime":0,"freemem":0,"totalmem":0},
                               "ip":null,"activeAngels":0,"maxAngels":0};
  socket.on('disconnect', self._onDisconnect.bind(self, socket));
  socket.on('seraphUpdate', self._onSeraphUpdate.bind(self, socket));
};

God.prototype._onSeraphUpdate = function(socket, status) {
  var self = this;
  var geo = geoip.lookup(status.ip);
  logger.info("StatusUpdate : " + socket.id + ', status : ' + JSON.stringify(status) + ' geo info : ' + JSON.stringify(geo));
  self._seraphim[socket.id] = status;
};

God.prototype._onDisconnect = function(socket, err) {
  var self = this;
  var seraph = Object.has(self._seraphim, socket.id) ? self._seraphim[socket.id] : null;
  
  if(err){
    logger.warn('A seraph went down, and we had an error - seraph - ' + JSON.stringify(seraph) + '\n err ' + err);
  }
  else if (seraph && !err){
    logger.info('A seraph went down ' +  JSON.stringify(seraph));
    self._seraphim = Object.reject(self._seraphim, socket.id);
  }
};

function main() {
  var args = process.argv.slice(4);

  process.on('SIGINT', function() {
    process.exit(1);
  });

  var done = function(err) {
    if (err) {
      console.warn(err);
      console.trace();
    }
    process.exit(err ? 1 : 0);
  };
    
  if (args === 'help' ) {
    console.log('Usage: node god.js [options]\nOptions:\n');
    console.log('\tgod state', '\tGets the state of God.');
    console.log('\tgod version', '\tGets the version of God\n');
    done();
  }
  else
    new God(args, done);
}

main();
