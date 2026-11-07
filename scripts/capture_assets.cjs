const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const outputDir = path.resolve(__dirname, '../docs/images');
  const tmpFramesDir = path.resolve(__dirname, '../tmp_frames');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(tmpFramesDir)) fs.mkdirSync(tmpFramesDir, { recursive: true });

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();

  // 1. Desktop Dashboard Screenshot (1440x960)
  console.log('Setting desktop viewport 1440x960...');
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

  // Wait for kinematic simulator to complete 2-3 full repetitions and fill telemetry
  console.log('Waiting for kinematic simulator to complete reps and populate telemetry...');
  await new Promise(r => setTimeout(r, 4500));

  const desktopPath = path.join(outputDir, 'posecraft_desktop_dashboard.png');
  await page.screenshot({ path: desktopPath });
  console.log(`✓ Saved desktop dashboard: ${desktopPath}`);

  // 2. Open Report Modal and take screenshot
  console.log('Opening Report Modal with populated telemetry...');
  const reportBtn = await page.$('button:has(svg.lucide-file-spreadsheet)');
  if (reportBtn) {
    await reportBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const reportPath = path.join(outputDir, 'posecraft_report_modal.png');
    await page.screenshot({ path: reportPath });
    console.log(`✓ Saved report modal: ${reportPath}`);

    // Close modal
    const closeBtn = await page.$('button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 3. Mobile Viewport (390x844)
  console.log('Setting mobile viewport 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mobilePath = path.join(outputDir, 'posecraft_mobile.png');
  await page.screenshot({ path: mobilePath });
  console.log(`✓ Saved mobile screenshot: ${mobilePath}`);

  // 4. Capture Frames for Animated Demo GIF (Desktop view, 1280x780)
  console.log('Setting up extended demo GIF recording viewport (1280x780)...');
  await page.setViewport({ width: 1280, height: 780, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  // Capture 110 sequential frames (~7 seconds) showcasing 3 full squat reps,
  // angle dials descending to depth, rep counter increments, and kinematic waveform
  console.log('Capturing 110 sequential frames for extended demo GIF (6.8s, 3 full repetitions)...');
  for (let i = 0; i < 110; i++) {
    const framePath = path.join(tmpFramesDir, `frame_${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: framePath });
    await new Promise(r => setTimeout(r, 55));
  }

  await browser.close();

  // 5. Compile with ffmpeg
  console.log('Compiling frames into animated GIF using ffmpeg (16 fps)...');
  const gifPath = path.join(outputDir, 'posecraft_demo.gif');
  const inputPattern = path.join(tmpFramesDir, 'frame_%03d.png');

  const ffmpegCmd = `ffmpeg -y -framerate 16 -i "${inputPattern}" -vf "fps=16,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gifPath}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`✓ Successfully generated extended animated demo GIF: ${gifPath}`);

  // Clean up tmp_frames
  fs.rmSync(tmpFramesDir, { recursive: true, force: true });
  console.log('✓ Cleaned up temporary frames.');
}

main().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
