const fs = require('fs');
const path = require('path');

// Create a simple request logger
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    ip: req.ip || req.connection.remoteAddress
  };
  
  console.log('📝 REQUEST LOG:', JSON.stringify(logEntry, null, 2));
  
  // Also write to file
  const logFile = path.join(__dirname, 'request-log.json');
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  next();
};

module.exports = logRequest;

