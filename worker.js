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
        networkRequest.abort();
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
    if (self.resources[request.id] !== undefined) {
        self.resources[request.id].request = request;
    }
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

    while (self.orphanResources.length > 0 && Date.now() - time < timeout) {
        //console.log("Orphaned resources: " + self.orphanResources.length + " " + self.orphanResources);
        slimer.wait(1000);
    }
    callback();
};

/*
Worker.prototype.getAds = function () {
    'use strict';
    var self = this,
        adUris = [],
        ads = [],
        i = 0,
        adId = null,
        selector = null,
        evaluate = function (url) {
            var selector = document.body.querySelector('*[src="' + url + '"]');
            if (selector !== null) {
                return {
                    url: url,
                    selector: selector
                };
            }
        };

    for (i in self.ads) {
        if (self.ads[i] !== undefined) {
            adId = self.ads[i];
            adUris.push(self.resources[adId]);
            // extract domain name from a URL

            selector = self.page.evaluate(evaluate, self.resources[adId].request.url);
            if (selector !== null) {
                if (selector.selector.getBoundingClientRect().height !== 0) {
                    console.log(selector.selector.getBoundingClientRect());
                    ads.push(selector);
                }
            }
        }
    }
    console.log("========== " + ads.length + " ==========");
    return ads;
};


Worker.prototype.getIFrames = function () {
    'use strict';
    var self = this,
        ads = [],
        i = 0,
        iframes = null,
        evaluate = function () {
            var iframes = document.body.querySelectorAll('iframe');
            if (iframes !== null) {
                return iframes;
            }
        };

    iframes = self.page.evaluate(evaluate);
    if (iframes !== null) {
        for (i = 0; i < iframes.length; i += 1) {
            if (iframes[i].getBoundingClientRect().height !== 0) {
                console.log(iframes[i].getBoundingClientRect());
                ads.push({
                    url: "",
                    selector: iframes[i]
                });
            }
        }
    }
    console.log("========== " + ads.length + " ==========");
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


    console.log(newRect.top + " " + newRect.left + " " + newRect.height + " " + newRect.width + " " + target);
    self.page.clipRect = newRect;
    self.page.render(target);
    self.page.clipRect = previousRect;
};

*/
Worker.prototype.cutOutAds = function () {
    'use strict';
    var self = this,
        i = 0,
        j = 0,
        adId = null,
        page = null,
        response = null,
        adUris = [],
        ignoreTypes = [
            null, 'application/x-javascript', 'application/javascript', 'text/javascript', 'text/xml', 'text/plain'
        ];

    for (i in self.ads) {
        if (self.ads[i] !== undefined) {
            adId = self.ads[i];
            response = self.resources[adId].response;
            if (ignoreTypes.indexOf(response.contentType) === -1 && response.bodySize >= 100) {
                adUris.push(self.resources[adId].request.url);
            }
        }
    }

    adUris = adUris.filter(function (itm, i, a) {
        return i === a.indexOf(itm);
    });

    for (j in adUris) {
        page = WebPage.create();
        console.log(adUris[j]);
        page.open(adUris[j], function (status) {
            console.log(status + " " + adUris[j]);
        });
        slimer.wait(2000);
    }

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
        slimer.wait(1000);
        console.log("Cutting out ads");
        self.cutOutAds();
        self.page.render("screenshot.png");
        /*
        ads = self.getAds();
        self.page.render("screenshot.png");
        for (i = 0; i < ads.length; i += 1) {
            self.captureRect(i + ".png", ads[i].selector.getBoundingClientRect());
            console.log(ads[i].selector.id);
            ads[i].selector.style.display = "none";
            slimer.wait(2000);
        }
        self.page.render("screenshot-noads.png");
        callback(ads);
        */
    });
};

var worker = new Worker();
worker.run("http://spiegel.de/",
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:30.0) Gecko/20100101 Firefox/30.0',
    null,
    function (result) {
        'use strict';
        console.log(result);
        //phantom.exit();
    });