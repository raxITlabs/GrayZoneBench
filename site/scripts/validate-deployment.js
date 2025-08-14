#!/usr/bin/env node

/**
 * Deployment validation script for Vercel
 * Checks if all required environment variables and configurations are set
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating deployment configuration...\n');

const checks = [];

// Check 1: Environment variables
const requiredEnvVars = ['GCS_SERVICE_ACCOUNT', 'GCS_BUCKET_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length === 0) {
  checks.push({ name: 'Environment Variables', status: '✅', message: 'All required env vars present' });
} else {
  checks.push({ 
    name: 'Environment Variables', 
    status: '❌', 
    message: `Missing: ${missingEnvVars.join(', ')}` 
  });
}

// Check 2: GCS Service Account JSON validation
if (process.env.GCS_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.GCS_SERVICE_ACCOUNT);
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length === 0) {
      checks.push({ name: 'Service Account JSON', status: '✅', message: 'Valid service account format' });
    } else {
      checks.push({ 
        name: 'Service Account JSON', 
        status: '❌', 
        message: `Missing fields: ${missingFields.join(', ')}` 
      });
    }
  } catch (error) {
    checks.push({ name: 'Service Account JSON', status: '❌', message: 'Invalid JSON format' });
  }
} else {
  checks.push({ name: 'Service Account JSON', status: '⏭️', message: 'Skipped - no GCS_SERVICE_ACCOUNT' });
}

// Check 3: Next.js configuration
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  checks.push({ name: 'Next.js Config', status: '✅', message: 'next.config.ts found' });
} else {
  checks.push({ name: 'Next.js Config', status: '❌', message: 'next.config.ts not found' });
}

// Check 4: Package.json validation  
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.engines && packageJson.engines.node) {
    checks.push({ name: 'Node.js Version', status: '✅', message: `Specified: ${packageJson.engines.node}` });
  } else {
    checks.push({ name: 'Node.js Version', status: '⚠️', message: 'No engine version specified' });
  }
  
  if (packageJson.dependencies && packageJson.dependencies['@google-cloud/storage']) {
    checks.push({ name: 'GCS Dependency', status: '✅', message: 'Google Cloud Storage installed' });
  } else {
    checks.push({ name: 'GCS Dependency', status: '❌', message: '@google-cloud/storage not found' });
  }
} else {
  checks.push({ name: 'Package.json', status: '❌', message: 'package.json not found' });
}

// Check 5: Vercel configuration
const vercelConfigPath = path.join(__dirname, '..', '..', 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  checks.push({ name: 'Vercel Config', status: '✅', message: 'vercel.json found in root' });
} else {
  checks.push({ name: 'Vercel Config', status: '❌', message: 'vercel.json not found in root' });
}

// Print results
console.log('Validation Results:');
console.log('==================');
checks.forEach(check => {
  console.log(`${check.status} ${check.name}: ${check.message}`);
});

// Summary
const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);

if (failed === 0) {
  console.log('🎉 Ready for deployment!');
  process.exit(0);
} else {
  console.log('🚨 Fix the failed checks before deploying.');
  process.exit(1);
}