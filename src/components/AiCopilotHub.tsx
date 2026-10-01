import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Mic, 
  Image as ImageIcon, 
  Video, 
  Search, 
  MapPin, 
  Music, 
  Volume2, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  Upload, 
  Play, 
  Pause, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  FileText, 
  Sliders, 
  Download,
  Flame,
  Radio
} from 'lucide-react';
import { 
  ChatMessage, 
  ChatRolePreset, 
  AudioTranscriptResult, 
  AiImageResult, 
  AiVideoResult, 
  SearchGroundingResult, 
  MapsGroundingResult, 
  MusicTrackResult, 
  Product,
  UserProfile 
} from '../types.js';
import { persistAiAssetToFirestore } from '../lib/firebase.js';

interface AiCopilotHubProps {
  currentProduct?: Product;
  user: UserProfile | null;
  onAddResearchDoc?: (doc: { title: string; content: string; type: string }) => void;
  onAddProblem?: (problem: { title: string; description: string; impactScore: number; frequency: string }) => void;
}

export const AiCopilotHub: React.FC<AiCopilotHubProps> = ({
  currentProduct,
  user,
  onAddResearchDoc,
  onAddProblem
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'chat' | 'transcribe' | 'images' | 'video' | 'search' | 'maps' | 'music' | 'voice'
  >('chat');

  // --- 1. CHATBOT STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the **ProductPilot AI Copilot**! I'm synchronized with **${currentProduct?.name || 'your product workspace'}**.\n\nI can help you:\n- Critique strategic defensibility & pricing tiers\n- Slice vertical user stories with strict INVEST & Gherkin BDD criteria\n- Evaluate technical architecture constraints & non-functional requirements\n- Formulate JTBD interview findings into validated problems`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.5-flash',
      rolePreset: 'Lead Product Strategist'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatModel, setChatModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [chatRole, setChatRole] = useState<ChatRolePreset>('Lead Product Strategist');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: chatModel,
      rolePreset: chatRole
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: nextHistory.map(m => ({ role: m.role, content: m.content })),
          model: chatModel,
          rolePreset: chatRole,
          productName: currentProduct?.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            model: data.model,
            rolePreset: data.rolePreset
          }
        ]);
      }
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- 2. AUDIO TRANSCRIPTION STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcriptResult, setTranscriptResult] = useState<AudioTranscriptResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioFileBase64, setAudioFileBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState('audio/webm');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioFileBase64(base64);
          setAudioMimeType('audio/webm');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or unsupported', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioMimeType(file.type || 'audio/mp3');
    const reader = new FileReader();
    reader.onloadend = () => {
      setAudioFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunTranscribe = async () => {
    if (!audioFileBase64 || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioFileBase64,
          mimeType: audioMimeType,
          context: currentProduct?.name || 'Product Research'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTranscriptResult(data);
        if (user) {
          persistAiAssetToFirestore(user.uid, {
            id: data.id,
            productId: currentProduct?.id || 'prod_default',
            assetType: 'AUDIO_TRANSCRIPT',
            title: `Transcript: ${currentProduct?.name || 'Interview'}`,
            prompt: 'Microphone interview transcript',
            modelUsed: 'gemini-3.5-transcribe',
            mediaUrl: data.text.slice(0, 500)
          });
        }
      }
    } catch (err) {
      console.error('Transcription error', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- 3. IMAGE CREATION & EDITING STATE ---
  const [imagePrompt, setImagePrompt] = useState(
    'Sleek executive dashboard showing live credit risk score badge, transaction volume chart, and automated approval slider'
  );
  const [imageRatio, setImageRatio] = useState<'16:9' | '1:1' | '4:3' | '9:16'>('16:9');
  const [imageSize, setImageSize] = useState<'1K' | '512px'>('1K');
  const [refImageBase64, setRefImageBase64] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageResult, setImageResult] = useState<AiImageResult | null>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          aspectRatio: imageRatio,
          imageSize,
          referenceImageData: refImageBase64
        })
      });
      if (res.ok) {
        const data = await res.json();
        setImageResult(data);
        if (user) {
          persistAiAssetToFirestore(user.uid, {
            id: data.id,
            productId: currentProduct?.id || 'prod_default',
            assetType: 'IMAGE',
            title: imagePrompt.slice(0, 60),
            prompt: imagePrompt,
            modelUsed: 'gemini-3.1-flash-image-preview',
            mediaUrl: data.imageUrl
          });
        }
      }
    } catch (err) {
      console.error('Image generation error', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- 4. VIDEO ANIMATION (Veo) STATE ---
  const [videoPrompt, setVideoPrompt] = useState('Smooth cinematic pan highlighting user credit limit slider and dynamic transaction graph');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoInputImage, setVideoInputImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<AiVideoResult | null>(null);

  const handleGenerateVideo = async () => {
    const startImg = videoInputImage || imageResult?.imageUrl;
    if (!startImg || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    try {
      const res = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoRatio,
          imageData: startImg
        })
      });
      if (res.ok) {
        const data = await res.json();
        setVideoResult(data);
      }
    } catch (err) {
      console.error('Video generation error', err);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // --- 5. SEARCH GROUNDING STATE ---
  const [searchQuery, setSearchQuery] = useState(
    'B2B trade credit underwriting and accounts receivable automation software market 2026'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchGroundingResult | null>(null);

  const handleRunSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      }
    } catch (err) {
      console.error('Search grounding error', err);
    } finally {
      setIsSearching(false);
    }
  };

  // --- 6. MAPS GROUNDING STATE ---
  const [mapsQuery, setMapsQuery] = useState(
    'Commercial logistics hubs and cold storage distribution centers in Chicago IL'
  );
  const [userLocation, setUserLocation] = useState<{ lat?: number; lng?: number }>({});
  const [isMapsLoading, setIsMapsLoading] = useState(false);
  const [mapsResult, setMapsResult] = useState<MapsGroundingResult | null>(null);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn('Geolocation warning', err)
      );
    }
  };

  const handleRunMaps = async () => {
    if (!mapsQuery.trim() || isMapsLoading) return;
    setIsMapsLoading(true);
    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mapsQuery.trim(),
          latitude: userLocation.lat,
          longitude: userLocation.lng
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMapsResult(data);
      }
    } catch (err) {
      console.error('Maps grounding error', err);
    } finally {
      setIsMapsLoading(false);
    }
  };

  // --- 7. MUSIC GENERATION (Lyria) STATE ---
  const [musicPrompt, setMusicPrompt] = useState(
    'Energetic modern technology keynote launch track with uplifting synthesizer arpeggios, confident bassline, and crisp drums'
  );
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicResult, setMusicResult] = useState<MusicTrackResult | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim() || isGeneratingMusic) return;
    setIsGeneratingMusic(true);
    try {
      const res = await fetch('/api/ai/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          model: musicModel,
          durationSeconds: musicModel === 'lyria-3-pro-preview' ? 60 : 20
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMusicResult(data);
      }
    } catch (err) {
      console.error('Music generation error', err);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  // --- 8. LIVE VOICE CONVERSATION STATE ---
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveVoiceStatus, setLiveVoiceStatus] = useState('Standby');
  const [liveTranscripts, setLiveTranscripts] = useState<Array<{ sender: 'user' | 'model'; text: string }>>([
    { sender: 'model', text: 'Live Voice Copilot connected via gemini-3.8-live. Speak your strategy or prioritization question.' }
  ]);
  const liveWsRef = useRef<WebSocket | null>(null);

  const toggleLiveVoice = () => {
    if (isLiveConnected) {
      liveWsRef.current?.close();
      setIsLiveConnected(false);
      setLiveVoiceStatus('Disconnected');
    } else {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live`;
        const ws = new WebSocket(wsUrl);
        liveWsRef.current = ws;

        ws.onopen = () => {
          setIsLiveConnected(true);
          setLiveVoiceStatus('Listening (gemini-3.8-live)');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.text) {
              setLiveTranscripts(prev => [...prev, { sender: 'model', text: msg.text }]);
            }
          } catch {}
        };

        ws.onclose = () => {
          setIsLiveConnected(false);
          setLiveVoiceStatus('Closed');
        };
      } catch (err) {
        console.error('Live WS error', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  Multimodal AI & Strategy Copilot Suite
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Live Models Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Targeted Gemini, Veo & Lyria intelligence integrated with {currentProduct?.name || 'your workspace'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Gemini Chat</span>
            </button>

            <button
              onClick={() => setActiveSubTab('transcribe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'transcribe'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Transcribe Audio</span>
            </button>

            <button
              onClick={() => setActiveSubTab('images')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'images'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>UI Mockups & Edit</span>
            </button>

            <button
              onClick={() => setActiveSubTab('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'video'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Veo Video</span>
            </button>

            <button
              onClick={() => setActiveSubTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Grounding</span>
            </button>

            <button
              onClick={() => setActiveSubTab('maps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'maps'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Maps Grounding</span>
            </button>

            <button
              onClick={() => setActiveSubTab('music')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'music'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Lyria Music</span>
            </button>

            <button
              onClick={() => setActiveSubTab('voice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeSubTab === 'voice'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Voice (3.8)</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. CHATBOT TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'chat' && (
          <div className="pt-4 space-y-4">
            {/* Controls Bar: Model & Role selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">AI Model:</span>
                <select
                  value={chatModel}
                  onChange={(e: any) => setChatModel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 flex-1"
                >
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Tasks & Deep Reasoning)</option>
                  <option value="gemini-3.5-flash">gemini-3.5-flash (General Tasks & Strategy)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks & Slicing)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">PM Persona:</span>
                <select
                  value={chatRole}
                  onChange={(e: any) => setChatRole(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 flex-1"
                >
                  <option value="Lead Product Strategist">Lead Product Strategist (Moats & Differentiation)</option>
                  <option value="Agile Coach & Scrum Master">Agile Coach & Scrum Master (INVEST & BDD)</option>
                  <option value="Technical Architect">Technical Architect (NFRs & Schema Contracts)</option>
                  <option value="Customer Research Analyst">Customer Research Analyst (JTBD & Friction)</option>
                </select>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-500 self-center">Quick Prompts:</span>
              {[
                'Audit trade credit underwriting for edge-case fraud risks',
                'Write 3 vertical user stories using Gherkin Given/When/Then syntax',
                'Draft 4 non-functional requirements for sub-200ms latency',
                'Synthesize JTBD customer interview findings into prioritized problems'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setChatInput(chip)}
                  className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors text-left"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Scrollable Message Thread */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-[420px] overflow-y-auto space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {msg.role === 'user' ? 'You (Lead PM)' : msg.rolePreset}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      {msg.model} • {msg.timestamp}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center space-x-2 text-xs text-indigo-400 p-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{chatRole} is synthesizing response via {chatModel}...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask ${chatRole} anything about ${currentProduct?.name || 'your product'}...`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center space-x-2 transition-all shadow-lg"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. AUDIO TRANSCRIBER TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'transcribe' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Live Mic Recorder */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Record Live Customer Interview</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Record directly from your microphone. Transcribed verbatim using <span className="font-mono text-indigo-400">gemini-3.5-transcribe</span> with speaker and pain point detection.
                </p>

                <div className="flex items-center space-x-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all animate-pulse"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Stop Recording ({recordSeconds}s)</span>
                    </button>
                  )}
                  {audioFileBase64 && !isRecording && (
                    <span className="text-xs text-emerald-400 font-medium">✓ Audio captured ({recordSeconds}s)</span>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Or Upload Audio File</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Upload existing customer call or user feedback recording (.mp3, .wav, .webm, .m4a).
                </p>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-300 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Run Transcribe Action Button */}
            <div className="flex justify-end">
              <button
                onClick={handleRunTranscribe}
                disabled={!audioFileBase64 || isTranscribing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
              >
                {isTranscribing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transcribing with gemini-3.5-transcribe...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Audio Transcription & JTBD Extraction</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display */}
            {transcriptResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase font-semibold">
                      Model: gemini-3.5-transcribe
                    </span>
                    <span className="text-xs text-slate-400">Speakers: {transcriptResult.speakers?.join(', ')}</span>
                  </div>

                  {onAddResearchDoc && (
                    <button
                      onClick={() => {
                        onAddResearchDoc({
                          title: `Interview Transcript (${new Date().toLocaleDateString()})`,
                          content: transcriptResult.text,
                          type: 'User Interview'
                        });
                        alert('Added transcript directly into Product Research Documents!');
                      }}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-medium hover:bg-indigo-600/30 transition-all flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Save into Workspace Research Docs</span>
                    </button>
                  )}
                </div>

                {/* Key Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Identified User Pain Points</h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {transcriptResult.keyPainPoints.map((p, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-rose-400 mt-0.5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Actionable Feature Requests</h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {transcriptResult.featureRequests.map((f, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Verbatim Transcript */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verbatim Transcript</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {transcriptResult.text}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. IMAGE CREATION & EDITING TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'images' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 uppercase font-semibold">
                    Model: gemini-3.1-flash-image-preview
                  </span>
                  <span className="text-xs text-slate-400">Generate high-fidelity UI wireframes or edit mockups</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-slate-400">Ratio:</span>
                    <select
                      value={imageRatio}
                      onChange={(e: any) => setImageRatio(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2 py-1"
                    >
                      <option value="16:9">16:9 (Landscape UI)</option>
                      <option value="1:1">1:1 (Square Tile)</option>
                      <option value="4:3">4:3 (Desktop Window)</option>
                      <option value="9:16">9:16 (Mobile View)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-slate-400">Size:</span>
                    <select
                      value={imageSize}
                      onChange={(e: any) => setImageSize(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2 py-1"
                    >
                      <option value="1K">1K (High Quality)</option>
                      <option value="512px">512px (Fast)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Image / Wireframe Design Prompt:</label>
                <textarea
                  rows={2}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the UI mockup, user flow chart, or architectural component diagram..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Optional Reference Image for Editing */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-slate-400">Optional image to edit:</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onloadend = () => setRefImageBase64(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-300 cursor-pointer"
                />
                {refImageBase64 && (
                  <button
                    onClick={() => setRefImageBase64(null)}
                    className="text-rose-400 hover:text-rose-300 text-[11px]"
                  >
                    Clear Image
                  </button>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Mockup via gemini-3.1-flash-image-preview...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{refImageBase64 ? 'Edit Mockup Image' : 'Generate UI Mockup'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Image Result */}
            {imageResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Generated Mockup Canvas ({imageResult.aspectRatio})</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setVideoInputImage(imageResult.imageUrl);
                        setActiveSubTab('video');
                      }}
                      className="px-3 py-1 rounded-lg bg-pink-600/20 text-pink-300 border border-pink-500/40 text-xs font-medium hover:bg-pink-600/30 transition-all flex items-center space-x-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Animate into Video with Veo</span>
                    </button>

                    <a
                      href={imageResult.imageUrl}
                      download={`productpilot-mockup-${Date.now()}.png`}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-all flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center p-2">
                  <img
                    src={imageResult.imageUrl}
                    alt={imageResult.prompt}
                    referrerPolicy="no-referrer"
                    className="max-h-[500px] w-auto rounded-lg object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. VIDEO ANIMATION (Veo) TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'video' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-950 text-pink-300 border border-pink-800 uppercase font-semibold">
                    Model: veo-3.1-fast-generate-preview
                  </span>
                  <span className="text-xs text-slate-400">Animate static photos & mockups into engaging product demo clips</span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Aspect Ratio:</span>
                  <select
                    value={videoRatio}
                    onChange={(e: any) => setVideoRatio(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2.5 py-1"
                  >
                    <option value="16:9">16:9 (Landscape Keynote / Desktop)</option>
                    <option value="9:16">9:16 (Portrait Mobile Showcase)</option>
                  </select>
                </div>
              </div>

              {/* Input Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Starting Photo or Mockup:</label>
                <div className="flex items-center space-x-4">
                  {(videoInputImage || imageResult?.imageUrl) ? (
                    <div className="relative group w-32 h-20 rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={videoInputImage || imageResult?.imageUrl}
                        alt="Start frame"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setVideoInputImage(null)}
                        className="absolute inset-0 bg-black/60 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                      No Image
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onloadend = () => setVideoInputImage(r.result as string);
                        r.readAsDataURL(f);
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-pink-300 cursor-pointer"
                  />
                </div>
              </div>

              {/* Animation Prompt */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Veo Animation Motion Prompt:</label>
                <input
                  type="text"
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Describe camera movement, UI button interactions, or chart animations..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || (!videoInputImage && !imageResult?.imageUrl)}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rendering temporal motion via veo-3.1-fast-generate-preview...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Animate Photo into Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Player Output */}
            {videoResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Veo Generated Video ({videoResult.aspectRatio}) • {videoResult.status}
                  </span>
                  {videoResult.videoUrl && (
                    <a
                      href={videoResult.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-all flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Video</span>
                    </a>
                  )}
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video max-w-2xl mx-auto flex items-center justify-center">
                  {videoResult.videoUrl ? (
                    <video
                      controls
                      autoPlay
                      loop
                      src={videoResult.videoUrl}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="p-8 text-center space-x-2 text-xs text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-pink-400" />
                      <p>{videoResult.progressText || 'Compiling video...'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. SEARCH GROUNDING TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'search' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 uppercase font-semibold">
                  Model: gemini-3.5-flash + googleSearch Tool
                </span>
                <span className="text-xs text-slate-400">Live web grounding for real-time market data & competitor intelligence</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter industry domain, competitor name, or market trends to research..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleRunSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search & Ground</span>
                </button>
              </div>
            </div>

            {searchResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
                {/* Citations & Web Sources */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Grounding Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-blue-400 hover:border-blue-700 text-xs flex items-center space-x-1.5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                        <span className="truncate max-w-[200px]">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Key Findings */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Validated Market Takeaways</h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {searchResult.keyFindings.map((f, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-blue-400 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Full Report */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {searchResult.summaryMarkdown}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. MAPS GROUNDING TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'maps' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-semibold">
                    Model: gemini-3.5-flash + googleMaps Tool
                  </span>
                  <span className="text-xs text-slate-400">Location logistics, competitor branch density & territory expansion</span>
                </div>

                <button
                  onClick={detectLocation}
                  className="px-2.5 py-1 rounded bg-slate-900 text-[11px] text-slate-300 border border-slate-800 hover:text-emerald-400 flex items-center space-x-1"
                >
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>{userLocation.lat ? 'Location Attached' : 'Use Current Lat/Lng'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={mapsQuery}
                  onChange={(e) => setMapsQuery(e.target.value)}
                  placeholder="Enter logistics hub, distribution area, or regional competitors..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleRunMaps}
                  disabled={isMapsLoading || !mapsQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                >
                  {isMapsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  <span>Analyze Territory</span>
                </button>
              </div>
            </div>

            {mapsResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Google Maps Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mapsResult.places.map((place, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 hover:border-emerald-800/60 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{place.title}</span>
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Open in Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {place.snippet && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{place.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {mapsResult.summaryMarkdown}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. MUSIC GENERATION (Lyria) TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'music' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 uppercase font-semibold">
                    Lyria Music Engine
                  </span>
                  <span className="text-xs text-slate-400">Generate high-fidelity product launch soundtracks & keynote themes</span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Duration Model:</span>
                  <select
                    value={musicModel}
                    onChange={(e: any) => setMusicModel(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded px-2.5 py-1"
                  >
                    <option value="lyria-3-clip-preview">lyria-3-clip-preview (Short Clip up to 30s)</option>
                    <option value="lyria-3-pro-preview">lyria-3-pro-preview (Full-Length Track)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Soundtrack Style & Mood Prompt:</label>
                <textarea
                  rows={2}
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe the tempo, instruments, and emotional arc of the keynote soundtrack..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateMusic}
                  disabled={isGeneratingMusic || !musicPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all"
                >
                  {isGeneratingMusic ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing audio stream via {musicModel}...</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4" />
                      <span>Generate Keynote Soundtrack</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {musicResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200">Playable Soundtrack ({musicResult.model})</span>
                    <p className="text-[11px] text-slate-400">{musicResult.prompt}</p>
                  </div>

                  <a
                    href={`data:${musicResult.mimeType};base64,${musicResult.audioBase64}`}
                    download="productpilot-keynote-theme.wav"
                    className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-all flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .WAV</span>
                  </a>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
                  <audio
                    ref={audioPlayerRef}
                    controls
                    src={`data:${musicResult.mimeType};base64,${musicResult.audioBase64}`}
                    className="w-full"
                  />
                </div>

                {musicResult.lyrics && (
                  <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono">
                    {musicResult.lyrics}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. LIVE VOICE CONVERSATION TAB */}
        {/* ========================================================= */}
        {activeSubTab === 'voice' && (
          <div className="pt-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 uppercase font-semibold">
                  Model: gemini-3.8-live (Live API)
                </span>
                <span className="text-xs text-slate-400">Low-latency real-time voice sparring partner</span>
              </div>

              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                <button
                  onClick={toggleLiveVoice}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                    isLiveConnected
                      ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-4 ring-slate-700/30'
                  }`}
                >
                  <Radio className="w-8 h-8" />
                </button>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-200">
                    {isLiveConnected ? 'Live Audio Channel Active' : 'Voice Assistant Standby'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Status: <span className="text-rose-400 font-mono">{liveVoiceStatus}</span>
                  </p>
                </div>
              </div>

              {/* Turn Transcripts */}
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-4 text-left space-y-3 max-h-60 overflow-y-auto">
                {liveTranscripts.map((t, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <span className="font-semibold text-slate-400 uppercase text-[10px]">
                      {t.sender === 'user' ? 'You' : 'Live PM Copilot (Zephyr Voice)'}:
                    </span>
                    <p className="text-slate-200">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
