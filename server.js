// * Clean up code stylistically
// * Handle non 'ascii' modes
// * Async file read
// * SECURITY - file name validator
// * Make debugLog less expensive on low log modes.
// * Tracking timeouts for ACKs.
// * Tracking and reaping stale connections.
// TODO



var dgram = require('dgram')
, fs = require('fs')
, debugLevel = 3
, sessions = {}		// Active sessions
, homedir = '/private/tftpboot/'


function messageHandler (msg, rinfo) {
  console.log('server got: ' + msg + ' from ' +
    rinfo.address + ':' + rinfo.port)

  //    2 bytes  
  //   ------------------
  //  | opcode | payload |
  //   ------------------
  // 

  var opcode = msg.readUInt16BE(0)
  , payload = msg.slice(2)
    
  switch (opcode)  {
  case 1: 			// Read
    debugLog('got RRQ: ' + opcode, 3)
    handleRRQ(extractRQ(payload), rinfo)
    break
  case 2:
    debugLog('got WRQ: ' + opcode, 3)    
    RQ = extractRQ(payload)
    break
  case 3:
    debugLog('got DATA: ' + opcode, 3)    
    break
  case 4:
    debugLog('got ACK: ' + opcode, 3)    
    break
  case 5:
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

function parseKey(rinfo) {
  var key = rinfo.address.toString() + ':' + rinfo.port.toString()
  debugLog ('parseKey parsed: ' + key, 3)
  return key
}

// Handlers

function handleRRQ(RQ, rinfo) {
  // Check to see if there's already a process for that host:port
  // If not, create a socket
  var key = parseKey(rinfo)
  if (key in sessions) {
    debugLog('Unexpected. Received subsequent Read Request from pre-existing address + port: ' + key + '. Ignoring new request.', 0)
    return;
  } else {

    // File set up
    // SECURITY TODO: some safety checks
    var validator = /[\w\.]+$/g
    var cleanser = /foo/g
    var cleansedFilename = homedir + RQ.filename
    var aFile = fs.openSync(cleansedFilename, 'r')

    // Socket sender setup
    var aServer = dgram.createSocket('udp4')
    aServer.on('message', handleRead)
    aServer.on('close', function () { 
      debugLog('Read handler ' + key + ' received close event.', 3)
    })
    aServer.on('listening', function () {
      var address = aServer.address()
      debugLog('Read handler server listening ' +
	       address.address + ':' + address.port + '. Sending first data-bearing packet.', 2)
      // FIXME actually read data from disk.
      var aBuffer = new Buffer(9)
      aBuffer.writeUInt16BE(3, 0) // Opcode 3 = DATA, offset = 0
      aBuffer.writeUInt16BE(1, 2) // Block # = 1, offset = 2
      aBuffer.write('Hello', 4, 'ascii') // FIXME defaults to ascii
      aServer.send(aBuffer, 0, aBuffer.length, rinfo.port, rinfo.address, function (err) { debugLog('Done sending.') })
    })

    sessions[key] = { server: aServer
		      , fd: aFile }
    aServer.bind()
  }
}

function handleRead(msg, rinfo) {
  // We should just be getting ACKs and ERRORs.
  debugLog('got handleRead event.', 3)
  
}

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


function debugLog (message, level) {
  if (level <= debugLevel)
    console.log (message)
}
