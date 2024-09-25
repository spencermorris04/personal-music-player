// src/app/api/songs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db/index';
import { songs } from '~/server/db/schema';
import { TRPCError } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "~/server/auth"; // Adjust the path based on your project structure
import { desc } from 'drizzle-orm'; // Import the 'desc' function

export async function GET(request: NextRequest) {
  try {
    // Optionally, enforce authentication
    // If you want the music player to be public, you can remove the following authentication check
    /*
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    */

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '32', 10); // Default to 32 songs per request

    // Fetch songs from the database ordered by creation date (newest first)
    const fetchedSongs = await db
      .select()
      .from(songs)
      .orderBy(desc(songs.createdAt)) // Use the 'desc' function correctly
      .offset(offset)
      .limit(limit);

    return NextResponse.json({ songs: fetchedSongs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
