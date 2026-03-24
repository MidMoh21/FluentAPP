import React from 'react';
import { X, Save, History, Trash2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { UserSettings, EnglishLevel, AccentType, SessionRecord } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  sessions: SessionRecord[];
  onClearHistory: () => void;
  isFirstVisit?: boolean;
  isApplyingSettings?: boolean;
  saveError?: string | null;
}

const Settings: React.FC<SettingsProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave, 
  sessions,
  onClearHistory,
  isFirstVisit = false,
  isApplyingSettings = false,
  saveError = null
}) => {
  const [formData, setFormData] = React.useState<UserSettings>(settings);
  const [errors, setErrors] = React.useState<string[]>([]);

  // Sync state when settings prop changes
  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof UserSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field if exists
    if (errors.length > 0) setErrors([]);
  };

  const handleSave = () => {
    // Basic validation for first visit
    if (isFirstVisit) {
      const newErrors = [];
      if (!formData.apiKey?.trim()) newErrors.push('Please enter your Gemini API key.');
      if (!formData.goals.trim()) newErrors.push('Please define your goals.');
      if (!formData.topics.trim()) newErrors.push('Please add some topics.');
      
      if (newErrors.length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    onSave(formData);
    // Note: We do NOT close the modal here immediately for first visit.
    // The parent component handles closing after API success.
    if (!isFirstVisit) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
             {isFirstVisit && <Sparkles className="text-indigo-500 w-6 h-6" />}
             <h2 className="text-xl font-bold text-white">
               {isFirstVisit ? "Welcome to FluentFlow!" : "Coach Settings"}
             </h2>
          </div>
          {!isFirstVisit && (
            <button onClick={onClose} disabled={isApplyingSettings} className="text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {isFirstVisit && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-6">
              <p className="text-indigo-200 text-sm leading-relaxed">
                Before we start, add your Gemini API key and tell me about yourself so I can personalize your training.
              </p>
            </div>
          )}

          {/* API Key Section — always visible */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Gemini API Key</h3>
            <input
              type="password"
              value={formData.apiKey || ''}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              disabled={isApplyingSettings}
              placeholder="Paste your Gemini API key here..."
              className={`w-full bg-gray-800 border rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 font-mono text-sm disabled:opacity-50 ${
                errors.some(e => e.includes('API')) && !formData.apiKey?.trim() ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            <p className="text-xs text-gray-500">
              Your key is stored locally in your browser only.{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Get a free key here →
              </a>
            </p>
          </div>
          
          {/* Section 1: User Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">User Profile</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Level</label>
                <select 
                  value={formData.level}
                  onChange={(e) => handleChange('level', e.target.value)}
                  disabled={isApplyingSettings}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                  <option value="A1">A1 (Beginner)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced)</option>
                  <option value="C2">C2 (Proficient)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Accent</label>
                <select 
                  value={formData.accent}
                  onChange={(e) => handleChange('accent', e.target.value)}
                  disabled={isApplyingSettings}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                  <option value="American">American 🇺🇸</option>
                  <option value="British">British 🇬🇧</option>
                  <option value="Australian">Australian 🇦🇺</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Learning Goals</label>
              <input 
                type="text" 
                value={formData.goals}
                onChange={(e) => handleChange('goals', e.target.value)}
                disabled={isApplyingSettings}
                className={`w-full bg-gray-800 border rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 disabled:opacity-50 ${errors.length && !formData.goals.trim() ? 'border-red-500' : 'border-gray-700'}`}
                placeholder="e.g. Job interviews, Travel, Daily chat"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Preferred Topics</label>
              <input 
                type="text" 
                value={formData.topics}
                onChange={(e) => handleChange('topics', e.target.value)}
                disabled={isApplyingSettings}
                className={`w-full bg-gray-800 border rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 disabled:opacity-50 ${errors.length && !formData.topics.trim() ? 'border-red-500' : 'border-gray-700'}`}
                placeholder="e.g. Tech, Sports, Movies"
              />
            </div>

            {errors.length > 0 && (
              <div className="text-red-400 text-sm mt-2">
                {errors.map((err, i) => <p key={i}>• {err}</p>)}
              </div>
            )}
          </div>

          {/* Section 2: Preferences */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Preferences</h3>
             <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
               <span className="text-gray-300 text-sm">Enable Text-to-Speech Button</span>
               <button 
                onClick={() => handleChange('ttsEnabled', !formData.ttsEnabled)}
                disabled={isApplyingSettings}
                className={`w-12 h-6 rounded-full transition-colors relative disabled:opacity-50 ${formData.ttsEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
               >
                 <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.ttsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
             </div>
          </div>

          {/* Section 3: History Stats (Hide for new users) */}
          {!isFirstVisit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Session History</h3>
                 {sessions.length > 0 && (
                   <button onClick={onClearHistory} disabled={isApplyingSettings} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50">
                     <Trash2 size={12} /> Clear
                   </button>
                 )}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                 <div className="flex items-center gap-2 mb-4 text-gray-300">
                    <History size={16} />
                    <span className="font-semibold">{sessions.length} Sessions Completed</span>
                 </div>
                 
                 <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                   {sessions.slice().reverse().map(session => (
                     <div key={session.id} className="flex justify-between text-xs text-gray-400 py-1 border-b border-gray-700/50 last:border-0">
                        <span>{new Date(session.date).toLocaleDateString()}</span>
                        <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-200">{session.modeUsed} Mode</span>
                     </div>
                   ))}
                   {sessions.length === 0 && <p className="text-sm text-gray-500 italic">No sessions recorded yet.</p>}
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/50">
          
          {saveError && (
             <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                <AlertCircle size={16} className="flex-shrink-0" />
                <p>{saveError}</p>
             </div>
          )}

          <button 
            onClick={handleSave}
            disabled={isApplyingSettings}
            className={`w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isApplyingSettings ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isFirstVisit ? 'Starting Session...' : 'Applying Changes...'}
              </>
            ) : isFirstVisit ? (
              <>
                <Sparkles size={18} /> Start Chat
              </>
            ) : (
              <>
                <Save size={18} /> Save Changes & Restart
              </>
            )}
          </button>
          
          {!isFirstVisit && (
            <p className="text-center text-xs text-gray-500 mt-3">
               Saving will restart the current conversation to apply new settings.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Settings;