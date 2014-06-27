var io = require('socket.io-client')
  , acquire = require('acquire')
  , os = require('os')
  , sugar = require('sugar')
  , winston = require('winston')
  , Server = require('socket.io')
  , util = require('util')  
  , events = require('events') 
  , config = acquire('config')
  ;

socketOptions = {
	transports : ['websocket']
}

var client = io.connect('http://localhost:3000', socketOptions);

client.on('connect', function(){
  console.log('Connected to Hub')
  setTimeout(function() { client.emit('healthUpdate', {status: 'Miserable'})}, 3000);
});
client.on('connect_error', function(err){console.log('Error received ' + err)});
client.on('on_data)', function(date){console.log('On data')});

