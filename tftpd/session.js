var debugLog = require('./misc').debugLog
, OPC = require('./misc').opcodes
, fs = require('fs')
, dgram = require('dgram')
, sessions = {}		// Active sessions
, homedir = '/private/tftpboot/'

// FIXME Collapse handle[W,R]RQ with a 3rd parameter
function handleRRQ(payload, rinfo) {
  // Check to see if there's already a process for that host:port
  var key = parseKey(rinfo)
  if (key in sessions) {
    debugLog('Unexpected. Received subsequent Read Request from pre-existing address + port: ' 
	     + key + '. Ignoring new session', 0)
    // FIXME I should respond Sending Error code and terminating prior session.
    return;
  } else {
    startRRQ(payload, rinfo)
  }
}

function handleWRQ(payload, rinfo) {
  // Check to see if there's already a process for that host:port
  var key = parseKey(rinfo)
  if (key in sessions) {
    debugLog('Unexpected. Received subsequent Read Request from pre-existing address + port: ' 
	     + key + '. Ignoring new session', 0)
    // FIXME I should respond Sending Error code and terminating prior session.
    return;
  } else {
    startWRQ(payload, rinfo)
  }
}    

// Handlers

function startRRQ(RQ, rinfo) {
  // File set up
  // SECURITY TODO: some safety checks
  var validator = /[\w\.]+$/g
  , cleanser = /foo/g
  , cleansedFilename = homedir + RQ.filename
  , aFile = fs.openSync(cleansedFilename, 'r') // FIXME error handling
  , totalBytesRead = 0
  , key = parseKey(rinfo)
  , lastPacket = false

  // Buffers
  var aBuffer = new Buffer(516) // 2 byte Opcode + 2 byte Block # + 512 bytes data
  , currentBlockCount = 0

  // Socket sender setup
  var aServer = dgram.createSocket('udp4')
  aServer.on('message', handleRead)
  aServer.on('close', function () { 
    debugLog('Read handler ' + key + ' received close event. Dequeueing.', 3)
    delete sessions[key]
  })
  aServer.on('listening', function () {
    var address = aServer.address()
    debugLog('Read handler server listening ' +
	     address.address + ':' + address.port + '. Sending first data-bearing packet.', 2)

    // boostrapping
    var tempBuf = new Buffer(4)
    tempBuf.writeUInt16BE(OPC.Ack, 0)
    handleRead(tempBuf, rinfo)
  })

  // FIXME whoops, need to objectify this whole thing.  Can't handle concurrent requests this way.
  sessions[key] = { server: aServer
		    , fd: aFile }
  aServer.bind()

  // TODO Can this be replaced by a generic handleMessage and better packaging?
  // FIXME also rinfo in unneeded here, it's in the parent object's context. 
  function handleRead(msg, rinfo) {
    // We should just be getting ACKs and ERRORs.
    debugLog('got handleRead event.', 3)
    var opcode = msg.readUInt16BE(0)
    , payload = msg.slice(2)
    
    switch (opcode) {
    case OPC.Ack: 
      if (lastPacket == true) {
	// Clean up
	debugLog('got last Ack, file transfer complete. Cleaning up.', 3)
	fs.closeSync(aFile)	// FIXME make async
	aServer.close()
      } else {
	var bytesRead = fs.readSync(aFile, aBuffer, 4, 512, totalBytesRead)
	debugLog('bytesRead: ' + bytesRead)
	totalBytesRead += bytesRead
	debugLog('totalBytesRead: ' + totalBytesRead)
	currentBlockCount++
	debugLog('got Ack, sending next packet: ' + currentBlockCount, 3)    

	aBuffer.writeUInt16BE(3, 0) // Opcode 3 = DATA, offset = 0
	aBuffer.writeUInt16BE(currentBlockCount, 2) // Block #, offset = 2
	aServer.send(aBuffer, 0, bytesRead + 4, rinfo.port, rinfo.address, function (err) { 
	  debugLog('Done sending packet.') 
	  if (bytesRead < 512) lastPacket = true
	})
      }
      break
    case OPC.Error:
      debugLog('got ERROR: ' + opcode, 3)
      // FIXME Parse and interpret errorcodes
      break
    default: 
      debugLog('error, unrecognized opcode, ignoring: ' + opcode, 0)
    }
  }
}

function startWRQ(RQ, rinfo) {
  // SECURITY TODO: safety checks
  // File set up
  var validator = /[\w\.]+$/g
  , cleanser = /foo/g
  , cleansedFilename = homedir + RQ.filename
  , aFile = fs.openSync(cleansedFilename, 'w') // FIXME error handling
  , totalBytesWritten = 0
  , key = parseKey(rinfo)
  , lastPacket = false		// CHECKME do I need this?

  // Buffers
  var aBuffer = new Buffer(516) // 2 byte Opcode + 2 byte Block # + 512 bytes data
  , currentBlockCount = 0

  // Socket sender setup
  var aServer = dgram.createSocket('udp4')
  aServer.on('message', handleWrite)
  aServer.on('close', function () { 
    debugLog('Write handler ' + key + ' received close event.  Dequeueing', 3)
    delete sessions[key]
  })
  aServer.on('listening', function () {
    var address = aServer.address()
    debugLog('Write handler server listening ' +
	     address.address + ':' + address.port + '. Sending first Ack packet.', 2)
    sendAck(0)
  })

  // FIXME 
  sessions[key] = { server: aServer
		    , fd: aFile }
  aServer.bind()

  function sendAck(block, callback) {
    tempBuf = new Buffer(4)
    tempBuf.writeUInt16BE(OPC.Ack, 0)
    tempBuf.writeUInt16BE(block, 2)
    aServer.send(tempBuf, 0, 4, rinfo.port, rinfo.address, function (err, result) { 
      debugLog('Sent Ack', 3)
      callback ? callback (err, result) : null
    })
  }

  
  // TODO 
  function handleWrite(msg, rinfo) {
    // We should just be getting DATAs and ERRORs.
    debugLog('got handleRead event.', 3)
    var opcode = msg.readUInt16BE(0)
    , payload = msg.slice(2)
    
    switch (opcode) {
    case OPC.Data: 
      blockN = payload.readUInt16BE(0)
      if (blockN == currentBlockCount + 1) { 
	debugLog ('Got correct write block: ' + blockN, 3)
	var data = payload.slice(2)
	fs.writeSync(aFile, data, 0, data.length, null) // FIXME make async
	currentBlockCount++
	debugLog ('Write sending Ack block: ' + blockN, 3)
	if (data.length < 512) {
	  sendAck (blockN, function (err, result) {
	    fs.closeSync(aFile)	// FIXME make async
	    aServer.close()
	    debugLog('Was final packet.  Closing connection and file.', 3)
	  })
	} else { sendAck (blockN) }
      } else {
	debugLog ('Out of order or repeated block: ' + blockN + '. Ignoring.', 0)
      }
      break
    case OPC.Error:
    case OPC.Error:
      debugLog('got ERROR: ' + opcode, 3)
      // FIXME Parse and interpret errorcodes
      break
    default: 
      debugLog('error, unrecognized opcode, ignoring: ' + opcode, 0)
    }
  }
}

function parseKey(rinfo) {
  var key = rinfo.address.toString() + ':' + rinfo.port.toString()
  debugLog ('parseKey parsed: ' + key, 3)
  return key
}



exports.handleRRQ = handleRRQ
exports.handleWRQ = handleWRQ
