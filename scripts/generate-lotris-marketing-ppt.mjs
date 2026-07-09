#!/usr/bin/env node
/**
 * Generate the refreshed Lotris presentation package:
 * - Master deck
 * - Executive deck
 * - Sales deck
 * - IT Technical deck
 *
 * Sources:
 * - docs/BRD.md
 * - docs/HANDOFF.md
 * - docs/IT-HANDOVER.md
 * - docs/API.md
 * - docs/MOBILE-PAGER-SCOPE.md
 * - mockups/12-mobile-pager-pitch.html
 * - apps/web/public/brand/*.svg
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import PptxGenJS from 'pptxgenjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'dist');
const ASSET_DIR = path.join(OUT_DIR, 'deck-assets');
const INDEX_FILE = path.join(OUT_DIR, 'Lotris-Deck-Index.md');

const LOGO_LIGHT = path.join(ROOT, 'apps', 'web', 'public', 'brand', 'logo-light.svg');
const LOGO_DARK = path.join(ROOT, 'apps', 'web', 'public', 'brand', 'logo-dark.svg');
const LOGO_STACKED = path.join(ROOT, 'apps', 'web', 'public', 'brand', 'logo-stacked.svg');

const C = {
  indigo: '4F46E5',
  indigoLight: 'A5B4FC',
  indigoDark: '312E81',
  slate950: '080A14',
  slate900: '0F172A',
  slate800: '1E293B',
  slate700: '334155',
  slate600: '475569',
  slate500: '64748B',
  slate300: 'CBD5E1',
  slate200: 'E2E8F0',
  white: 'FFFFFF',
  green: '10B981',
  amber: 'F59E0B',
  red: 'EF4444',
  violet: '8B5CF6',
  soft: 'F8FAFC',
};

const speakerNotes = {
  opener:
    'Position Lotris as a production-ready on-prem ITSM platform, not a concept. Emphasize provable performance, enterprise fit, and optional intelligence features.',
  objectives:
    'This slide bridges operational pains with strategic outcomes. Use it to align executives, sales stakeholders, and technical buyers around the same platform value.',
  pager:
    'Stress that Lotris Pager is a thin client, not a second platform. It extends the existing API for off-desk response while keeping governance in Lotris.Api.',
  technical:
    'Frame the technical section as enterprise reassurance: deployment, API contract, RBAC, and operations are already thought through and validated.',
};

const deckFiles = {
  master: path.join(OUT_DIR, 'Lotris-Master.pptx'),
  executive: path.join(OUT_DIR, 'Lotris-Executive.pptx'),
  sales: path.join(OUT_DIR, 'Lotris-Sales.pptx'),
  technical: path.join(OUT_DIR, 'Lotris-IT-Technical.pptx'),
};

const screenshotTargets = [
  { name: 'landing', url: 'http://localhost:3000/', width: 1440, height: 1080 },
  { name: 'login', url: 'http://localhost:3000/login', width: 1440, height: 1080 },
  { name: 'request-access', url: 'http://localhost:3000/request-access', width: 1440, height: 1080 },
  { name: 'request', url: 'http://localhost:3000/request', width: 1440, height: 1080 },
  { name: 'monitor', url: 'http://localhost:3000/monitor', width: 1440, height: 1080 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function chromePath() {
  const candidates = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function captureUrlScreenshot(url, outFile, width = 1440, height = 1080) {
  const chrome = chromePath();
  if (!chrome) return false;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lotris-deck-'));
  try {
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${width},${height}`,
        `--user-data-dir=${profile}`,
        '--virtual-time-budget=5000',
        `--screenshot=${outFile}`,
        url,
      ],
      { stdio: 'ignore' },
    );
    return fs.existsSync(outFile);
  } catch {
    return false;
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

function prepareAssets() {
  ensureDir(ASSET_DIR);
  const results = {};
  for (const target of screenshotTargets) {
    const outFile = path.join(ASSET_DIR, `${target.name}.png`);
    results[target.name] = captureUrlScreenshot(target.url, outFile, target.width, target.height) ? outFile : null;
  }
  return results;
}

function createDeck(title, subject) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Lotris';
  pptx.company = 'Lotris';
  pptx.subject = subject;
  pptx.title = title;
  pptx.lang = 'en-GB';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
    lang: 'en-GB',
  };
  return pptx;
}

function addFooter(slide, section = '') {
  slide.addShape('line', {
    x: 0.55,
    y: 5.02,
    w: 8.85,
    h: 0,
    line: { color: 'E2E8F0', width: 1 },
  });
  slide.addText(`Lotris · July 2026${section ? ` · ${section}` : ''}`, {
    x: 0.6,
    y: 5.1,
    w: 4.4,
    h: 0.2,
    fontSize: 8.5,
    color: C.slate500,
  });
  slide.addText('Generated from BRD · HANDOFF · IT-HANDOVER · API · MOBILE-PAGER-SCOPE', {
    x: 4.85,
    y: 5.1,
    w: 4.4,
    h: 0.2,
    fontSize: 8,
    color: C.slate500,
    align: 'right',
  });
}

function addLogo(slide, variant = 'dark', x = 0.58, y = 0.3, w = 1.7, h = 0.38) {
  const logoPath = variant === 'light' ? LOGO_LIGHT : LOGO_DARK;
  slide.addImage({ path: logoPath, x, y, w, h });
}

function addCustomerPlaceholders(slide, dark = false) {
  const fill = dark ? 'FFFFFF' : 'F8FAFC';
  const line = dark ? '475569' : 'CBD5E1';
  const text = dark ? 'CBD5E1' : '64748B';
  for (let i = 0; i < 3; i += 1) {
    const x = 6.55 + i * 0.9;
    slide.addShape('roundRect', {
      x,
      y: 0.42,
      w: 0.78,
      h: 0.28,
      fill: { color: fill, transparency: 15 },
      line: { color: line, width: 1 },
      rectRadius: 0.04,
    });
    slide.addText('Logo', {
      x,
      y: 0.49,
      w: 0.78,
      h: 0.1,
      fontSize: 7,
      color: text,
      align: 'center',
    });
  }
}

function addNotes(slide, text) {
  if (text) slide.addNotes(text);
}

function addHeroSlide(pptx, { title, subtitle, eyebrow, note }) {
  const slide = pptx.addSlide();
  slide.background = { color: C.slate950 };
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 10,
    h: 5.63,
    fill: { color: C.slate950 },
    line: { width: 0 },
  });
  slide.addShape('arc', {
    x: 6.6,
    y: -0.4,
    w: 3.6,
    h: 3.6,
    fill: { color: C.indigo, transparency: 85 },
    line: { width: 0 },
    adjustPoint: 0.25,
  });
  slide.addImage({ path: LOGO_STACKED, x: 0.6, y: 0.42, w: 1.2, h: 0.72 });
  addCustomerPlaceholders(slide, true);
  slide.addText(eyebrow, {
    x: 0.65,
    y: 1.35,
    w: 3.6,
    h: 0.2,
    fontSize: 9.5,
    bold: true,
    color: C.indigoLight,
    charSpace: 1.2,
  });
  slide.addText(title, {
    x: 0.62,
    y: 1.65,
    w: 6.6,
    h: 1.15,
    fontSize: 28,
    bold: true,
    color: C.white,
    breakLine: false,
  });
  slide.addText(subtitle, {
    x: 0.64,
    y: 2.85,
    w: 5.85,
    h: 0.9,
    fontSize: 15,
    color: C.slate300,
    lineSpacing: 20,
  });
  slide.addShape('roundRect', {
    x: 0.65,
    y: 4.1,
    w: 2.15,
    h: 0.34,
    fill: { color: C.indigoDark },
    line: { color: C.indigo, width: 1 },
    rectRadius: 0.06,
  });
  slide.addText('Production-ready · On-prem validated', {
    x: 0.65,
    y: 4.19,
    w: 2.15,
    h: 0.1,
    fontSize: 8.5,
    color: C.white,
    bold: true,
    align: 'center',
  });
  addFooter(slide, 'Overview');
  addNotes(slide, note);
}

function addDividerSlide(pptx, { title, subtitle, accent = C.indigoDark, note }) {
  const slide = pptx.addSlide();
  slide.background = { color: accent };
  addLogo(slide, 'light', 0.62, 0.45, 1.6, 0.36);
  slide.addText(title, {
    x: 0.7,
    y: 2.0,
    w: 8.6,
    h: 0.45,
    fontSize: 28,
    bold: true,
    color: C.white,
  });
  slide.addText(subtitle, {
    x: 0.7,
    y: 2.48,
    w: 7.2,
    h: 0.35,
    fontSize: 13.5,
    color: 'E0E7FF',
  });
  addFooter(slide);
  addNotes(slide, note);
}

function addBulletSlide(pptx, { title, bullets, section = '', dark = false, note }) {
  const slide = pptx.addSlide();
  slide.background = { color: dark ? C.slate900 : C.white };
  addLogo(slide, dark ? 'light' : 'dark');
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.8,
    h: 0.4,
    fontSize: 22,
    bold: true,
    color: dark ? C.white : C.slate900,
  });
  slide.addText(
    bullets.map((b) => ({ text: b, options: { bullet: { indent: 16 }, breakLine: true, paraSpaceAfter: 7 } })),
    {
      x: 0.72,
      y: 1.35,
      w: 8.2,
      h: 3.4,
      fontSize: 13.5,
      color: dark ? C.slate300 : C.slate700,
      lineSpacing: 19,
      margin: 0,
    },
  );
  addFooter(slide, section);
  addNotes(slide, note);
}

function addTwoColumnSlide(pptx, { title, leftTitle, leftItems, rightTitle, rightItems, section = '', note }) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addLogo(slide);
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.8,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: C.slate900,
  });
  for (const [x, header, items] of [
    [0.65, leftTitle, leftItems],
    [5.05, rightTitle, rightItems],
  ]) {
    slide.addShape('roundRect', {
      x,
      y: 1.3,
      w: 3.95,
      h: 3.25,
      fill: { color: C.soft },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.05,
    });
    slide.addText(header, {
      x: x + 0.12,
      y: 1.45,
      w: 3.6,
      h: 0.2,
      fontSize: 12,
      bold: true,
      color: C.indigo,
    });
    slide.addText(
      items.map((t) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: true, paraSpaceAfter: 5 } })),
      {
        x: x + 0.12,
        y: 1.74,
        w: 3.55,
        h: 2.55,
        fontSize: 11.5,
        color: C.slate700,
        lineSpacing: 16,
      },
    );
  }
  addFooter(slide, section);
  addNotes(slide, note);
}

function addFeatureGridSlide(pptx, { title, subtitle = '', cards, section = '', dark = false, note }) {
  const slide = pptx.addSlide();
  slide.background = { color: dark ? C.slate900 : C.soft };
  addLogo(slide, dark ? 'light' : 'dark');
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.8,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: dark ? C.white : C.slate900,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.62,
      y: 1.18,
      w: 8.4,
      h: 0.3,
      fontSize: 11.5,
      color: dark ? C.slate300 : C.slate500,
    });
  }
  const cols = 3;
  const cardW = 2.78;
  const cardH = 1.35;
  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.6 + col * (cardW + 0.22);
    const y = 1.55 + row * (cardH + 0.2);
    slide.addShape('roundRect', {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: dark ? C.slate800 : C.white },
      line: { color: dark ? '334155' : 'E2E8F0', width: 1 },
      rectRadius: 0.05,
    });
    slide.addText(card.title, {
      x: x + 0.12,
      y: y + 0.1,
      w: cardW - 0.24,
      h: 0.2,
      fontSize: 10.5,
      bold: true,
      color: dark ? C.indigoLight : C.indigo,
    });
    slide.addText(card.body, {
      x: x + 0.12,
      y: y + 0.36,
      w: cardW - 0.24,
      h: 0.82,
      fontSize: 9.5,
      color: dark ? C.slate300 : C.slate500,
      lineSpacing: 13,
    });
  });
  addFooter(slide, section);
  addNotes(slide, note);
}

function addScreenshotSlide(pptx, { title, imagePath, bullets = [], caption = '', section = '', note }) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addLogo(slide);
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.6,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: C.slate900,
  });
  if (imagePath && fs.existsSync(imagePath)) {
    slide.addImage({ path: imagePath, x: 0.6, y: 1.3, w: 5.45, h: 3.4 });
  } else {
    slide.addShape('roundRect', {
      x: 0.6,
      y: 1.3,
      w: 5.45,
      h: 3.4,
      fill: { color: C.soft },
      line: { color: 'CBD5E1', width: 1, dash: 'dash' },
      rectRadius: 0.05,
    });
    slide.addText('Screenshot unavailable', {
      x: 2.25,
      y: 2.85,
      w: 2.15,
      h: 0.2,
      fontSize: 12,
      color: C.slate500,
      align: 'center',
    });
  }
  if (caption) {
    slide.addText(caption, {
      x: 0.65,
      y: 4.78,
      w: 5.35,
      h: 0.2,
      fontSize: 8.5,
      italic: true,
      color: C.slate500,
    });
  }
  if (bullets.length) {
    slide.addShape('roundRect', {
      x: 6.3,
      y: 1.28,
      w: 3.05,
      h: 3.5,
      fill: { color: C.soft },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.05,
    });
    slide.addText(
      bullets.map((b) => ({ text: b, options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 6 } })),
      {
        x: 6.45,
        y: 1.52,
        w: 2.7,
        h: 3.05,
        fontSize: 11.5,
        color: C.slate700,
        lineSpacing: 16,
      },
    );
  }
  addFooter(slide, section);
  addNotes(slide, note);
}

function addDoubleScreenshotSlide(pptx, { title, leftImage, leftLabel, rightImage, rightLabel, section = '', note }) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addLogo(slide);
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.8,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: C.slate900,
  });
  const panels = [
    [0.6, leftImage, leftLabel],
    [5.0, rightImage, rightLabel],
  ];
  for (const [x, img, label] of panels) {
    slide.addText(label, {
      x,
      y: 1.2,
      w: 3.8,
      h: 0.2,
      fontSize: 10,
      bold: true,
      color: C.indigo,
    });
    if (img && fs.existsSync(img)) {
      slide.addImage({ path: img, x, y: 1.45, w: 4.05, h: 3.15 });
    } else {
      slide.addShape('roundRect', {
        x,
        y: 1.45,
        w: 4.05,
        h: 3.15,
        fill: { color: C.soft },
        line: { color: 'CBD5E1', width: 1, dash: 'dash' },
        rectRadius: 0.05,
      });
    }
  }
  addFooter(slide, section);
  addNotes(slide, note);
}

function phoneScreen(slide, x, y, { label, title, lines, footerTabs = ['Alerts', 'Work', 'Queue', 'Me'], active = 0 }) {
  const w = 1.36;
  const h = 3.25;
  slide.addText(label, {
    x,
    y: y - 0.22,
    w,
    h: 0.12,
    fontSize: 7.5,
    bold: true,
    color: C.indigoLight,
    align: 'center',
  });
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: '000000' },
    line: { color: C.slate600, width: 1 },
    rectRadius: 0.08,
  });
  slide.addShape('roundRect', {
    x: x + 0.36,
    y: y + 0.06,
    w: 0.62,
    h: 0.05,
    fill: { color: C.slate700 },
    line: { width: 0 },
    rectRadius: 0.02,
  });
  slide.addShape('roundRect', {
    x: x + 0.06,
    y: y + 0.12,
    w: w - 0.12,
    h: h - 0.18,
    fill: { color: C.slate900 },
    line: { width: 0 },
    rectRadius: 0.08,
  });
  slide.addText(title, {
    x: x + 0.14,
    y: y + 0.23,
    w: w - 0.28,
    h: 0.16,
    fontSize: 9.5,
    bold: true,
    color: C.white,
    align: 'center',
  });
  let lineY = y + 0.5;
  for (const line of lines) {
    slide.addShape('roundRect', {
      x: x + 0.1,
      y: lineY,
      w: w - 0.2,
      h: 0.34,
      fill: { color: '132033' },
      line: { color: '223048', width: 1 },
      rectRadius: 0.03,
    });
    slide.addText(line, {
      x: x + 0.15,
      y: lineY + 0.07,
      w: w - 0.3,
      h: 0.18,
      fontSize: 6.7,
      color: C.slate300,
      valign: 'mid',
    });
    lineY += 0.4;
  }
  const tabY = y + h - 0.32;
  footerTabs.forEach((tab, i) => {
    slide.addText(tab, {
      x: x + 0.02 + i * 0.33,
      y: tabY,
      w: 0.28,
      h: 0.08,
      fontSize: 5.5,
      bold: i === active,
      color: i === active ? C.white : C.slate500,
      align: 'center',
    });
  });
}

function addPagerOverviewSlide(pptx) {
  addBulletSlide(pptx, {
    title: 'Lotris Pager — why mobile matters',
    section: 'Pager',
    dark: true,
    bullets: [
      'Focused 6-screen mobile client for engineers and team leads — not a full web clone.',
      'Solves the off-desk gap: push alerts on assignment, escalation, and SLA warning.',
      'Reuses the existing Lotris API; no second backend, no duplicate database platform.',
      'Security posture: Entra + JWT, minimal push payloads, secure storage, biometric lock.',
      'Supports faster acknowledge → work → resolve cycles when the desktop app is not open.',
    ],
    note: speakerNotes.pager,
  });
}

function addPagerWalkthroughSlide(pptx, title, screens, note) {
  const slide = pptx.addSlide();
  slide.background = { color: C.slate900 };
  addLogo(slide, 'light');
  slide.addText(title, {
    x: 0.6,
    y: 0.82,
    w: 8.6,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: C.white,
  });
  slide.addText('6-screen pager walkthrough derived from the mobile scope and interactive mockup.', {
    x: 0.62,
    y: 1.16,
    w: 6.2,
    h: 0.2,
    fontSize: 10.5,
    color: C.slate300,
  });
  screens.forEach((screen, i) => phoneScreen(slide, 0.72 + i * 1.58, 1.55, screen));
  addFooter(slide, 'Pager');
  addNotes(slide, note);
}

function addArchitectureSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addLogo(slide);
  slide.addText('System architecture', {
    x: 0.6,
    y: 0.82,
    w: 8.8,
    h: 0.35,
    fontSize: 22,
    bold: true,
    color: C.slate900,
  });
  const boxes = [
    { x: 3.35, y: 1.2, w: 3.0, h: 0.46, t: 'nginx reverse proxy (:9090)', c: C.indigo },
    { x: 0.75, y: 2.0, w: 2.4, h: 0.46, t: 'Next.js web', c: C.slate800 },
    { x: 3.42, y: 2.0, w: 2.5, h: 0.46, t: 'ASP.NET Core API', c: C.slate800 },
    { x: 6.55, y: 2.0, w: 2.1, h: 0.46, t: 'OpenAPI / Scalar', c: C.slate800 },
    { x: 0.95, y: 3.0, w: 2.6, h: 0.46, t: 'MSSQL (dbo + analytics)', c: C.indigoDark },
    { x: 3.95, y: 3.0, w: 1.6, h: 0.46, t: 'Redis', c: C.indigoDark },
    { x: 6.05, y: 3.0, w: 2.1, h: 0.46, t: 'Qdrant (optional)', c: C.indigoDark },
    { x: 3.2, y: 4.0, w: 2.9, h: 0.38, t: 'Hangfire jobs (in-process)', c: C.slate700 },
  ];
  boxes.forEach((b) => {
    slide.addShape('roundRect', {
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      fill: { color: b.c },
      line: { width: 0 },
      rectRadius: 0.04,
    });
    slide.addText(b.t, {
      x: b.x,
      y: b.y + 0.1,
      w: b.w,
      h: b.h,
      fontSize: 9.5,
      bold: true,
      color: C.white,
      align: 'center',
    });
  });
  addFooter(slide, 'Technical');
  addNotes(slide, speakerNotes.technical);
}

function addClosingSlide(pptx, title = 'Ready to deploy Lotris?') {
  addHeroSlide(pptx, {
    title,
    subtitle:
      'Use the executive deck for sponsor buy-in, the sales deck for polished product storytelling, and the IT deck for deployment and operations confidence.',
    eyebrow: 'NEXT STEPS',
    note: 'Close by steering the audience to the version of the deck best suited to them. Offer BRD, IT handover, API docs, and pager scope as follow-on materials.',
  });
}

function buildMasterDeck(assets) {
  const pptx = createDeck('Lotris Master', 'Marketing + Technical Master Deck');
  addHeroSlide(pptx, {
    title: 'Lotris',
    subtitle:
      'On-prem ITSM with provable KPI performance, enterprise reporting, and root-cause intelligence.\nWhere performance surfaces.',
    eyebrow: 'MASTER DECK · JULY 2026',
    note: speakerNotes.opener,
  });
  addTwoColumnSlide(pptx, {
    title: 'Business objectives',
    leftTitle: 'Operational outcomes',
    leftItems: [
      'Reduce ticket handling friction with queue-based pickup and batch reassign',
      'Improve SLA visibility with real-time warnings, escalation, and audit trail',
      'Automate operational reporting with PDF/Excel, schedules, and email delivery',
      'Accelerate incident resolution with RCA, semantic search, and knowledge reuse',
    ],
    rightTitle: 'Strategic outcomes',
    rightItems: [
      'Align engineer performance to measurable targets',
      'Enable enterprise deployment without mandatory cloud identity',
      'Provide platform-level operations visibility through /ops and monitor wall',
      'Extend the product to mobile response without duplicating backend logic',
    ],
    section: 'Marketing',
    note: speakerNotes.objectives,
  });
  addFeatureGridSlide(pptx, {
    title: 'Platform pillars',
    subtitle: 'The platform combines day-to-day IT operations, management reporting, and intelligence in one tenant-aware system.',
    section: 'Marketing',
    cards: [
      { title: 'Structured ticketing', body: 'FSM lifecycle, routing, SLA timers, comments, attachments, and full audit history.' },
      { title: 'Provable KPIs', body: 'Definitions, assignments, and signed KPI agreements with live scorecards.' },
      { title: 'Balanced workloads', body: 'Capacity limits, team workload analytics, rebalance suggestions, and batch apply.' },
      { title: 'Reporting', body: 'Scheduled and on-demand PDF/Excel reports, email delivery, AI narratives when enabled.' },
      { title: 'Intelligence', body: 'Problems register, RCA workflow, knowledge Q&A, semantic search, Teams alerts.' },
      { title: 'On your infrastructure', body: 'Docker Compose on-prem, Entra/LDAP/Identity, optional Qdrant, no mandatory cloud lock-in.' },
    ],
    note: 'Use this as the platform summary. If the audience is mixed, pause here before diving into screens or architecture.',
  });
  addDoubleScreenshotSlide(pptx, {
    title: 'Public-facing product story',
    leftImage: assets.landing,
    leftLabel: 'Landing / marketing surface',
    rightImage: assets.requestAccess,
    rightLabel: 'Request access / buyer entry point',
    section: 'Marketing',
    note: 'These are real public surfaces from the running app. They help tie the deck back to an actual usable product, not just a concept.',
  });
  addScreenshotSlide(pptx, {
    title: 'Tickets, intake, and visibility',
    imagePath: assets.request,
    caption: 'Real application screen capture — public ticket intake',
    bullets: [
      'Public ticket request form for external requesters',
      'Category routing and acknowledgement emails',
      'Works alongside API and email-to-ticket intake',
      'Complements internal queue, SLA, and escalation workflows',
    ],
    section: 'Marketing',
    note: 'Position this as one of the simplest ways organisations operationalise Lotris quickly: a clean public intake path feeding the same governed backend.',
  });
  addBulletSlide(pptx, {
    title: 'KPI management and agreements',
    section: 'Marketing',
    bullets: [
      'Three-layer KPI model: global definitions → engineer assignments → signed agreements.',
      'Weighted KPI areas, Excel/CSV import, draft/review/active workflow, and live scoring.',
      'Engineer “My Agreement” view and team/personal trend analytics.',
      'Built for appraisal evidence, not spreadsheet guesswork.',
    ],
    note: 'This is one of Lotris’ strongest differentiators versus generic helpdesks. Keep the conversation on accountability and review readiness.',
  });
  addFeatureGridSlide(pptx, {
    title: 'Intelligence platform (Phase 8)',
    section: 'Marketing',
    dark: true,
    cards: [
      { title: 'Problems register', body: 'Track active investigations and link recurring incidents to one governed problem record.' },
      { title: 'RCA workflow', body: 'Draft → review → approve → publish with lead and manager oversight.' },
      { title: 'Knowledge base', body: 'Published RCAs and articles become searchable operational memory.' },
      { title: 'Semantic search', body: 'Qdrant-backed vector search with keyword / SQL fallback for resilience.' },
      { title: 'AI providers', body: 'Connect OpenAI, Claude, Azure OpenAI, or Copilot with tenant toggles.' },
      { title: 'AI narratives', body: 'Optional report summaries and RCA assistance when policy allows external providers.' },
    ],
    note: 'Use this to show that Lotris has moved beyond classic ITSM into operational intelligence while still supporting on-prem governance.',
  });
  addScreenshotSlide(pptx, {
    title: 'Operations surfaces',
    imagePath: assets.monitor,
    caption: 'Real application screen capture — public monitor wall',
    bullets: [
      'Public unauthenticated monitor wall for NOC displays and executive visibility',
      'Live queue, SLA, and operational health picture',
      'Complements /ops health, SSE, and ETL job management for administrators',
      'Useful in operations rooms, service desks, and leadership briefings',
    ],
    section: 'Marketing',
    note: 'The monitor wall is a strong demo asset because it is public-facing and visually legible. Use it to tell the story of operational transparency.',
  });
  addPagerOverviewSlide(pptx);
  addPagerWalkthroughSlide(
    pptx,
    'Pager walkthrough — user flow',
    [
      { label: '1 · Overview', title: 'Overview', lines: ['6 screens · Push notifications', 'Existing API only', 'Engineers + Team Leads'], active: 1 },
      { label: '2 · Login', title: 'Login', lines: ['Sign in with Microsoft', 'Fallback: email + password', 'MFA / keychain storage'], active: 3 },
      { label: '3 · Alerts', title: 'Alerts', lines: ['Assigned to you · INC-1042', 'SLA warning · INC-1038', 'Escalated · INC-1029'], active: 0 },
    ],
    'Walk through the mobile sequence at a high level: who it is for, how it authenticates, and how alerts arrive.',
  );
  addPagerWalkthroughSlide(
    pptx,
    'Pager walkthrough — response tools',
    [
      { label: '4 · My Work', title: 'My Tickets', lines: ['INC-1042 · HIGH · SLA 14m', 'INC-1038 · MED · SLA 22m', 'REQ-0881 · LOW · SLA 2h'], active: 1 },
      { label: '5 · Queue', title: 'Queue', lines: ['Unclaimed team tickets', 'One-tap claim', 'Fast triage while off desk'], active: 2 },
      { label: '6 · Detail / Lead', title: 'Quick Assign', lines: ['Status transitions + comment', 'Lead rebalance suggestions', 'Apply all workload moves'], active: 2 },
    ],
    'Show that the pager is focused on urgent response, not full desktop parity. Tie it back to hybrid work, after-hours response, and SLA protection.',
  );
  addBulletSlide(pptx, {
    title: 'Security and enterprise readiness',
    section: 'Marketing',
    dark: true,
    bullets: [
      'Self-hosted by default: MSSQL, Redis, Docker, optional Qdrant.',
      'Hybrid auth: Identity, Entra OIDC, LDAP-ready architecture.',
      'RBAC and tenant isolation across tickets, KPI, intelligence, and ops surfaces.',
      'Minimal push payloads and biometric lock for the mobile pager.',
      'Structured audit trail, TLS in transit, and hardened OpenAPI UI disable options.',
      'Validated for on-prem delivery and release handover in July 2026.',
    ],
    note: 'This slide answers the usual enterprise objections before they arise: where the data lives, how identity works, and how governance is enforced.',
  });
  addDividerSlide(pptx, {
    title: 'Technical overview',
    subtitle: 'Architecture · API · Deployment · Operations',
    note: speakerNotes.technical,
  });
  addArchitectureSlide(pptx);
  addTwoColumnSlide(pptx, {
    title: 'Technology stack',
    leftTitle: 'Application',
    leftItems: [
      'Frontend: Next.js 15, React, Tailwind, React Query',
      'API: ASP.NET Core 9, REST + OpenAPI 3.1 + SSE',
      'Mobile: Expo (React Native) thin client to Lotris.Api',
      'Jobs: Hangfire in-process, MSSQL-backed',
    ],
    rightTitle: 'Data and infra',
    rightItems: [
      'MSSQL 2022 for operational + analytics data',
      'Redis 7 for mutex, cooldown, SSE pub/sub',
      'Qdrant optional for semantic search / RAG',
      'Docker Compose on-prem, optional Helm chart for K8s',
    ],
    section: 'Technical',
    note: 'Keep this slide crisp. The main technical reassurance is that the stack is mainstream, understandable, and already validated.',
  });
  addBulletSlide(pptx, {
    title: 'REST API and deployment confidence',
    section: 'Technical',
    bullets: [
      'OpenAPI 3.1 contract with 130 operations across 106 paths.',
      'Public endpoints for request intake, monitor stats, health probes, and docs when enabled.',
      'SSE streams for notifications and system health.',
      'On-prem compose defaults: nginx on 9090, API direct 9091, web direct 9092.',
      'Release validation: integration tests, smoke scripts, queue/SSE/ETL gates, on-prem smoke.',
    ],
    note: 'Use this as the bridge from architecture to enterprise readiness. It is especially useful for platform and security reviewers.',
  });
  addClosingSlide(pptx);
  return pptx;
}

function buildExecutiveDeck(assets) {
  const pptx = createDeck('Lotris Executive', 'Executive Summary Deck');
  addHeroSlide(pptx, {
    title: 'Lotris Executive Brief',
    subtitle: 'A production-ready on-prem ITSM platform for ticket operations, KPI accountability, and incident intelligence.',
    eyebrow: 'EXECUTIVE DECK',
    note: speakerNotes.opener,
  });
  addTwoColumnSlide(pptx, {
    title: 'Why Lotris matters',
    leftTitle: 'Pain today',
    leftItems: [
      'Tickets pile up without enough structure',
      'SLA issues surface too late',
      'Engineer performance lives in spreadsheets',
      'Operational reporting is manual and slow',
    ],
    rightTitle: 'Outcome with Lotris',
    rightItems: [
      'Structured ticketing and queue ownership',
      'Live SLA visibility and escalation',
      'Formal KPI agreements and evidence-based review',
      'Automated reporting and intelligence-backed learning',
    ],
    section: 'Executive',
    note: 'Keep this slide high-level. Translate features into management pain relief and operational confidence.',
  });
  addFeatureGridSlide(pptx, {
    title: 'What the platform delivers',
    section: 'Executive',
    cards: [
      { title: 'Tickets and queues', body: 'Day-to-day operational control with SLA awareness.' },
      { title: 'KPIs and agreements', body: 'Provable individual and team performance.' },
      { title: 'Reporting', body: 'Automated PDF/Excel and scheduled distribution.' },
      { title: 'Intelligence', body: 'RCA, knowledge, semantic search, AI assist.' },
      { title: 'Operations visibility', body: 'Monitor wall, /ops health, analytics jobs.' },
      { title: 'Mobile response', body: 'Lotris Pager for off-desk incident response.' },
    ],
    note: 'This is the executive capability map. Avoid jargon and stay focused on business control, visibility, and readiness.',
  });
  addDoubleScreenshotSlide(pptx, {
    title: 'Market-facing product experience',
    leftImage: assets.landing,
    leftLabel: 'Brand and product positioning',
    rightImage: assets.monitor,
    rightLabel: 'Operational visibility',
    section: 'Executive',
    note: 'Use these visuals to make the product feel real and presentable. The monitor wall especially resonates with operational leaders.',
  });
  addPagerOverviewSlide(pptx);
  addBulletSlide(pptx, {
    title: 'Why the mobile pager matters',
    section: 'Executive',
    bullets: [
      'Engineers and leads can respond away from desk and off the corporate network.',
      'Push alerts improve acknowledge time and reduce missed SLA windows.',
      'No second platform — the pager reuses the existing Lotris API and governance model.',
      'Security remains enterprise-aligned: Entra MFA, JWT, minimal push payloads, biometric lock.',
    ],
    note: 'For executives, position the pager as business continuity and SLA protection rather than as a mobile feature checklist.',
  });
  addBulletSlide(pptx, {
    title: 'Enterprise fit',
    section: 'Executive',
    dark: true,
    bullets: [
      'On-prem validated and designed for regulated environments.',
      'Hybrid authentication model supports enterprise identity requirements.',
      'OpenAPI contract and structured handover docs reduce adoption risk.',
      'Release already validated through smoke gates and operations scripts.',
    ],
    note: 'This slide is for sponsor reassurance. The key message is that Lotris is not only feature-rich, but operationally credible.',
  });
  addClosingSlide(pptx, 'Next step: align audience, rollout path, and demo flow');
  return pptx;
}

function buildSalesDeck(assets) {
  const pptx = createDeck('Lotris Sales', 'Sales / Demo Deck');
  addHeroSlide(pptx, {
    title: 'Lotris Sales Deck',
    subtitle: 'A polished story for tickets, KPIs, intelligence, and mobile response — designed for product demos and customer conversations.',
    eyebrow: 'SALES DECK',
    note: 'Open with confidence and keep the tone energetic. This deck should feel more like a product narrative than a documentation export.',
  });
  addFeatureGridSlide(pptx, {
    title: 'Core differentiators',
    section: 'Sales',
    cards: [
      { title: 'On-prem ITSM', body: 'Customer infrastructure, not forced SaaS.' },
      { title: 'Provable KPIs', body: 'Performance agreements and live scorecards.' },
      { title: 'RCA + knowledge', body: 'Operational learning built into the platform.' },
      { title: 'Monitor wall', body: 'Public NOC visibility for operations teams.' },
      { title: 'API-first', body: 'OpenAPI 3.1, SSE, public intake, extensible design.' },
      { title: 'Lotris Pager', body: 'Push-driven mobile response for engineers and leads.' },
    ],
    note: 'This is the sales positioning slide. Hit differentiation, not implementation detail.',
  });
  addDoubleScreenshotSlide(pptx, {
    title: 'Screens customers can recognise immediately',
    leftImage: assets.landing,
    leftLabel: 'Landing / product narrative',
    rightImage: assets.requestAccess,
    rightLabel: 'Buyer entry and demo request path',
    section: 'Sales',
    note: 'These public screens help create confidence and make the product feel ready for customer-facing conversations.',
  });
  addScreenshotSlide(pptx, {
    title: 'Intake and service request experience',
    imagePath: assets.request,
    caption: 'Real application screen capture — public intake',
    bullets: [
      'Simple requester experience',
      'Routes into governed ticket operations',
      'Pairs well with email-to-ticket and queue workflows',
      'Ideal for customer and internal service desks',
    ],
    section: 'Sales',
    note: 'This is a good “start of journey” screen for demos because it is concrete and easy to understand.',
  });
  addFeatureGridSlide(pptx, {
    title: 'Intelligence story',
    section: 'Sales',
    dark: true,
    cards: [
      { title: 'Ask Knowledge Base', body: 'Grounded answers from published knowledge and RCA content.' },
      { title: 'Problems register', body: 'Recurring incidents become governed investigations.' },
      { title: 'RCA workflow', body: 'Approval path from draft to publish.' },
      { title: 'Provider flexibility', body: 'OpenAI, Claude, Azure OpenAI, Copilot — tenant-configurable.' },
      { title: 'Teams alerts', body: 'Critical events routed into familiar collaboration channels.' },
      { title: 'On-prem unlock', body: 'All intelligence features available for on-prem delivery.' },
    ],
    note: 'For sales, present intelligence as controlled, tenant-configurable augmentation — not uncontrolled AI experimentation.',
  });
  addPagerOverviewSlide(pptx);
  addPagerWalkthroughSlide(
    pptx,
    'Pager walkthrough — customer-friendly overview',
    [
      { label: 'Login', title: 'Login', lines: ['Microsoft sign-in', 'Email/password fallback', 'Secure device storage'], active: 3 },
      { label: 'Alerts', title: 'Alerts', lines: ['Assigned · INC-1042', 'SLA warning', 'Escalation event'], active: 0 },
      { label: 'My Work', title: 'My Tickets', lines: ['HIGH · 14m', 'MED · 22m', 'LOW · 2h'], active: 1 },
    ],
    'Use these screens to explain the product quickly to a prospect. Keep the language outcome-focused: acknowledge, triage, resolve.',
  );
  addPagerWalkthroughSlide(
    pptx,
    'Pager walkthrough — lead response',
    [
      { label: 'Queue', title: 'Queue', lines: ['Unclaimed queue view', 'One-tap claim', 'Fast remote pickup'], active: 2 },
      { label: 'Detail', title: 'INC-1042', lines: ['Status transitions', 'Comment update', 'Core fields only'], active: 2 },
      { label: 'Lead', title: 'Quick Assign', lines: ['Team workload view', 'Rebalance suggestions', 'Apply all'], active: 2 },
    ],
    'Highlight that the lead workflow is not just mobile viewing — it supports action and workload balancing.',
  );
  addBulletSlide(pptx, {
    title: 'Common objections answered',
    section: 'Sales',
    bullets: [
      '“We need on-prem.” — Lotris is built for it.',
      '“We already have identity standards.” — Entra, LDAP, and local identity are supported.',
      '“We do not want a second mobile backend.” — the pager uses Lotris.Api only.',
      '“We need proof of seriousness.” — release is validated through documented smoke and gate scripts.',
    ],
    note: 'This slide is useful near the close of a customer conversation. It handles the likely objections with direct, low-drama answers.',
  });
  addClosingSlide(pptx, 'Next step: tailored product tour and stakeholder mapping');
  return pptx;
}

function buildTechnicalDeck(assets) {
  const pptx = createDeck('Lotris IT Technical', 'IT Technical Deck');
  addHeroSlide(pptx, {
    title: 'Lotris IT Technical Deck',
    subtitle: 'Architecture, API, deployment, security, and operations for teams that need implementation confidence.',
    eyebrow: 'IT TECHNICAL DECK',
    note: speakerNotes.technical,
  });
  addArchitectureSlide(pptx);
  addTwoColumnSlide(pptx, {
    title: 'Technology stack',
    leftTitle: 'Application layer',
    leftItems: [
      'Next.js 15 + React frontend',
      'ASP.NET Core 9 REST API',
      'Expo React Native pager client',
      'Hangfire workers in-process',
    ],
    rightTitle: 'State and infrastructure',
    rightItems: [
      'MSSQL 2022 for operational + analytics data',
      'Redis 7 for mutex, cooldown, SSE pub/sub',
      'Optional Qdrant vector sidecar',
      'Docker Compose on-prem; optional Helm for Kubernetes',
    ],
    section: 'Technical',
    note: 'Start technical stakeholder conversations here: mainstream stack, bounded dependencies, and clear service roles.',
  });
  addBulletSlide(pptx, {
    title: 'Authentication and RBAC',
    section: 'Technical',
    bullets: [
      'Identity (default on-prem), optional Entra OIDC, LDAP-ready architecture.',
      'JWT auth with sub, tenant_id, and role claims.',
      'Roles: ENGINEER, TEAM_LEAD, IT_MANAGER, ADMIN, SUPERADMIN.',
      'Controller-level role enforcement plus tenant-scoped data access.',
      'Team lead+ gates for workload rebalance and batch ticket reassignment.',
    ],
    note: 'This is the slide for IAM and application security reviewers. Keep it concrete and implementation-aware.',
  });
  addBulletSlide(pptx, {
    title: 'REST API contract',
    section: 'Technical',
    bullets: [
      'OpenAPI 3.1 committed contract with 130 operations.',
      'Scalar docs at /openapi when UI is enabled.',
      'Public routes: request intake, monitor stats, health probes.',
      'SSE: notifications and system health streams.',
      'TypeScript codegen supported via pnpm api:sync.',
    ],
    note: 'Reinforce that the API surface is documented, consistent, and codegen-friendly rather than ad hoc.',
  });
  addFeatureGridSlide(pptx, {
    title: 'API domains',
    section: 'Technical',
    cards: [
      { title: 'Core', body: 'Tickets, Queue, Tasks, Dashboard' },
      { title: 'KPI', body: 'Definitions, agreements, scoring, trends' },
      { title: 'Reports', body: 'Generate, schedule, deliver, narrative' },
      { title: 'Intelligence', body: 'Problems, RCA, Knowledge, Search' },
      { title: 'Admin', body: 'Users, teams, routing, intelligence config' },
      { title: 'Ops', body: 'Health, analytics jobs, audit, devices' },
    ],
    note: 'This slide helps technical stakeholders quickly map the product surface area without reading the full API reference.',
  });
  addBulletSlide(pptx, {
    title: 'Data and background jobs',
    section: 'Technical',
    bullets: [
      'MSSQL stores both dbo operational entities and analytics rollups.',
      'Redis handles queue mutex, cooldown windows, and SSE pub/sub.',
      'Qdrant supports semantic knowledge search but is not required for API uptime.',
      'Hangfire jobs cover SLA, auto-assign, analytics rollup, reports, IMAP intake, and knowledge indexing.',
      'On-prem defaults unlock all intelligence features without SaaS payment gating.',
    ],
    note: 'Use this slide to show graceful degradation and why the platform remains operational even if optional intelligence components are unavailable.',
  });
  addDoubleScreenshotSlide(pptx, {
    title: 'Real surfaces available today',
    leftImage: assets.monitor,
    leftLabel: 'Public monitor wall',
    rightImage: assets.login,
    rightLabel: 'Login / auth surface',
    section: 'Technical',
    note: 'These are helpful anchors during technical walkthroughs because they show real reachable routes without needing protected session setup.',
  });
  addBulletSlide(pptx, {
    title: 'Deployment options',
    section: 'Technical',
    bullets: [
      'On-prem Docker Compose: docker-compose.onprem.yml with nginx, web, API, MSSQL, Redis, Qdrant.',
      'Ports: 9090 browser-facing, 9091 API direct, 9092 web direct.',
      'Developer mode: local docker-compose.yml plus pnpm api:restart and pnpm --filter @lotris/web dev.',
      'Optional Helm chart supports environments with external MSSQL and Redis.',
      'First boot typically requires 2–4 minutes for MSSQL migrations.',
    ],
    note: 'This slide is especially important for platform and infra teams planning pilot deployment or lab validation.',
  });
  addBulletSlide(pptx, {
    title: 'Validation and operations',
    section: 'Technical',
    dark: true,
    bullets: [
      'Integration tests: dotnet test',
      'REST smoke: pnpm smoke:phase5',
      'Queue/SLA gate: pnpm gate:queue',
      'SSE gate: pnpm gate:sse',
      'ETL gate: pnpm gate:etl',
      'On-prem smoke: pnpm onprem:smoke',
    ],
    note: 'Close with validation evidence. This is what turns the platform from “interesting” into “safe to operationalise.”',
  });
  addClosingSlide(pptx, 'Next step: pilot deployment and technical validation');
  return pptx;
}

function writeDeckIndex() {
  const lines = [
    '# Lotris Deck Package',
    '',
    '| Deck | Purpose | File |',
    '|------|---------|------|',
    '| Master | Full marketing + technical story | `Lotris-Master.pptx` |',
    '| Executive | Sponsor / leadership pitch | `Lotris-Executive.pptx` |',
    '| Sales | Product pitch / demos | `Lotris-Sales.pptx` |',
    '| IT Technical | Architecture / API / deployment / ops | `Lotris-IT-Technical.pptx` |',
    '',
    'Generated by `pnpm docs:marketing:ppt`.',
  ];
  fs.writeFileSync(INDEX_FILE, `${lines.join('\n')}\n`);
}

async function writeDeck(fileName, pptx) {
  await pptx.writeFile({ fileName });
  return pptx.slides.length;
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(ASSET_DIR);
  const assets = prepareAssets();
  writeDeckIndex();

  const decks = {
    master: buildMasterDeck({
      landing: assets.landing,
      requestAccess: assets['request-access'],
      request: assets.request,
      monitor: assets.monitor,
      login: assets.login,
    }),
    executive: buildExecutiveDeck({
      landing: assets.landing,
      requestAccess: assets['request-access'],
      monitor: assets.monitor,
    }),
    sales: buildSalesDeck({
      landing: assets.landing,
      requestAccess: assets['request-access'],
      request: assets.request,
    }),
    technical: buildTechnicalDeck({
      monitor: assets.monitor,
      login: assets.login,
    }),
  };

  const results = [];
  for (const [key, pptx] of Object.entries(decks)) {
    const slides = await writeDeck(deckFiles[key], pptx);
    results.push({ key, file: deckFiles[key], slides });
  }

  console.log('\n✓ Created Lotris presentation package\n');
  results.forEach((result) => {
    console.log(`  ${path.basename(result.file)} — ${result.slides} slides`);
  });
  console.log(`\nAssets: ${ASSET_DIR}`);
  console.log(`Index:  ${INDEX_FILE}\n`);
}

await main();
