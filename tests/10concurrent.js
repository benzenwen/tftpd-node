var spawn = require('child_process').spawn,
fs = require('fs'),
out = [],
err = [], 
tftp = []

for (var i = 0; i < 10; i++) {
  outfile = './out' + i.toString() + '.log'
  out[i] = fs.openSync (outfile, 'a')
  err[i] = fs.openSync (outfile, 'a')
  tftp[i] = spawn ('tftp', ['127.0.0.1'], { stdio: ['pipe', out[i], err[i]], env: process.env })
  console.log ('created: ' + i + ' object: ' + tftp[i])
}

var iterations = 5

function count_tftp () {
  for (i = 0; i < 10; i++)  {
    tftp[i].stdin.write ('get hello512.txt\n')
  }
  iterations--;
  if (iterations > 0) process.nextTick(count_tftp) 
  else {
    for (i = 0; i < 10; i++) {
      tftp[i].stdin.write ('quit\n')
    }
//    process.nextTick(process.exit)
  }
}

process.nextTick(count_tftp);

console.log ('testing...')

/* 
   stderr and stdout streams are silent, but writing to a fs works.
*/
