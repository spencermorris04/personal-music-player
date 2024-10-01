// src/components/SongCard.tsx

import React, { useEffect, useState } from 'react';
import { FaMusic } from 'react-icons/fa';
import { Song } from '~/types'; // Importing the shared Song type
import { getSongFromDB } from '~/utils/indexedDB';

interface SongCardProps {
  song: Song;
  onSongSelect: (song: Song) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, onSongSelect }) => {
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    const checkCached = async () => {
      const cachedSong = await getSongFromDB(song.r2Id);
      setIsCached(!!cachedSong);
    };

    checkCached();
  }, [song.r2Id]);

  const handleClick = () => {
    onSongSelect(song);
  };

  return (
    <div
      className="border rounded-lg p-4 hover:bg-gray-100 cursor-pointer flex flex-col"
      onClick={handleClick}
    >
      <div className="h-32 bg-gray-200 flex items-center justify-center mb-4 relative">
        <FaMusic size={48} className="text-gray-400" />
        {isCached && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-1 rounded">
            Cached
          </span>
        )}
      </div>
      <div className="flex-grow">
        <h3 className="text-xl font-semibold mb-2">{song.songTitle}</h3>
        <p className="text-gray-600">Artist: {song.artistName}</p>
        <p className="text-gray-600">Genre: {song.genre}</p>
        <p className="text-gray-600">Instruments: {song.instruments}</p>
      </div>
    </div>
  );
};

export default SongCard;
