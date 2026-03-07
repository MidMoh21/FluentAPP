import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, Search } from 'lucide-react';
import { getChunks, deleteChunk } from '../services/storageService';
import { Chunk, ChunkCategory } from '../types';

interface ChunkLibraryProps {
    onClose: () => void;
}

const ChunkLibrary: React.FC<ChunkLibraryProps> = ({ onClose }) => {
    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [filter, setFilter] = useState<ChunkCategory | 'all'>('all');

    useEffect(() => {
        setChunks(getChunks());
    }, []);

    const handleDelete = (id: string) => {
        deleteChunk(id);
        setChunks(getChunks());
    };

    const filteredChunks = filter === 'all' ? chunks : chunks.filter(c => c.category === filter);

    const categories: ChunkCategory[] = ['work', 'sports', 'opinions', 'daily_life', 'interview', 'other'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Bookmark className="text-indigo-400 w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Chunk Library</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-4 border-b border-gray-800 flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize whitespace-nowrap ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                        >
                            {cat.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="space-y-3">
                        {filteredChunks.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">No chunks saved yet.</p>
                        ) : (
                            filteredChunks.map(chunk => (
                                <div key={chunk.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-lg font-bold text-indigo-300">"{chunk.phrase}"</p>
                                            <span className="inline-block mt-2 px-2 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400 uppercase tracking-wide">
                                                {chunk.category}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(chunk.id)}
                                            className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ChunkLibrary;
