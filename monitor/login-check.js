import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // number of virtual users
  iterations: 1, // run once
};

export default function () {
  const res = http.get('https://ac-service-tracker.vercel.app/login'); // 🔁 Replace with your login page URL

  check(res, {
    '✅ status is 200': (r) => r.status === 200,
    '✅ page contains "Login"': (r) => r.body.includes('Login'),
  });

  sleep(1); // optional: wait for 1 second
}
