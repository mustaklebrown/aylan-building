const https = require('https');

console.log('Sending HTTPS request to Neon host...');
const req = https.get('https://ep-wispy-salad-agln17vg.c-2.eu-central-1.aws.neon.tech/', (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error('HTTP Error:', e);
});

req.end();
