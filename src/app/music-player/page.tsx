// src/app/music-player/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import SongCard from '~/components/SongCard';
import MusicPlayer from '~/components/MusicPlayer';
import { Song } from '~/types'; // Importing the shared Song type

export default function MusicPlayerPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  const limit = 32; // Number of songs to fetch per request

  // Function to fetch songs from the API
  const fetchSongs = async () => {
    try {
      const response = await axios.get(`/api/songs?offset=${offset}&limit=${limit}`);
      const fetchedSongs: Song[] = response.data.songs;

      setSongs(prevSongs => [...prevSongs, ...fetchedSongs]);
      setOffset(prevOffset => prevOffset + limit);

      if (fetchedSongs.length < limit) {
        setHasMore(false); // No more songs to load
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      setHasMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for song selection
  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
  };

  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-3xl font-bold mb-4">Music Player</h1>
      <InfiniteScroll
        dataLength={songs.length}
        next={fetchSongs}
        hasMore={hasMore}
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
