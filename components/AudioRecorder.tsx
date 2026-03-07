import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { RecorderState } from '../types';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  state: RecorderState;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, state }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef<boolean>(false);

  // Cleanup microphone stream on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // stream state might be stale in cleanup, so we stop tracks via the ref too
    };
  }, []);


  const startRecording = async () => {
    setPermissionError(false);
    isCancelledRef.current = false;

    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Media Devices API not supported.");
      setPermissionError(true);
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Only process if NOT cancelled
        if (!isCancelledRef.current) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(blob);
        }

        // Clean up stream tracks
        audioStream.getTracks().forEach(track => track.stop());
        setStream(null);
        chunksRef.current = [];
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  if (state === RecorderState.PROCESSING) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-3 px-6 py-3 bg-gray-800 rounded-full border border-gray-700 animate-pulse">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-gray-300 font-medium">Analyzing speech...</span>
        </div>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2">
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/30">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Microphone access denied</span>
        </div>
        <button
          onClick={startRecording}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline mt-1"
        >
          Try enabling permissions and click here
        </button>
      </div>
    );
  }

  const isRecording = !!stream;

  return (
    <div className="flex items-center justify-center p-4">
      {isRecording ? (
        <div className="flex items-center gap-6">
          {/* Cancel / Retry Button */}
          <button
            onClick={cancelRecording}
            className="group flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors"
            title="Cancel & Retry"
          >
            <div className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider">Retry</span>
          </button>

          {/* Stop / Finish Button */}
          <button
            onClick={stopRecording}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-all border-2 border-red-500 cursor-pointer"
            title="Finish Recording"
          >
            <span className="absolute w-full h-full rounded-full bg-red-500 opacity-20 animate-ping"></span>
            <Square className="w-8 h-8 text-red-500 fill-current" />
          </button>

          {/* Invisible spacer to balance layout if needed, or we can add pause here later */}
          <div className="w-10"></div>
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Mic className="w-5 h-5" />
          <span>Tap to Speak</span>
        </button>
      )}

      {isRecording && (
        <div className="absolute mt-28 text-sm text-red-400 font-medium animate-pulse">
          Recording...
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;