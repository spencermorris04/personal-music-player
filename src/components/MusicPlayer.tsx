// src/components/MusicPlayer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { Song, CachedSong } from '~/types';
import { addSongToDB, getSongFromDB } from '~/utils/indexedDB';
import useOnlineStatus from '~/hooks/useOnlineStatus';

type MusicPlayerProps = {
  song: Song | null;
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ song }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const setupAudio = async () => {
      if (song) {
        // Check if the song exists in IndexedDB
        const cachedSong = await getSongFromDB(song.r2Id);

        if (cachedSong) {
          // Create a Blob URL from the cached blob
          const blobUrl = URL.createObjectURL(cachedSong.blob);
          setAudioUrl(blobUrl);
          setIsPlaying(true);
        } else if (isOnline) {
          // Fetch from API and cache it
          try {
            const response = await fetch(`/api/songs/play/${song.r2Id}`);

            if (response.ok) {
              const data = await response.json();
              const audioResponse = await fetch(data.url);
              const blob = await audioResponse.blob();

              // Create a CachedSong object
              const cached: CachedSong = {
                ...song,
                blob: blob,
              };

              // Add to IndexedDB
              await addSongToDB(cached);

              // Create a Blob URL
              const blobUrl = URL.createObjectURL(blob);
              setAudioUrl(blobUrl);
              setIsPlaying(true);
            } else {
              const errorData = await response.json();
              console.error(`Error from play API: ${errorData.error}`);
              alert(`Error: ${errorData.error}`);
            }
          } catch (error) {
            console.error('Error fetching song:', error);
            alert('An error occurred while trying to play the song.');
          }
        } else {
          // Offline and song not cached
          alert('You are offline and this song is not cached.');
        }
      } else {
        // No song selected, reset audioUrl and other states
        setAudioUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    };

    setupAudio();
    // Cleanup Blob URLs when song changes or component unmounts
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, isOnline]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updateTime = () => {
        setCurrentTime(audio.currentTime);
      };

      const updateDuration = () => {
        setDuration(audio.duration);
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);

      if (isPlaying && audioUrl) {
        audio
          .play()
          .then(() => {
            // Playback started successfully
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
          });
      } else {
        audio.pause();
      }

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
      };
    }
  }, [isPlaying, audioUrl]);

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Number(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    song && (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 flex flex-col sm:flex-row items-center z-50">
        <div className="flex items-center flex-grow">
          <button onClick={togglePlayPause} className="mr-4">
            {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
          </button>
          <div>
            <h4 className="text-lg font-semibold">{song.songTitle}</h4>
            <p className="text-sm">Artist: {song.artistName}</p>
            <p className="text-sm">{song.genre}</p>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="flex items-center w-full sm:w-auto mt-2 sm:mt-0">
          <span className="text-xs">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleProgressChange}
            className="mx-2 flex-grow"
          />
          <span className="text-xs">{formatTime(duration)}</span>
        </div>
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
      </div>
    )
  );
};

export default MusicPlayer;
