// Misc helpers

var debugLevel = 3

opcodes = { 
    Read: 1
  , Write: 2
  , Data: 3
  , Ack: 4
  , Error: 5
}

function debugLog (message, level) {
  level = typeof level !== 'undefined' ? level : 1
  if (level <= debugLevel)
    console.log (message)
}

exports.opcodes = opcodes
exports.debugLog = debugLog
