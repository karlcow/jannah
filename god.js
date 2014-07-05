/*
 * God sees everything, knows everything, controls everything ...
 */

/* global setTimeout */

var acquire = require('acquire')
  , config = acquire('config')
  , events = require('events') 
  , http = require('http')
  , io = require('socket.io')
  , util = require('util')
  , _ = require('underscore')
  , bodyParser = require('body-parser')
  , compression = require('compression')
  , config = acquire('config')
  , events = require('events')
  , express = require('express')
  , http = require('http')
  ;

var God =  function(argv, done) {
  this.argv_ = argv;
  this.done_ = done;
  this._seraphim = {};
  this._server = null;
  this._backChannel = null;
  this.init();
};

God.prototype = new events.EventEmitter();

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
      console.log(seraph);
      if (seraph === undefined)
        return callback(Object.merge({"status" : "There doesn't seem to be any Seraph available "},
                                     self._seraphim));
      seraph.ip = "127.0.0.1";
      var seraphUrl = "http://" + seraph.ip + ":" + parseInt(config.SERAPH_PORT) + "/new";
      console.log(seraphUrl);
      res.redirect(302, seraphUrl);
      break;
    default:
      break;
  }
};

God.prototype._delegate = function() {
  var self = this;
  var seraphim = Object.keys(self._seraphim).map(function(key) {return self._seraphim[key];});
  var seraph = _.min(seraphim, function(seraph) {return seraph.activeAngels;});
  return seraph;
};

//God.prototype.
God.prototype._onConnect = function(socket) {
  var self = this;
  self._seraphim[socket.id] = {};
  socket.on('disconnect', self._onDisconnect.bind(self, socket));
  socket.on('seraphUpdate', self._onSeraphUpdate.bind(self, socket));
};

God.prototype._onSeraphUpdate = function(socket, status) {
  var self = this;
  console.log("On StatusUpdate !! " + socket.id + JSON.stringify(status));
  console.log('\n\n');
  self._seraphim[socket.id] = status;
};

God.prototype._onDisconnect = function(socket) {
  var self = this;
  self._seraphim = Object.reject(self._seraphim, socket.id);
  console.log('Active seraphim ' + JSON.stringify(self._seraphim));
  console.log('\n\n');  
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


/*
require('winston-papertrail').Papertrail;
var logger = new winston.Logger({
  transports: [
      new winston.transports.Papertrail({
          host: 'logs.papertrailapp.com',
          port: 38599
      })
  ]
});
*/