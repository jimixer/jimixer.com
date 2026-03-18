#!/usr/bin/env node
/**
 * Migrate existing gallery images from website/public to S3
 *
 * Usage:
 *   node scripts/migrate-gallery-images.js
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// AWS Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1',
});

const S3_BUCKET = process.env.S3_BUCKET || 'gallery.jimixer.com';
const PUBLIC_DIR = path.join(__dirname, '../website/public/gallery');

/**
 * Get all image files recursively
 */
function getImageFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Upload file to S3
 */
async function uploadToS3(filePath) {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const s3Key = `gallery/${relativePath}`;

  console.log(`Uploading: ${relativePath} -> ${s3Key}`);

  // Read file
  const buffer = fs.readFileSync(filePath);

  // If not WebP, convert it
  let uploadBuffer = buffer;
  let contentType = 'image/webp';

  if (!filePath.endsWith('.webp')) {
    console.log(`  Converting to WebP...`);
    uploadBuffer = await sharp(buffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    // Update S3 key to .webp extension
    const newKey = s3Key.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    console.log(`  Converted: ${s3Key} -> ${newKey}`);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: newKey,
      Body: uploadBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);
    console.log(`  ✓ Uploaded: ${newKey}`);

    return newKey;
  } else {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: uploadBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(command);
    console.log(`  ✓ Uploaded: ${s3Key}`);

    return s3Key;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting gallery image migration...\n');
  console.log(`Source: ${PUBLIC_DIR}`);
  console.log(`Dest: s3://${S3_BUCKET}/gallery/\n`);

  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`❌ Directory not found: ${PUBLIC_DIR}`);
    process.exit(1);
  }

  const imageFiles = getImageFiles(PUBLIC_DIR);
  console.log(`Found ${imageFiles.length} images\n`);

  let uploaded = 0;
  let failed = 0;

  for (const file of imageFiles) {
    try {
      await uploadToS3(file);
      uploaded++;
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('✅ Migration complete!');
  console.log(`Uploaded: ${uploaded}, Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Update gallery.json URLs to use S3 paths');
    console.log('2. Test gallery-manager image display');
    console.log('3. Test website gallery page');
    console.log('4. Remove website/public/gallery/ directory (after verification)');
  }
}

// Run migration
migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
