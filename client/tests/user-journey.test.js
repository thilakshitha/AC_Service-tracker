import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 1 }, // Simulate 1 user to mimic synthetic monitoring
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
  },
};

export default function () {
  const res = http.get('https://ac-service-tracker.vercel.app/login');

  check(res, {
    'login page status is 200': (r) => r.status === 200,
    'login page loads text': (r) => r.body.includes('Login'), // Adjust text to your actual page
  });

  sleep(1); // pause between steps
}
