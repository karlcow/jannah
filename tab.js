/* global require, module, window, phantom */
var webpage = require("webpage");
var webserver = require('webserver');


var Tab = module.exports = function() {
    this._resources = {};
    this.init();
};

Tab.prototype.init = function() {
    var self = this;
    window.close();
    self.page = webpage.create();
    self.page.viewportSize = { width: 1280, height: 800 };
    self.server = webserver.create();
    self.service = self.server.listen('127.0.0.1:8080',
                                      function (request, response) {
                                          self.handle_request(request, response);
    });
};


Tab.prototype.open = function(url, callback) {
    var self = this;
    self.page.openUrl(url).then(function(status){
        callback(status);
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
    callback({"success": success});
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
        default:
            console.log("WHAT DO YOU WANT?");
            response.statusCode = 500;
            response.write("");
            response.close();
            return;
    } 
};

var t = new Tab();