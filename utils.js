/* exported Utils */

var Utils = module.exports = {
  // Static method
  getSitename: function (url) {
    'use strict';
    var x = new URL(url).hostname.split('.'),
      tld = x.pop(),
      host = x.pop();
    return host + '.' + tld;
  }
};
