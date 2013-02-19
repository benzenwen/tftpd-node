// * Check on making sure everything cleans up nicely. (aServer, aFile, etc.)
// * Handle rest of RRQ issues: timeout ACK, multi-concurrent sessions
// * Model external interface after notes/app.js
// * Clean up code stylistically
// * Handle non 'ascii' modes... Hmm, ascii mode is actually the trickier one.
// * Async file read
// * SECURITY - file name validator
// * Make debugLog less expensive on low log modes.
// * Tracking timeouts for ACKs.
// * Tracking and reaping stale connections.
// TODO



var dgram = require('dgram')
, OPC = require('./tftpd/misc').opcodes
, debugLog = require('./tftpd/misc').debugLog
, sessHandler = require('./tftpd/session.js')


function messageHandler (msg, rinfo) {
  console.log('server got: ' + msg + ' from ' +
    rinfo.address + ':' + rinfo.port)

  //    2 bytes   n bytes
  //   -------------------
  //  |  opcode | payload |
  //   ---=---------------
  // 

  var opcode = msg.readUInt16BE(0)
  , payload = msg.slice(2)
    
  switch (opcode)  {
  case OPC.Read:
    debugLog('got RRQ: ' + opcode, 3)
    sessHandler.handleRRQ(extractRQ(payload), rinfo) // TODO Make this async
    break
  case OPC.Write:
    debugLog('got WRQ: ' + opcode, 3)    
    sessHandler.handleWRQ(extractRQ(payload), rinfo)
    break
  case OPC.Data:
    debugLog('got DATA: ' + opcode, 3)    
    break
  case OPC.Ack:
    debugLog('got ACK: ' + opcode, 3)    
    break
  case OPC.Error:
    debugLog('got ERROR: ' + opcode, 3)    
    break
  default:
    debugLog('error, unrecognized opcode, ignoring: ' + opcode, 0)
  }
}

// Helpers

function extractRQ(inBuf) {
  var filenameB = extractFirstString(inBuf)
  var modeB = extractFirstString(filenameB.restBuffer)

  return { filename : filenameB.firstString
	   , mode : modeB.firstString }
}

function extractFirstString(inBuf) {
  // Find the first null-terminated string.
  // return it and the rest of the Buffer
  var i = 0
  for (i = 0; inBuf.readUInt8(i, 1) != 0; i++);
  i++; 
  var fileBuf = new Buffer(i)
  inBuf.copy(fileBuf, 0, 0, i)
  var restBuf = new Buffer(inBuf.length - i)
  inBuf.copy(restBuf, 0, i)

  debugLog('i: ' + i + ' fileBuf: ' + fileBuf , 3)
  return { firstString: fileBuf.toString()
	   , restBuffer: restBuf }
}


// Initialization  
var server = dgram.createSocket('udp4')

server.on('message', messageHandler)

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


