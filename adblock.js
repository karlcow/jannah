var fs = require('fs');
var page = require('webpage').create();
var SUPPORTED_METHODS = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE'];


var AdBlock = module.exports = function () {
  this.init();
};

AdBlock.prototype.init = function (error) {
  var self = this;
  self._error = error;
  self._whitelist = null;
  self._blacklist = null;
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

AdBlock.prototype._parseFilterList = function(path){
  var self = this;
  var lines = fs.readFileSync(path, 'utf-8').trim().split(/\n+/);
  var blEntries = [];
  var wlEntries = [];

  lines.forEach(function(line){
    if (!line.match(/^[!\[]|#/)) { // ignore comments, DOM rules and self._whitelisting
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
  self._parseFilterList('easylist.txt');
};

AdBlock.prototype.getIsAd = function (url) {
  var self = this;
  if (!url.match(self._whitelist) && url.match(self._blacklist)) {
    console.log(url.match(self._whitelist));
    console.log(url.match(self._blacklist));
    return true;
  }
  return false;
};