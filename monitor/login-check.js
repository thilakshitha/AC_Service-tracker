import puppeteer from 'puppeteer';

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();  // Create a new page directly (no incognito context)

try {
  console.log('🌐 Navigating to login page...');
  await page.goto('https://your-app-url.com/login', { waitUntil: 'networkidle2' });

  console.log('⏳ Waiting for login form...');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);

  console.log('🔐 Submitting login form...');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const currentURL = page.url();
  console.log('📍 Redirected to:', currentURL);

  if (currentURL.includes('/dashboard') || currentURL.includes('/reminders')) {
    console.log('✅ Synthetic monitoring: Login successful and dashboard reached');
    process.exit(0);
  } else {
    throw new Error('🚨 Login failed or unexpected redirect');
  }

} catch (err) {
  console.error('❌ Synthetic monitoring failed:', err.message);
  process.exit(1);
} finally {
  await browser.close();
}
