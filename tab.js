/* global require, module, window, phantom, slimer */
//var childProcess = require('child_process');
var webpage = require("webpage");
var webserver = require('webserver');


var Tab = module.exports = function() {
    this._time = 0;
    this.init();
};


Tab.prototype.init = function() {
    var self = this;
    self._resources = {};
    self._orphanResources = [];
    window.close();
    self.page = webpage.create();
    self.page.viewportSize = { width: 1280, height: 800 };
    self.page.onResourceRequested = function(requestData) {
        console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
        self._resources[requestData.id] = {
            request: requestData,
            response: null,
            blocking: Date.now() - self._time,
            waiting: -1,
            receiving: -1
        };
        self._orphanResources.push(requestData.id);
    };  
    self.page.onResourceReceived = function(response) {
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
        console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(self._resources[response.id]));
        self._resources[response.id].response = response;
    };
    self.server = webserver.create();
    self.service = self.server.listen('127.0.0.1:8080',
                                      function (request, response) {
                                          self.handle_request(request, response);
    });
};


Tab.prototype.open = function(url, callback) {
    var self = this;
    self._resources = {};
    this._time = Date.now();
    self.page.openUrl(url).then(function(status) {
        while (self._orphanResources.length > 0) {
            slimer.wait(1);
        }
        callback({success: status == 'success' ? true : false,
                  elapsedTime: Date.now() - self._time});
    });
};


Tab.prototype.addCookie = function(name, value, domain, path, httponly, secure, expires, callback) {
    var success = phantom.addCookie({
        'name':     name,
        'value':    value,
        'domain':   domain,
        'path':     path,
        'httponly': httponly ? httponly : false,
        'secure':   secure ? secure : false,
        'expires':  expires ? expires : (new Date()).getTime() + 3600
    });
    callback({success: success});
};


Tab.prototype.setUserAgent = function(userAgent, callback) {
    var self = this;
    self.page.settings.userAgent = userAgent;
    callback({success: true});
};


Tab.prototype.getResources = function(callback) {
    var self = this;
    callback({success: true, resources: self._resources});
};


Tab.prototype.getScreenshot = function(callback) {
    var self = this;
    var url = "/tmp/" + Date.now() + ".png";
    self.page.render(url);
    //self.upload(url);
    callback({success: true, url: url});
};


Tab.prototype.destroy = function(callback) {
    var self = this;
    callback({success: true});
    self.page.close();
    self.server.close();
    phantom.exit();
};


Tab.prototype.handle_request = function(request, response) {
    var self = this;
    var data = JSON.parse(request.post);
    console.log(request.url + " -- " + JSON.stringify(data));
    
    var callback = function(data){
        response.statusCode = 200;
        response.write(JSON.stringify(data));
        response.close();
    };

    switch(request.url) {
        case "/open":
            self.open(data.url, callback);
            break;
        case "/addCookie":
            self.addCookie(data.name, data.value, data.domain, data.path,
                           data.httponly, data.secure, data.expires, callback);
            break; 
        case "/setUserAgent":
            self.setUserAgent(data.userAgent, callback);
            break;
        case "/getResources":
            self.getResources(callback);
            break;
        case "/getScreenshot":
            self.getScreenshot(callback);
            break;
        case "/destroy":
            self.destroy(callback);
            break;
        default:
            console.log("WHAT DO YOU WANT?");
            response.statusCode = 500;
            response.write("");
            response.close();
            return;
    } 
};

new Tab();