/* global require, module, window, phantom, slimer */

var webpage = require("webpage"),
  webserver = require('webserver'),
  config = require('config'),
  utils = require('angelUtilities');


var Angel = module.exports = function(ip, port) {
  this._time = 0;
  this._resources = {};
  this._orphanResources = [];
  this._autoDestructId = null;
  this._consoleLog = [];
  this.init(ip, port);
};


Angel.prototype.init = function(ip, port) {
  var self = this;
  self._ip = ip;
  self._port = port;
  self._page = webpage.create();
  self._server = webserver.create();
  console.log(ip + ":" + port);
  self._page.viewportSize = { width:1024, height:768 };
  self._page.settings.resourceTimeout = 60000;
  self._page.onResourceRequested = function(requestData) {self._onResourceRequested(requestData);};
  self._page.onResourceReceived = function(response) {self._onResourceReceived(response);};
  self._page.onResourceTimeout = function(request) {self._onResourceTimeout(request);};
  self._page.onResourceError = function(resourceError) {self._onResourceError(resourceError);};
  self._page.onConsoleMessage = function(msg, lineNum, sourceId) {self._onConsoleMessage(msg, lineNum, sourceId);};
  try {
    self._server.listen(ip + ":" + port,
                        function(request, response) {
                          self._handleRequest(request, response);
                        });
    self._announceAngel();
  } catch (ex) {
    phantom.exit();
  }
  console.log("Starting Angel on port: " + self._port);
  self._resetAutoDestruct();
};


Angel.prototype._announceAngel = function() {
  var self = this;
  var page = webpage.create();
  //window.close();
  var url = 'http://localhost:' + config.SERAPH_PORT  + '/announceAngel',
    data = JSON.stringify({port: self._port}),
    headers = { "Content-Type": "application/json" };
  page.open(url, 'post', data, headers, function(status) {
    page.close();
    if (status !== "success")
      phantom.exit();
  });
};


Angel.prototype._onResourceRequested = function(requestData) {
  var self = this;
  //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
  self._resources[requestData.id] = {
    request: requestData,
    response: null,
    blocking: Date.now() - self._time,
    waiting: -1,
    receiving: -1
  };
  self._orphanResources.push(requestData.id);
};


Angel.prototype._onResourceReceived = function(response) {
  var self = this;
  switch (response.stage) {
    case 'start':
      self._resources[response.id].waiting = response.time.getTime() - self._resources[response.id].request.time.getTime();
      break;
    case 'end':
      self._resources[response.id].receiving = response.time.getTime() - self._resources[response.id].response.time.getTime();
      self._orphanResources.splice(self._orphanResources.indexOf(response.id), 1);
      break;
    default:
      break;
  }
  self._resources[response.id].response = response;
  //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(self._resources[response.id]));
};


Angel.prototype._onResourceError = function(request) {
  var self = this;
  self._orphanResources.splice(self._orphanResources.indexOf(request.id), 1);
  self._resources[request.id].request = request;
  //console.log('Request (#' + request.id + ', timed out: "' + JSON.stringify(self._resources[request.id]));
};


Angel.prototype._onResourceTimeout = function(resourceError) {
  var self = this;
  self._orphanResources.splice(self._orphanResources.indexOf(resourceError.id), 1);
  self._resources[resourceError.id].response = resourceError;
  //console.log('Request (#' + resourceError.id + ' had error: "' + JSON.stringify(self._resources[resourceError.id]));
};

Angel.prototype._onConsoleMessage = function(msg, lineNum, sourceId) {
  var self = this;
  self._consoleLog.push({msg: msg, lineNum: lineNum, sourceId: sourceId});
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};

Angel.prototype._open = function(url, callback) {
  var self = this;
  self._resources = {};
  self._orphanResources = [];
  this._time = Date.now();
  
  self._page.openUrl(url).then(function(status) {
    while (self._orphanResources.length > 0)
       slimer.wait(1);
    callback({success: status === 'success' ? true : false,
          elapsedTime: Date.now() - self._time});
  });
};


Angel.prototype._addCookie = function(name, value, domain, path, httponly, secure, expires, expiry, callback) {
  var success = phantom.addCookie({
    'name':   name,
    'value':  value,
    'domain':   domain,
    'path':   path,
    'httponly': httponly ? httponly : false,
    'secure':   secure ? secure : false,
    'expires':  expires ? expires : null,
    'expiry':  expiry ? expiry : null
  });
  callback({success: success});
};


Angel.prototype._setUserAgent = function(userAgent, callback) {
  var self = this;
  self._page.settings.userAgent = userAgent;
  callback({success: true});
};


Angel.prototype._getResources = function(callback) {
  var self = this;
  callback({success: true, resources: self._resources});
};


Angel.prototype._getScreenshot = function(callback) {
  var self = this;
  utils.fixFlash();
  self._page.viewportSize = { width:1024, height:4096 };
  window.setTimeout(function() {
    self._page.viewportSize = { width:1024, height:768 };
    var base64 = self._page.renderBase64('PNG');
    callback({success: true, data: base64}); 
  }, 1000);
};


Angel.prototype._destroy = function(callback) {
  var self = this;
  callback({success: true});
  self._page.close();
  self._server.close();
  phantom.exit();
};


Angel.prototype._ping = function(callback) {
  window.setTimeout(function() {
    callback(null);
  }, 5000);
};


Angel.prototype._evaluate = function(script, callback) {
  var self = this;
  var result = self._page.evaluateJavaScript("(" + script + ")()");
  callback({script: script, result: result});
};


Angel.prototype._evaluateOnGecko = function(script, callback) {
  /*jslint evil: true */
  'use strict';
  var self = this;
  var result = eval(script);
  callback({script: script, result: result});
};


Angel.prototype._getConsoleLog = function(callback) {
  var self = this;
  callback({consoleLog: self._consoleLog});
};


Angel.prototype._resetAutoDestruct = function() {
  var self = this;
  //console.log("Resetting auto Destruct");
  window.clearTimeout(self._autoDestructId);
  self._autoDestructId = window.setTimeout(phantom.exit, 120000);
};


Angel.prototype._handleRequest = function(request, response) {
  var self = this;
  var data = request.post !== "" ? JSON.parse(request.post) : {};
  var callback = function(data) {
    response.statusCode = 200;
    data = data !== null ? JSON.stringify(data) : "";
    response.write(data);
    response.close();
  };
  self._page.evaluate(function () {
      window.focus();
    });
  switch(request.url) {
    case "/open":
      self._resetAutoDestruct();
      self._open(data.url, callback);
      break;
    case "/addCookie":
      self._resetAutoDestruct();
      self._addCookie(data.name, data.value, data.domain, data.path,
                      data.httponly, data.secure, data.expires, data.expiry, callback);
      break; 
    case "/setUserAgent":
      self._resetAutoDestruct();
      self._setUserAgent(data.userAgent, callback);
      break;
    case "/getResources":
      self._resetAutoDestruct();
      self._getResources(callback);
      break;
    case "/getScreenshot":
      self._resetAutoDestruct();
      self._getScreenshot(callback);
      break;
    case "/destroy":
      self._destroy(callback);
      break;
    case "/ping":
      self._ping(callback);
      break;
    case "/evaluate":
      self._resetAutoDestruct();
      self._evaluate(data.script, callback);
      break;
    case "/evaluateOnGecko":
      self._evaluateOnGecko(data.script, callback);
      self._resetAutoDestruct();
      break;
    case "/getConsoleLog":
      self._resetAutoDestruct();
      self._getConsoleLog(callback);
      break;
    default:
      console.log("WHAT DO YOU WANT?");
      response.statusCode = 500;
      response.write("");
      response.close();
      return;
    }
};


if (phantom.args[0] !== undefined && phantom.args[1] !== undefined) {
  var ip = phantom.args[0];
  var port = phantom.args[1];
  new Angel(ip, port);
}