/* global require, module */
var acquire = require('acquire'),
    config = acquire('config'),
    spawn = require('child_process').spawn,
    utilities = acquire('utilities'),
    events = require('events'),
    timers = require('timers'),
    reserverdPorts = [],
    express = require('express'),
    compression = require('compression'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    http = require('http');


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


var Seraph = module.exports = function() {
    this._angels = {};
    this.init();
};


Seraph.prototype.init = function() {
    var self = this;    
    var app = express();

    // gzip/deflate outgoing responses
    app.use(compression());
    app.use(bodyParser());
    app.use(methodOverride());
    app.use(bodyParser.urlencoded({extended: true}));

    app.all('*', function(req, res) {
        self._handleRequest(req, res);
    });
    
    app.listen(config.SEPHARM_PORT);
};


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