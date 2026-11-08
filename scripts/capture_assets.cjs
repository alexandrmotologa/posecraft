const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const outputDir = path.resolve(__dirname, '../docs/images');
  const tmpFramesDir = path.resolve(__dirname, '../tmp_frames');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (fs.existsSync(tmpFramesDir)) fs.rmSync(tmpFramesDir, { recursive: true, force: true });
  fs.mkdirSync(tmpFramesDir, { recursive: true });

  console.log('Launching Puppeteer browser...');
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
  console.log('Capturing Desktop Dashboard (1440x960)...');
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4500)); // allow kinematic simulator to complete reps

  // Set Barbell Load (80 kg) for dynamic VBT RPE & 1RM prediction
  const loadInput = await page.$('input[type="number"]');
  if (loadInput) {
    await loadInput.click({ clickCount: 3 });
    await loadInput.type('80');
    await new Promise(r => setTimeout(r, 400));
  }

  // Toggle 3D Orbit Skeleton Viewport HUD
  const orbitBtn = await page.$('button:has(svg.lucide-rotate-3d)');
  if (orbitBtn) {
    await orbitBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const desktopPath = path.join(outputDir, 'posecraft_desktop_dashboard.png');
  await page.screenshot({ path: desktopPath });
  console.log(`✓ Saved desktop dashboard: ${desktopPath}`);

  // 2. Open Report Modal and capture screenshot
  console.log('Capturing Clinical Movement Assessment Report Modal...');
  const reportBtn = await page.$('button:has(svg.lucide-file-spreadsheet)');
  if (reportBtn) {
    await reportBtn.click();
    await new Promise(r => setTimeout(r, 700));
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

  // 2b. Open Printable Clinical Evaluation Report Modal
  console.log('Capturing Printable Clinical PDF Modal...');
  const clinicalBtn = await page.$('button:has(svg.lucide-printer)');
  if (clinicalBtn) {
    await clinicalBtn.click();
    await new Promise(r => setTimeout(r, 700));
    const clinicalPath = path.join(outputDir, 'posecraft_clinical_print_modal.png');
    await page.screenshot({ path: clinicalPath });
    console.log(`✓ Saved printable clinical modal: ${clinicalPath}`);

    const closeBtn = await page.$('button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 3. Mobile Viewport (390x844)
  console.log('Capturing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const mobilePath = path.join(outputDir, 'posecraft_mobile.png');
  await page.screenshot({ path: mobilePath });
  console.log(`✓ Saved mobile screenshot: ${mobilePath}`);

  // 4. Extended, High-Motion Animated Demo GIF (12.5 seconds, 200 frames @ 16 fps)
  console.log('Setting up Studio HUD for extended animated demo GIF (1280x780)...');
  await page.setViewport({ width: 1280, height: 780, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Optimize studio framing for demo recording: snug fit so Studio Canvas & Telemetry are prominent
  await page.evaluate(() => {
    const header = document.querySelector('header');
    if (header) {
      header.style.padding = '8px 24px';
    }
    const main = document.querySelector('main');
    if (main) {
      main.style.paddingTop = '8px';
      main.style.maxWidth = '1260px';
    }
  });

  // Set load (80 kg) and enable 3D Orbit view before recording
  const gifLoadInput = await page.$('input[type="number"]');
  if (gifLoadInput) {
    await gifLoadInput.click({ clickCount: 3 });
    await gifLoadInput.type('80');
    await new Promise(r => setTimeout(r, 200));
  }

  const gifOrbitBtn = await page.$('button:has(svg.lucide-rotate-3d)');
  if (gifOrbitBtn) {
    await gifOrbitBtn.click();
    await new Promise(r => setTimeout(r, 300));
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log('Recording multi-scene dynamic biomechanical sequence (~14.5 seconds)...');

  // Start CDP screencast to capture every composited frame with zero lag or frame-drop
  const client = await page.target().createCDPSession();
  const rawFrames = [];

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    rawFrames.push(Buffer.from(data, 'base64'));
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch (e) {}
  });

  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    maxWidth: 1280,
    maxHeight: 780,
    everyNthFrame: 1,
  });

  // Scene 1: Clean Deep Back Squat Tracking with 3D Orbit HUD & Sticking Point Ribbon (0s - 3.8s)
  console.log('  Scene 1: Deep Back Squat with 3D Orbit Viewport HUD and velocity sticking points...');
  await new Promise(r => setTimeout(r, 3800));

  // Scene 2: Inject Knee Valgus Fault and trigger Safety Alert Banner (3.8s - 7.2s)
  console.log('  Scene 2: Injecting Knee Valgus medial collapse and Safety Alert Banner...');
  await page.select('select', 'valgus');
  await new Promise(r => setTimeout(r, 3400));

  // Scene 3: Open Custom Exercise Studio Modal (7.2s - 10.2s)
  console.log('  Scene 3: Opening Custom Exercise Kinematic Studio...');
  await page.select('select', 'none');
  const studioBtn = await page.$('button:has(svg.lucide-wrench)');
  if (studioBtn) {
    await studioBtn.click();
    await new Promise(r => setTimeout(r, 2800));
    const closeStudio = await page.$('button:has(svg.lucide-x)');
    if (closeStudio) {
      await closeStudio.click();
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Scene 4: Open Clinical Movement Assessment Report Modal with TCX Export (10.2s - 13.8s)
  console.log('  Scene 4: Opening Clinical Movement Assessment Report Modal with TCX Export...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.querySelector('svg.lucide-file-spreadsheet'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3400));

  // Stop screencast
  await client.send('Page.stopScreencast');
  console.log(`Captured ${rawFrames.length} total composited frames during recording.`);

  await browser.close();

  // Save frames to disk downsampled to 16 fps
  // Real duration is ~13.7 seconds. For 16 fps, we need ~220 frames.
  const targetFps = 16;
  const targetFrameCount = Math.min(220, Math.floor(rawFrames.length));
  const step = rawFrames.length / targetFrameCount;

  console.log(`Sampling ${targetFrameCount} frames at ${targetFps} fps for smooth playback...`);
  for (let i = 0; i < targetFrameCount; i++) {
    const frameIndex = Math.min(Math.floor(i * step), rawFrames.length - 1);
    const framePath = path.join(tmpFramesDir, `frame_${String(i).padStart(4, '0')}.jpg`);
    fs.writeFileSync(framePath, rawFrames[frameIndex]);
  }

  // Compile into animated GIF with ffmpeg
  console.log(`Compiling ${targetFrameCount} frames into high-fidelity animated GIF (16 fps)...`);
  const gifPath = path.join(outputDir, 'posecraft_demo.gif');
  const inputPattern = path.join(tmpFramesDir, 'frame_%04d.jpg');

  const ffmpegCmd = `ffmpeg -y -framerate ${targetFps} -i "${inputPattern}" -vf "fps=${targetFps},scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" "${gifPath}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`✓ Successfully created extended demo GIF: ${gifPath}`);

  // Clean up tmp_frames
  fs.rmSync(tmpFramesDir, { recursive: true, force: true });
  console.log('✓ Cleaned up temporary frames.');
}

main().catch(err => {
  console.error('Asset capture failed:', err);
  process.exit(1);
});
