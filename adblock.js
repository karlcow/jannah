var fs = require('fs'),
  Utils = require('./utils.js');

var AdBlock = {};

var AdBlock = function () {
  'use strict';
  this.init();
};


AdBlock.prototype.init = function () {
  'use strict';
  var self = this;
  self.whitelist = null;
  self.blacklist = null;
  self.spoofingRules = {};
  self.selectors = {};
  self.loadFilterLists();
};

AdBlock.prototype.parseFilterList = function (path) {
  'use strict';
  var self = this,
    lines = fs.read(path, 'utf-8').trim().split(/\n+/),
    blEntries = [],
    wlEntries = [],
    rule = null,
    append = function (list, entries) {
      if (entries.length === 0) {
        return list;
      } else {
        return ((list === null) ? '' : list + '|') + entries.join('|');
      }
    },
    regexpFromLine = function (line) {
      var regexpEscape = function (text) {
        return text.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
      };
      return regexpEscape(line).replace(/\\\*/, '.*').replace(/\\\^|\\\|\\\||\\\$\.*/g, ''); // ignore ^ and || and $anything
    };

  lines.forEach(function (line) {
    if (line.match(/^!ref\|/)) {
      self.addSpoofingRule('referer', line);
    } else if (line.match(/^!ua\|/)) {
      self.addSpoofingRule('user_agent', line);
    } else if (!line.match(/^[!\[]|#/)) { // ignore comments, DOM rules and whitelisting
      if (line.match(/^@@/)) {
        wlEntries.push(regexpFromLine(line.slice(2)));
      } else {
        blEntries.push(regexpFromLine(line));
      }
    } else if (line.match('##')) {
      rule = [line.substr(0, line.indexOf('##')), line.substr(line.indexOf('##') + 2)];
      if (!rule[0].length) {
        rule[0] = '+++';
      }
      rule[0].split(',').forEach(function (domain) {
        if (!self.selectors[domain]) {
          self.selectors[domain] = [];
        }
        self.selectors[domain].push(rule[1]);
      });
    }
  });

  self.blacklist = append(self.blacklist, blEntries);
  self.whitelist = append(self.whitelist, wlEntries);
};

AdBlock.prototype.loadFilterLists = function () {
  'use strict';
  var self = this;
  self.parseFilterList('easylist.txt');
};

AdBlock.prototype.getIsAd = function (url) {
  'use strict';
  var self = this,
    site = Utils.getSitename(url);
  if (!url.match(self.whitelist) && url.match(self.blacklist)) {
    return true;
  }
  if (!site) {
    return false;
  }

  if (!site.match(self.whitelist) && site.match(self.blacklist)) {
    return true;
  }
  return false;
};

AdBlock.prototype.getSelectorsForDomain = function (domain) {
  'use strict';
  var self = this,
    selectors = self.selectors['+++'].slice() || [];
  return selectors.concat(self.selectors[Utils.getSitename(domain)] || []);
};

try {
  if (exports) {
    exports.AdBlock = AdBlock;
  }
} catch (ex) {
  console.log(ex);
}

try {
  if (module) {
    AdBlock = module.exports;
  }
} catch (ex) {
  console.log(ex);
}
