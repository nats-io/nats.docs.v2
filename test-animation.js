const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureAnimation() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'animation-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('Navigating to test page...');
  await page.goto('http://localhost:3000/examples/simple-flow', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for the component to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Take initial screenshot
  console.log('Taking initial screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'frame-0-initial.png'),
    fullPage: false
  });

  // Click the Play button
  console.log('Clicking Play button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const playButton = buttons.find(btn => btn.textContent.includes('Play') || btn.textContent.includes('▶️'));
    if (playButton) {
      playButton.click();
    }
  });

  // Capture screenshots at intervals to see animation
  const intervals = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000];

  for (const ms of intervals) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait increment
    const filename = `frame-${ms}ms.png`;
    console.log(`Capturing at ${ms}ms...`);
    await page.screenshot({
      path: path.join(screenshotsDir, filename),
      fullPage: false
    });
  }

  // Get debug info from the page
  console.log('\nGetting debug information...');
  const debugInfo = await page.evaluate(() => {
    const debugPanel = document.querySelector('[class*="debugPanel"]');
    if (debugPanel) {
      return debugPanel.innerText;
    }
    return 'Debug panel not found';
  });

  console.log('\n=== DEBUG INFO ===');
  console.log(debugInfo);
  console.log('==================\n');

  console.log(`\nScreenshots saved to: ${screenshotsDir}`);
  console.log('Screenshot files:');
  fs.readdirSync(screenshotsDir).forEach(file => {
    console.log(`  - ${file}`);
  });

  await browser.close();
  console.log('\nDone!');
}

captureAnimation().catch(console.error);
