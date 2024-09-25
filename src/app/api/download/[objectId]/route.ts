// src/app/api/download/[objectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client with Cloudflare R2 settings
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.NEXT_PUBLIC_CLOUDFLARE_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY as string,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: { objectId: string } }
) {
  try {
    const { objectId } = params;

    if (!objectId || typeof objectId !== 'string') {
      return NextResponse.json({ error: 'Invalid objectId' }, { status: 400 });
    }

    // Construct the object key as per your R2 bucket
    const objectKey = objectId; // Assuming object keys do not include file extensions

    console.log(`Generating pre-signed URL for object key: ${objectKey}`);

    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME as string,
      Key: objectKey,
    });

    // Generate a pre-signed URL valid for 1 hour (3600 seconds)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate pre-signed URL' },
      { status: 500 }
    );
  }
}
