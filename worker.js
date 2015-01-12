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
    self.page.viewportSize = {
        width: 1280,
        height: 800
    };
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
    if (self.adBlock.getIsAd(requestData.url) === true) {
        self.ads.push(requestData.id);
    }
    self.resources[requestData.id] = {
        request: requestData,
        response: null
    };
    self.orphanResources.push(requestData.id);
};

Worker.prototype.onResourceReceived = function (response) {
    'use strict';
    var self = this;
    self.resources[response.id].response = response;
    //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(self.resources[response.id]));
    if (response.stage === 'end') {
        self.orphanResources.splice(self.orphanResources.indexOf(response.id), 1);
    }
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
        self.waitForResources(20000, function () {
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

    while (self.orphanResources.length > 0 && Date.now() - time < timeout) {
        //console.log("Orphaned resources: " + self.orphanResources.length + " " + self.orphanResources);
        slimer.wait(1000);
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
        selector = null,
        rect = null,
        evaluate = function (url) {
            var selector = document.body.querySelector('*[src="' + url + '"]');
            if (selector !== null) {
                return selector;
            }
        };

    for (i in self.ads) {
        if (self.ads[i] !== undefined) {
            adId = self.ads[i];
            adUris.push(self.resources[adId]);
            if (self.resources[adId].response.contentType.indexOf("javascript") !== -1) {
                console.log(self.resources[adId].request.url);
            }
            selector = self.page.evaluate(evaluate, self.resources[adId].request.url);
            if (selector !== null) {
                rect = selector.getBoundingClientRect();

                while (rect.width < 2 || rect.height < 2) {
                    selector = selector.parentElement;
                    rect = selector.getBoundingClientRect();
                }
                if (ads.indexOf(selector) === -1 && rect.width > 0 && rect.height > 0) {
                    ads.push(selector);
                }
            }
        }
    }
    return ads;
};

Worker.prototype.captureRect = function (target, rect) {
    'use strict';
    var self = this,
        previousRect = self.page.clipRect,
        newRect = {
            top: rect.top,
            left: rect.left,
            height: rect.height,
            width: rect.width
        };
    self.page.clipRect = newRect;
    self.page.render(target);
    self.page.clipRect = previousRect;
};


Worker.prototype.captureAds = function () {
    'use strict';
    var self = this,
        i = 0,
        ads = null,
        frame = null,
        adUris = [],
        framesCount = self.page.framesCount,
        evaluate = function (i) {
            return window.frames[i];
        };

    ads = self.getAds();
    for (i = 0; i < ads.length; i += 1) {
        self.captureRect(Date.now() + ".png", ads[i].getBoundingClientRect());
        adUris.push(ads[i].src);
    }

    /*
    for (i = 0; i < framesCount; i += 1) {
        frame = self.page.evaluate(evaluate, i);
        self.page.switchToFrame(i);

        if (frame.frameElement !== null) {
            if (adUris.indexOf(frame.frameElement.src) === -1) {
                self.captureAds();
            }
        }
        self.page.switchToParentFrame();
    }
    */
};

Worker.prototype.run = function (url, userAgent, cookie, callback) {
    'use strict';
    var self = this,
        ads = null,
        i = null;

    if (userAgent !== null) {
        self.page.settings.userAgent = userAgent;
    }
    if (cookie !== null && !phantom.addCookie(cookie)) {
        phantom.exit();
    }
    self.open(url, function () {
        slimer.wait(10000);
        console.log("Cutting out ads");
        self.page.render("screenshot.png");
        self.page.viewportSize = {
            width: 1280,
            height: 2048
        };
        self.captureAds();
        self.page.render("screenshot.png");
        callback();
    });
};

var worker = new Worker();
worker.run("http://bild.de/",
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:30.0) Gecko/20100101 Firefox/30.0',
    null,
    function () {
        'use strict';
        phantom.exit();
    });