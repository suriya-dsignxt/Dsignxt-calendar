/**
 * Meeting Reminder Tester
 * Run this script to manually trigger the reminder checks.
 * Usage: node test-reminders.js
 */
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/cron/reminders',
  method: 'GET',
};

console.log('--- Triggering Meeting Reminders ---');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\nSuccess! Reminders processed.');
        console.log(`Sent 15m: ${parsed.results.sent15}`);
        console.log(`Sent 5m: ${parsed.results.sent5}`);
        console.log(`Total Scanned: ${parsed.results.processed}`);
      }
    } catch (e) {
      console.log('Raw Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error connecting to dev server:', error.message);
  console.log('Make sure your Next.js server is running (npm run dev) before running this script.');
});

req.end();
