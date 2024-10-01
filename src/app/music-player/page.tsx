// src/app/music-player/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import SongCard from '~/components/SongCard';
import MusicPlayer from '~/components/MusicPlayer';
import type { Song, CachedSong } from '~/types'; // Importing the shared Song and CachedSong types
import useOnlineStatus from '~/hooks/useOnlineStatus';
import { getAllCachedSongs } from '~/utils/indexedDB';
import NetworkStatusBanner from '~/components/NetworkStatusBanner'; // Optional

interface SongsResponse {
  songs: Song[];
}

export default function MusicPlayerPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isOnline = useOnlineStatus();
  const limit = 32; // Number of songs to fetch per request

  // Function to fetch songs from the API
  const fetchSongsOnline = async () => {
    try {
      const response = await axios.get<SongsResponse>(`/api/songs?offset=${offset}&limit=${limit}`);
      const fetchedSongs: Song[] = response.data.songs;

      // Map and convert data to match Song interface
      const parsedSongs: Song[] = fetchedSongs.map(song => ({
        ...song,
        uploaderUserId: Number(song.uploaderUserId), // Ensure it's a number
        createdAt: new Date(song.createdAt).toISOString(), // Ensure correct format
      }));

      setSongs(prevSongs => [...prevSongs, ...parsedSongs]);
      setOffset(prevOffset => prevOffset + limit);

      if (fetchedSongs.length < limit) {
        setHasMore(false); // No more songs to load
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      setHasMore(false);
    }
  };

  // Function to fetch songs from IndexedDB
  const fetchSongsOffline = async () => {
    try {
      const cachedSongs: CachedSong[] = await getAllCachedSongs();

      // Convert CachedSong to Song type by excluding the 'blob' property
      const songsFromCache: Song[] = cachedSongs.map(({ blob: _blob, ...rest }) => rest as Song);

      setSongs(songsFromCache);
      setHasMore(false); // No pagination when offline
    } catch (error) {
      console.error('Error fetching cached songs:', error);
    }
  };

  // Function to fetch songs based on online status
  const fetchSongs = async () => {
    if (isOnline) {
      await fetchSongsOnline();
    } else {
      await fetchSongsOffline();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSongs()
      .then(() => setIsInitialLoad(false))
      .catch(error => {
        console.error('Error during initial fetch:', error);
        setIsInitialLoad(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Handler for song selection
  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
  };

  // If offline and no cached songs, display a message
  if (!isOnline && !isInitialLoad && songs.length === 0) {
    return (
      <div className="container mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold mb-4">Music Player</h1>
        <p className="text-center text-gray-600">You are offline and no songs are cached.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-3xl font-bold mb-4">Music Player</h1>
      <NetworkStatusBanner /> {/* Optional */}
      {!isOnline && (
        <div className="mb-4 p-2 bg-yellow-200 text-yellow-800 rounded">
          You are offline. Displaying cached songs.
        </div>
      )}
      <InfiniteScroll
        dataLength={songs.length}
        next={fetchSongs}
        hasMore={hasMore && isOnline}
        loader={<h4>Loading...</h4>}
        endMessage={
          <p className="text-center mt-4">
            <b>No more songs to display.</b>
          </p>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {songs.map(song => (
            <SongCard key={song.id} song={song} onSongSelect={handleSongSelect} />
          ))}
        </div>
      </InfiniteScroll>
      {/* Docked Music Player */}
      <MusicPlayer song={currentSong} />
    </div>
  );
}
