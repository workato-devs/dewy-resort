#!/usr/bin/env node

/**
 * Homepage Styling Verification Script
 * 
 * This script verifies that the homepage styling implementation meets all requirements:
 * - Gradient background renders correctly
 * - Rakkas font loads and displays properly
 * - All color values match specifications
 * - Responsive behavior works on mobile devices
 * - Button hover states are implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Homepage Styling Verification\n');
console.log('=' .repeat(60));

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(test) {
  results.passed.push(test);
  console.log(`✅ PASS: ${test}`);
}

function fail(test, reason) {
  results.failed.push({ test, reason });
  console.log(`❌ FAIL: ${test}`);
  console.log(`   Reason: ${reason}`);
}

function warn(test, reason) {
  results.warnings.push({ test, reason });
  console.log(`⚠️  WARN: ${test}`);
  console.log(`   Reason: ${reason}`);
}

// Read implementation files
const pageContent = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf8');
const layoutContent = fs.readFileSync(path.join(__dirname, '../app/layout.tsx'), 'utf8');
const tailwindConfig = fs.readFileSync(path.join(__dirname, '../tailwind.config.ts'), 'utf8');

console.log('\n📋 Testing Configuration Files\n');

// Test 1: Rakkas font import in layout
console.log('1. Rakkas Font Configuration');
if (layoutContent.includes('import { Rakkas }') && layoutContent.includes('next/font/google')) {
  pass('Rakkas font imported from next/font/google');
} else {
  fail('Rakkas font import', 'Font not imported from next/font/google');
}

if (layoutContent.includes("variable: '--font-rakkas'")) {
  pass('Rakkas font variable configured');
} else {
  fail('Rakkas font variable', 'Font variable not set to --font-rakkas');
}

if (layoutContent.includes('className={rakkas.variable}')) {
  pass('Rakkas font variable applied to HTML element');
} else {
  fail('Rakkas font application', 'Font variable not applied to root HTML element');
}

// Test 2: Tailwind custom colors
console.log('\n2. Custom Color Configuration');
const requiredColors = {
  'dewy-purple': '#1F0757',
  'dewy-blue-light': '#E3EAFA',
  'dewy-pink-light': '#FBF6FD',
  'dewy-gray': '#808080'
};

for (const [colorName, colorValue] of Object.entries(requiredColors)) {
  if (tailwindConfig.includes(`'${colorName}': '${colorValue}'`)) {
    pass(`Color ${colorName} configured as ${colorValue}`);
  } else {
    fail(`Color ${colorName}`, `Expected ${colorValue} in tailwind.config.ts`);
  }
}

// Test 3: Rakkas font family in Tailwind
if (tailwindConfig.includes("rakkas: ['var(--font-rakkas)'")) {
  pass('Rakkas font family configured in Tailwind');
} else {
  fail('Rakkas font family', 'Font family not configured in Tailwind');
}

console.log('\n📋 Testing Homepage Implementation\n');

// Test 4: Gradient background
console.log('3. Gradient Background');
if (pageContent.includes('bg-gradient-to-b') && 
    pageContent.includes('from-[#E3EAFA]') && 
    pageContent.includes('to-[#FBF6FD]')) {
  pass('Gradient background configured from #E3EAFA to #FBF6FD');
} else {
  fail('Gradient background', 'Gradient not configured with correct colors');
}

// Test 5: Dewy icon positioning
console.log('\n4. Dewy Icon');
if (pageContent.includes('mb-8') && pageContent.match(/Hotel.*h-24.*w-24.*text-\[#1F0757\]/s)) {
  pass('Dewy icon positioned above headline with correct styling');
} else {
  warn('Dewy icon', 'Icon styling may not match exact specifications');
}

// Test 6: Headline styling
console.log('\n5. Headline Styling');
if (pageContent.includes('Welcome to Dewy Resort Hotel')) {
  pass('Headline text matches specification');
} else {
  fail('Headline text', 'Text does not match "Welcome to Dewy Resort Hotel"');
}

if (pageContent.includes('font-rakkas')) {
  pass('Headline uses Rakkas font family');
} else {
  fail('Headline font', 'Rakkas font not applied to headline');
}

if (pageContent.includes('text-[70px]')) {
  pass('Headline font size set to 70px');
} else {
  fail('Headline font size', 'Font size not set to 70px');
}

if (pageContent.match(/text-dewy-purple|text-\[#1F0757\]/)) {
  pass('Headline color set to #1F0757');
} else {
  fail('Headline color', 'Color not set to #1F0757');
}

if (pageContent.includes('text-center')) {
  pass('Headline is center-aligned');
} else {
  fail('Headline alignment', 'Headline not center-aligned');
}

// Test 7: Responsive headline
if (pageContent.includes('sm:text-[48px]')) {
  pass('Headline has responsive scaling for mobile (48px)');
} else {
  warn('Headline responsive', 'Mobile font size may not be optimized');
}

// Test 8: Subheadline styling
console.log('\n6. Subheadline Styling');
const expectedSubheadline = 'Experience luxury hospitality with our modern management system';
if (pageContent.includes(expectedSubheadline)) {
  pass('Subheadline text matches specification');
} else {
  fail('Subheadline text', 'Text does not match specification');
}

if (pageContent.includes('text-[34px]')) {
  pass('Subheadline font size set to 34px');
} else {
  fail('Subheadline font size', 'Font size not set to 34px');
}

if (pageContent.match(/text-\[#1F0757\].*max-w-4xl/s) || pageContent.match(/max-w-4xl.*text-\[#1F0757\]/s)) {
  pass('Subheadline color and max-width configured');
} else {
  warn('Subheadline styling', 'Color or max-width may not be configured correctly');
}

// Test 9: Responsive subheadline
if (pageContent.includes('sm:text-[24px]')) {
  pass('Subheadline has responsive scaling for mobile (24px)');
} else {
  warn('Subheadline responsive', 'Mobile font size may not be optimized');
}

// Test 10: Button styling
console.log('\n7. Button Styling');
if (pageContent.includes('Guest Portal')) {
  pass('Primary button labeled "Guest Portal"');
} else {
  fail('Primary button label', 'Button not labeled "Guest Portal"');
}

if (pageContent.includes('Staff Login')) {
  pass('Secondary button labeled "Staff Login"');
} else {
  fail('Secondary button label', 'Button not labeled "Staff Login"');
}

// Check primary button styling
if (pageContent.match(/Guest Portal.*bg-dewy-purple.*text-white/s) || 
    pageContent.match(/bg-dewy-purple.*text-white.*Guest Portal/s)) {
  pass('Primary button has #1F0757 background and white text');
} else {
  warn('Primary button styling', 'Background or text color may not match specification');
}

// Check secondary button styling
if (pageContent.match(/Staff Login.*bg-white.*text-dewy-purple.*border-2.*border-dewy-purple/s) ||
    pageContent.match(/bg-white.*text-dewy-purple.*border.*Staff Login/s)) {
  pass('Secondary button has white background with #1F0757 border');
} else {
  warn('Secondary button styling', 'Background, border, or text color may not match specification');
}

// Test 11: Button hover states
if (pageContent.includes('hover:bg-dewy-purple/90') || pageContent.includes('hover:opacity-90')) {
  pass('Primary button has hover state');
} else {
  warn('Primary button hover', 'Hover state may not be implemented');
}

if (pageContent.includes('hover:bg-dewy-purple') && pageContent.includes('hover:text-white')) {
  pass('Secondary button has hover state');
} else {
  warn('Secondary button hover', 'Hover state may not be implemented');
}

// Test 12: Button transitions
if (pageContent.includes('transition-colors') || pageContent.includes('transition-opacity')) {
  pass('Buttons have transition animations');
} else {
  warn('Button transitions', 'Transition animations may not be implemented');
}

// Test 13: Responsive button layout
if (pageContent.match(/flex.*flex-col.*sm:flex-row/s)) {
  pass('Buttons stack vertically on mobile and horizontally on desktop');
} else {
  warn('Button responsive layout', 'Responsive stacking may not be implemented');
}

// Test 14: Card body copy color
console.log('\n8. Card Body Copy');
if (pageContent.includes('text-dewy-gray')) {
  pass('Card body copy uses #808080 color (dewy-gray)');
} else {
  fail('Card body copy color', 'Color not set to #808080');
}

// Count card descriptions with correct color
const cardDescriptionMatches = (pageContent.match(/CardDescription.*text-dewy-gray/g) || []).length;
if (cardDescriptionMatches >= 4) {
  pass(`All ${cardDescriptionMatches} card descriptions use dewy-gray color`);
} else {
  warn('Card descriptions', `Only ${cardDescriptionMatches} card descriptions use dewy-gray`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary\n');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(({ test, reason }) => {
    console.log(`   - ${test}: ${reason}`);
  });
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(({ test, reason }) => {
    console.log(`   - ${test}: ${reason}`);
  });
}

console.log('\n' + '='.repeat(60));

// Manual testing checklist
console.log('\n📝 Manual Testing Checklist\n');
console.log('Please verify the following in your browser:\n');
console.log('□ Gradient background renders smoothly from light blue to light pink');
console.log('□ Rakkas font displays correctly in the headline');
console.log('□ All colors match the brand specifications');
console.log('□ Headline scales appropriately on mobile devices');
console.log('□ Subheadline remains readable at smaller sizes');
console.log('□ Primary button hover effect works (opacity or color change)');
console.log('□ Secondary button hover effect works (background becomes purple)');
console.log('□ Buttons stack vertically on mobile screens');
console.log('□ Card body text is readable with #808080 color');
console.log('□ Layout works in Chrome, Firefox, Safari, and Edge');
console.log('\n🌐 View the homepage at: http://localhost:3000\n');

// Exit with appropriate code
process.exit(results.failed.length > 0 ? 1 : 0);
