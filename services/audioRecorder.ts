let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let activeStream: MediaStream | null = null;

const cleanupRecorder = () => {
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
    }
    mediaRecorder = null;
    activeStream = null;
    audioChunks = [];
};

/**
 * Force cleanup of any active recording resources.
 * Call this from component unmount (useEffect cleanup) to prevent microphone leaks.
 */
export const forceCleanup = () => {
    cleanupRecorder();
};


export const recordAudio = async (): Promise<void> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media Devices API is not supported in this browser.');
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        return;
    }

    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    mediaRecorder = new MediaRecorder(activeStream);
    mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.start();
};

export const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            reject(new Error('No active recording to stop.'));
            return;
        }

        const recorder = mediaRecorder;

        recorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
            cleanupRecorder();
            resolve(blob);
        };

        recorder.onerror = () => {
            cleanupRecorder();
            reject(new Error('Failed to stop recording.'));
        };

        recorder.stop();
    });
};
