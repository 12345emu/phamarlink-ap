const fs = require('fs');
const path = require('path');

function checkLogs() {
  const logFile = path.join(__dirname, 'request-log.json');
  
  if (fs.existsSync(logFile)) {
    console.log('📋 Recent login requests:');
    const logContent = fs.readFileSync(logFile, 'utf8');
    const lines = logContent.trim().split('\n').filter(line => line.trim());
    
    // Show last 5 requests
    const recentLogs = lines.slice(-5);
    
    recentLogs.forEach((line, index) => {
      try {
        const logEntry = JSON.parse(line);
        if (logEntry.url === '/api/auth/login') {
          console.log(`\n📝 Request ${index + 1}:`);
          console.log('⏰ Time:', logEntry.timestamp);
          console.log('📧 Email:', logEntry.body?.email || 'NOT PROVIDED');
          console.log('🔑 Password:', logEntry.body?.password ? 'PROVIDED' : 'NOT PROVIDED');
          console.log('📋 Headers:', logEntry.headers);
          console.log('📦 Body:', logEntry.body);
        }
      } catch (error) {
        console.log('❌ Error parsing log entry:', error.message);
      }
    });
  } else {
    console.log('📝 No log file found. Make a login request to create logs.');
  }
}

checkLogs();

