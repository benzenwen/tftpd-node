// * Make this more server = tftpd.createServer() , server.listen()
// TODO 

var dgram = require('dgram')
, debugLog = require('./tftpd/misc').debugLog
, tftpd = require('./tftpd/tftpd')


// Initialization  
var server = dgram.createSocket('udp4')

server.on('message', tftpd.messageHandler)

server.on('listening', function () {
  var address = server.address();
  debugLog('server listening ' +
	   address.address + ':' + address.port, 2);
});

server.on('close', function () {
  debugLog('server got close event', 3);
});

server.on('error', function (exception) {
  debugLog('server got error: ' + exception, 0);
});

server.bind(69);
// server listening 0.0.0.0:69

// TODO
// Put the timeout sweepers here.


