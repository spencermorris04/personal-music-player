// src/components/MusicPlayer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

type Song = {
  id: number;
  r2Id: string;
  songTitle: string;
  artistName: string; // Added artistName
  uploaderUserId: string;
  genre: string;
  instruments: string;
  description: string;
  lyrics: string;
  createdAt: string;
};

type MusicPlayerProps = {
  song: Song | null;
};

const MusicPlayer: React.FC<MusicPlayerProps> = ({ song }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (song) {
      const fetchPreSignedUrl = async () => {
        try {
          const response = await fetch(`/api/songs/play/${song.r2Id}`);

          if (response.ok) {
            const data = await response.json();
            setAudioUrl(data.url);
            setIsPlaying(true);
          } else {
            const errorData = await response.json();
            console.error(`Error from play API: ${errorData.error}`);
            alert(`Error: ${errorData.error}`);
          }
        } catch (error) {
          console.error('Error fetching pre-signed URL:', error);
          alert('An error occurred while trying to play the song.');
        }
      };
      fetchPreSignedUrl();
    } else {
      // No song selected, reset audioUrl and other states
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [song]);

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
            <p className="text-sm">Artist: {song.artistName}</p> {/* Display Artist Name */}
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
