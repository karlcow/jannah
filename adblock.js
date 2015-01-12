var fs = require('fs');
var SUPPORTED_METHODS = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE'];

// extract domain name from a URL
function sitename( url ) {
    var result = /^https?:\/\/([^\/]+)/.exec( url );
    if ( result ) {
        return( result[1] );
    } else {
        return( null );
    }
}

var AdBlock = module.exports = function () {
  this.init();
};

AdBlock.prototype.init = function (error) {
  var self = this;
  self._error = error;
  self._whitelist = null;
  self._blacklist = null;
  self._spoofingRules = {};
  self._loadFilterLists();
};

AdBlock.prototype._regexpEscape = function(text){
  return text.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
};

AdBlock.prototype._regexpFromLine = function(line){
  var self = this;
  return self._regexpEscape(line).
         replace(/\\\*/, '.*'). // * => .*
         replace(/\\\^|\\\|\\\||\\\$.*/g, ''); // ignore ^ and || and $anything
};

AdBlock.prototype._addSpoofingRule = function(name, line){
  var self = this;
  if (!self._spoofingRules[name]) {
    self._spoofingRules[name] = [];
  }
  self._spoofingRules[name].push(line.split(/\|/).slice(1));
};

AdBlock.prototype._parseFilterList = function(path){
  var self = this;
  var lines = fs.readFileSync(path, 'utf-8').trim().split(/\n+/);
  var blEntries = [];
  var wlEntries = [];

  lines.forEach(function(line){
    if (line.match(/^!ref\|/)) {
      self._addSpoofingRule('referer', line);
    } else if (line.match(/^!ua\|/)) {
      self._addSpoofingRule('user_agent', line);
    } else if (!line.match(/^[!\[]|#/)) { // ignore comments, DOM rules and whitelisting
      if (line.match(/^@@/)) {
        wlEntries.push(self._regexpFromLine(line.slice(2)));
      } else {
        blEntries.push(self._regexpFromLine(line));
      }
    }
  });

  var append = function(list, entries){
    if (entries.length === 0) {
      return list;
    } else {
      return ((list === null) ? '' : list + '|') + entries.join('|');
    }
  };

  self._blacklist = append(self._blacklist, blEntries);
  self._whitelist = append(self._whitelist, wlEntries);
};

AdBlock.prototype._loadFilterLists = function(){
  var self = this;
  self._parseFilterList('../easylist.txt');
};

AdBlock.prototype.getIsAd = function (url) {
  var self = this;
  if (!url.match(self._whitelist) && url.match(self._blacklist)) {
    return true;
  }
  var site = sitename(url);
  if (!site)
    return false;
  
  if (!site.match(self._whitelist) && site.match(self._blacklist)) {
    return true;
  }
  return false;
};


var adblock = new AdBlock();
var webPage = require('webpage');
var page = webPage.create();

page.onResourceRequested = function(requestData, networkRequest) {
  if (adblock.getIsAd(requestData.url)) {
    networkRequest.abort();
  }
};

page.viewportSize = {
        width: 1024,
        height: 768
      };
page.open('http://bilder.bild.de/fotos/cb02-small-26407904/Bild/16.bild.jpg', function(status) {
  console.log('Status: ' + status);
  // Do other things here...
});
