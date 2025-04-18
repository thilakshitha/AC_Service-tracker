import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

try {
  await page.goto('https://yourapp.com/login', { waitUntil: 'networkidle2' });

  await page.type('#username', 'testuser');
  await page.type('#password', 'securepassword');
  await page.click('#login-button');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  if (page.url().includes('/dashboard')) {
    console.log('✅ Login flow works');
    process.exit(0);
  } else {
    throw new Error('🚨 Login failed or wrong redirect');
  }

} catch (err) {
  console.error('❌ Synthetic monitoring failed:', err.message);
  process.exit(1);
} finally {
  await browser.close();
}
