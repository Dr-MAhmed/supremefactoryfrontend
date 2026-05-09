const fs = require('fs');
for (const file of ['public/icon-192.png', 'public/icon-512.png']) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    console.log(`${file}: not a PNG`);
    continue;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`${file}: ${width}x${height} size=${buffer.length}`);
}
const http = require('http');
const options = { hostname: 'localhost', port: 4173, path: '/sw.js', method: 'GET' };
const req = http.request(options, res => {
  console.log('SW status:', res.statusCode);
  console.log('SW content-type:', res.headers['content-type']);
  let body = '';
  res.setEncoding('utf8');
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('SW body starts:', body.slice(0, 80).replace(/\n/g,' '));
  });
});
req.on('error', err => console.log('SW fetch failed:', err.message));
req.end();
