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
  , io = require('socket.io')
  , Papertrail = require('winston-papertrail').Papertrail
  , util = require('util')
  , sugar = require('sugar')
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
  
  this._debug = false;

  if(argv[2])
    this._debug = argv[2] === "debug";

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
  var body = req.body;

  var callback = function(data) {
    res.statusCode = 200;
    res.write(JSON.stringify(data));
    res.end();
  };

  var parts = url.split("/");
  var action = parts.last();
  console.log("------- Requessted -------");
  console.log(url);
  console.log(body);
  console.log('parts ' + parts.toString());
  console.log("--------------------------");

  switch (action) {
    case "new":
      var country = null
        , city = null
        ;

      if(parts.length === 3){
        country = parts[0];
        city = parts[1];
      }
      else if (body && Object.has(body, 'country')){
        country = body.country;
        city = body.city;
      }
      
      var seraph = self._delegate(country, city);

      if (!seraph){
        logger.warn('New request for an Angel failed because God doesnt think any are available !');
        callback(Object.merge({"status" : "There doesn't seem to be any Seraph available "},
                            self._seraphim));
        break;
      }
      seraph.ip = self._debug ? "127.0.0.1" : seraph.ip;
      var seraphUrl = "http://" + seraph.ip + ":" + parseInt(config.SERAPH_PORT) + "/new";
      logger.info('New request for an Angel - redirect to ' + seraphUrl);
      res.redirect(302, seraphUrl);
      break;
    case "health":
      callback(self._locationBasedView(false));
      break;
    case "locations":
      callback(self._locationBasedView(true));
      break;
    default:
      callback("What was that ?, didn't recognize your call.");     
      break;
  }
};

God.prototype._locationBasedView = function(forPublicView){
  var self = this;
  var formatted = {};

  Object.values(self._seraphim, function(seraph){
    var location = seraph.location;
    if(!Object.has(formatted, location.country.toLowerCase()))
      formatted[location.country.toLowerCase()] = [];
    var newRequest = "/" + location.country.toLowerCase() + "/" + location.city.toLowerCase() + "/new";
    formatted[location.country.toLowerCase()].push({city: location.city.toLowerCase(), path: newRequest, health: seraph.health, availableAngels : seraph.maxAngels - seraph.activeAngels});
  });
  
  if(forPublicView)
    formatted = Object.reject(formatted, "health");

  return JSON.stringify(formatted);
};

God.prototype._delegate = function(country, city) {
  var self = this;
  var notFound = true;
  var ignore = [];
  var theChosenOne = null;
  console.log('delegate ' + country + city);
  while(notFound){
    var seraph = self._mostIdleSeraph(country, city, ignore);
    if(!seraph)
      break;
    // high io will cause high load avg put not mem issues
    // often points to browser issues, watch this first.
    if(seraph.health.loadavg.average() > 4){
      ignore.push(seraph.ip);
      continue;
    }
    // check for mem issues
    // check for high cpu
    theChosenOne = seraph;
    notFound = false;
  }

  console.log('delegate found ' + JSON.stringify(theChosenOne));

  return theChosenOne;
};

// Finds a seraph which has the least number of active angels going on.
God.prototype._mostIdleSeraph = function(country, city, ignore){
  var self = this;
  var seraphim = Object.values(self._seraphim);

  seraphim = seraphim.filter(function(seraph) {
    if(!country) // we don't care about location here. 
      return true;

    if(ignore.some(seraph.ip))
      return false;

    if(seraph.location.country === country && (seraph.location.city === city || !city))
      return true;
    else
      return false;
  });

  return seraphim.max(function(seraph) {return seraph.maxAngels - seraph.activeAngels;});  
};

God.prototype._onConnect = function(socket) {
  var self = this;
  socket.on('disconnect', self._onDisconnect.bind(self, socket));
  socket.on('seraphUpdate', self._onSeraphUpdate.bind(self, socket));
};

God.prototype._onSeraphUpdate = function(socket, status) {
  var self = this;
  logger.info("StatusUpdate : " + socket.id + ', status : ' + JSON.stringify(status));
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
  
  var args = process.argv;

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
