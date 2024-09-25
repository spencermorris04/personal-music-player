// src/app/api/songs/play/[r2Id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db/index';
import { songs } from '~/server/db/schema';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { eq } from 'drizzle-orm';

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
  { params }: { params: { r2Id: string } }
) {
  try {
    const { r2Id } = params;

    if (!r2Id || typeof r2Id !== 'string') {
      return NextResponse.json({ error: 'Invalid r2Id' }, { status: 400 });
    }

    // Fetch the song from the database using r2Id
    const song = await db
      .select()
      .from(songs)
      .where(eq(songs.r2Id, r2Id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Construct the object key with the .ogg extension
    const objectKey = `${song.r2Id}`; // Ensure this matches your R2 object key

    // Log the object key for debugging
    console.log(`Generating pre-signed URL for key: ${objectKey}`);

    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME as string,
      Key: objectKey,
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour
      return NextResponse.json({ url }, { status: 200 });
    } catch (s3Error: any) {
      console.error(`Failed to generate pre-signed URL: ${s3Error}`);
      return NextResponse.json(
        { error: 'Failed to generate pre-signed URL' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in /api/songs/play/[r2Id]/route.ts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
