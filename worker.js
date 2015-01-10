/*jshint strict: true*/
/*global require, module, console, slimer, phantom*/

var WebPage = require('webpage'),
    AdBlock = require('adblock');

var Worker = module.exports = function () {
    'use strict';
    this.time = 0;
    this.resources = {};
    this.orphanResources = [];
    this.ads = [];
    this.autoDestructId = null;
    this.busy = false;
    this.consoleLog = [];
    this.page = null;
    this.init();
};

Worker.prototype.init = function () {
    'use strict';
    var self = this;
    self.page = WebPage.create();
    self.page.viewportSize = {width: 1024, height: 768};
    self.adBlock = new AdBlock();
    self.page.settings.resourceTimeout = 60000;
    
    self.page.onResourceRequested = function (requestData, networkRequest) {
        self.onResourceRequested(requestData, networkRequest);
    };
    self.page.onResourceReceived = function (response) {
        self.onResourceReceived(response);
    };
    self.page.onResourceTimeout = function (request) {
        self.onResourceError(request);
    };
    self.page.onResourceError = function (resourceError) {
        self.onResourceError(resourceError);
    };
};

Worker.prototype.onResourceRequested = function (requestData, networkRequest) {
    'use strict';
    var self = this;
    //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
    if (self.adBlock.getIsAd(requestData.url) === true) { self.ads.push(requestData.id); }
    self.resources[requestData.id] = {request: requestData, response: null};
    self.orphanResources.push(requestData.id);
};

Worker.prototype.onResourceReceived = function (response) {
    'use strict';
    var self = this;
    self.resources[response.id].response = response;
    //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(self.resources[response.id]));
    if (response.stage === 'end') { self.orphanResources.splice(self.orphanResources.indexOf(response.id), 1); }
};

Worker.prototype.onResourceError = function (request) {
    'use strict';
    var self = this;
    self.orphanResources.splice(self.orphanResources.indexOf(request.id), 1);
    self.resources[request.id].request = request;
    //console.log('Request (#' + request.id + ', errored out: "' + JSON.stringify(self.resources[request.id]));
};

Worker.prototype.open = function (url, callback) {
    'use strict';
    var self = this;
    self.resources = {};
    self.orphanResources = [];
    self.time = Date.now();

    self.page.openUrl(url).then(function (status) {
        self.waitForResources(10000, function () {
            callback({
                success: status === 'success' ? true : false,
                elapsedTime: Date.now() - self.time
            });
        });
    });
};

Worker.prototype.waitForResources = function (timeout, callback) {
    'use strict';
    var self = this,
        time = Date.now();

    console.log("DONE");
    
    if (timeout === null || timeout === undefined) {
        timeout = 60000;
    }

    while (self.orphanResources.length > 0 && Date.now() - time < timeout) {
        console.log("Orphaned resources: " + self.orphanResources.length + " " + self.orphanResources);
        slimer.wait(1);
    }
    callback();
};

Worker.prototype.getAds = function () {
    'use strict';
    var self = this,
        adUris = [],
        ads = [],
        i = 0,
        adId = null,
        result = null,
        iframe = null,
        embed = null,
        sitename = function (url) {
            result = /^https?:\/\/([\^\/]+)/.exec(url);
            if (result) {
                return (result[1]);
            } else {
                return (null);
            }
        };
    
    for (i in self.ads) {
        if (self.ads[i] !== undefined) {
            adId = self.ads[i];
            adUris.push(self.resources[adId]);
            // extract domain name from a URL
            
            iframe = self.page.evaluate(function (url) {
                return document.querySelector('iframe[src="' + url + '"]');
            }, self.resources[adId].request.url);
            if (iframe !== null) {
                ads.push({selector: iframe, uri: self.resources[adId].request.url});
            }
            embed = self.page.evaluate(function (url) {
                return document.querySelector('embed[src="' + url + '"]');
            }, self.resources[adId].request.url);
            if (embed !== null) {
                ads.push({selector: embed, uri: self.resources[adId].request.url});
            }
        }
    }
    console.log("========== " + ads.length + " ==========");
    return ads;
};

Worker.prototype.run = function (url, userAgent, cookie, callback) {
    'use strict';
    var self = this,
        ads = null;
    
    if (userAgent !== null) {
        self.page.settings.userAgent = userAgent;
    }
    if (cookie !== null && !phantom.addCookie(cookie)) {
        phantom.exit();
    }
    self.open(url, function () {
        slimer.wait(10);
        ads = self.getAds();
        callback(ads);
    });
};

var worker = new Worker();
worker.run("http://engadget.com", null, null, function (result) {
    'use strict';
    console.log(result);
    phantom.exit();
});