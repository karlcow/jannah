/*jslint node: true, indent: 2, maxlen: 100*/

var acquire = require('acquire'),
  config = acquire('config'),
  net = require('net');

var Utilities = module.exports;
Utilities.getFreePort = function (reservedPorts, callback) {
  var i = -1;

  var availablePorts = [];
  for (var p in config.ANGEL_PORTS) {
    if (reservedPorts.indexOf(config.ANGEL_PORTS[p]) === -1) {
      availablePorts.push(config.ANGEL_PORTS[p]);
    }
  }

  var _isPortFree = function (port, callback) {
    var client = new net.Socket();
    client.on('error', function () {
      client.destroy();
      callback(true);
    });
    client.connect(port, "localhost", function () {
      client.destroy();
      callback(false);
    });
  };

  var findFreePort = function (isFree) {
    if (isFree) {
      callback(availablePorts[i]);
    } else {
      i += 1;
      if (availablePorts[i] === undefined) {
        callback(null);
        return;
      }
      _isPortFree(config.ANGEL_PORTS[i], findFreePort);
    }
  };
  findFreePort(false);
};

Utilities.getNetworkIP = function (callback) {
  var ip = require('whatismyip');
  var options = {
    url: 'http://checkip.dyndns.org/',
    truncate: '',
    timeout: 60000,
    matchIndex: 0
  };

  ip.whatismyip(options, function (err, data) {
    if (err === null) {
      callback(err, data);
    }
  });
};