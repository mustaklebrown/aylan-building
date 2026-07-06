const https = require('https');

console.log('Sending HTTPS request to google.com...');
const req = https.get('https://www.google.com/', (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => {
    // just print first 50 chars
    process.stdout.write(d.toString().slice(0, 50) + '\n');
  });
});

req.on('error', (e) => {
  console.error('HTTP Error:', e);
});

req.end();
