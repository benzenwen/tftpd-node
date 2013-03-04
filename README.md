# Trivial file transfer server (tftp) in node.js #

* work in progress *

A tftpd in node.js.

# Usage #
sudo node server.js

The home directory is '/private/tftpdboot/'

# Status #
20130303 Minimal get and put from a fixed directory in octet (binary) mode.  

# TODO #
- [ ] Command line parameters (home directory, log level, security modes)
- [ ] File path access control security.  
- [ ] File path / name validation.
- [ ] File error handling.
- [ ] Async file handling.
- [ ] Handle timeouts.  Reap stale connections.
- [ ] tftpd.createServer() and server.listen().
- [ ] Ascii mode.
- [ ] Other RFC extensions.

# Standards #
Trivial file transfer is governed by 
* RFC1350 - THE TFTP PROTOCOL (REVISION 2)
* RFC2347 - TFTP Option Extension
* RFC2348 - TFTP Blocksize Option
* RFC2349 - TFTP Timeout Interval and Transfer Size Options
* RFC3617 - Uniform Resource Identifier (URI) Scheme and Applicability Statement for the Trivial File Transfer Protocol (TFTP)

(maybe others?)

