'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Film, Upload, Sparkles, Loader2, Download, ArrowLeft,
  CheckCircle2, Cpu, LayoutDashboard, History, Settings,
  ImageIcon, Play, Zap, ArrowRight, X, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, generationAPI, modelsAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  supported_tasks: string[];
  cost_per_unit: number;
  quality_score: number;
  minimum_tier: string;
  description?: string;
}

const styles = [
  { id: 'cinematic', name: 'CINEMATIC_V4', desc: 'HIGH_FIDELITY_LIGHTING', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400' },
  { id: 'minimal', name: 'MINIMAL_CORE', desc: 'STUDIO_WHITE_DEPTH', img: 'https://images.unsplash.com/photo-1614850523296-e8c041df43a0?auto=format&fit=crop&q=80&w=400' },
  { id: '3d', name: '3D_ORCHESTRA', desc: 'HYPER_REAL_UNREAL_5', img: 'https://images.unsplash.com/photo-1633513090184-59bb7bc0e19a?auto=format&fit=crop&q=80&w=400' },
  { id: 'cyberpunk', name: 'NEO_GLITCH', desc: 'DARK_ATMOSPHERE_NEON', img: 'https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=400' },
  { id: 'luxury', name: 'LUXURY_VAULT', desc: 'GOLD_SILK_TEXTURES', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400' },
  { id: 'abstract', name: 'PLASMA_GEN', desc: 'FLUID_MOTION_NODES', img: 'https://images.unsplash.com/photo-1620641788421-7a1c342f4ec2?auto=format&fit=crop&q=80&w=400' },
];

type Step = 'intro' | 'upload' | 'prompt' | 'generating' | 'complete';

interface SceneStatus {
  scene_id: string;
  status: string;
  progress: number;
  output_video_url: string | null;
  enhanced_prompt: string | null;
  error_message: string | null;
}

export default function StudioEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingProjectId = searchParams.get('project');
  const [taskType, setTaskType] = useState<string>(
    searchParams.get('task_type') || 'image_to_video'
  );
  const initialPrompt = searchParams.get('prompt') || '';
  const isTextOnly = taskType === 'text_to_video' || taskType === 'text_to_image';

  const [step, setStep] = useState<Step>(
    existingProjectId ? 'generating' : 'prompt'
  );
  const [loading, setLoading] = useState(false);

  // Style selector state
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('UNNAMED_AD');

  // Project state
  const [projectId, setProjectId] = useState<string | null>(existingProjectId);

  // Prompt state
  const [prompt, setPrompt] = useState(initialPrompt);
  const [tier, setTier] = useState('basic');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Models from registry
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Generation state
  const [sceneStatus, setSceneStatus] = useState<SceneStatus | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (existingProjectId) {
      loadExistingProject(existingProjectId);
    }
    loadModels();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadExistingProject = async (id: string) => {
    try {
      const res = await projectsAPI.get(id);
      const project = res.data;
      setTitle(project.title);
      setProjectId(project.id);

      if (project.task_type) {
        setTaskType(project.task_type);
      }

      if (project.output_video_url) {
        setSceneStatus({
          scene_id: project.scenes?.[0]?.id || '',
          status: 'completed',
          progress: 100,
          output_video_url: project.output_video_url,
          enhanced_prompt: project.scenes?.[0]?.enhanced_prompt || null,
          error_message: null,
        });
        setStep('complete');
      } else if (project.status === 'processing' && project.scenes?.length > 0) {
        const latestScene = project.scenes[project.scenes.length - 1];
        setSceneStatus({
          scene_id: latestScene.id,
          status: latestScene.status,
          progress: 50,
          output_video_url: null,
          enhanced_prompt: latestScene.enhanced_prompt,
          error_message: latestScene.error_message,
        });
        setStep('generating');
        startPolling(latestScene.id);
      }
    } catch {
      toast.error('PROJECT_LOAD_ERROR');
    }
  };

  const loadModels = async () => {
    try {
      const res = await modelsAPI.list();
      setAvailableModels(res.data);
    } catch {
      console.error('Failed to load models');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleFile = (selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('INVALID_MEDIA_TYPE');
      return;
    }
    setFile(selectedFile);
    setFilePreview(URL.createObjectURL(selectedFile));
  };

  const handleUploadOrGenerate = async () => {
    if (!isTextOnly && !file && !projectId) {
      toast.error('MEDIA_ASSET_REQUIRED');
      return;
    }

    if (!projectId) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('title', title || 'SEQUENCE_G0');
        formData.append('task_type', taskType);
        if (file) {
          formData.append('media', file);
        }

        const res = await projectsAPI.create(formData);
        setProjectId(res.data.id);
        startGeneration(res.data.id);
      } catch (err: any) {
        toast.error('INITIALIZATION_FAILED');
        setLoading(false);
      }
    } else {
      if (prompt.trim()) {
        startGeneration(projectId);
      } else {
        toast.error('PROMPT_STRING_EMPTY');
      }
    }
  };

  const startGeneration = async (projId: string) => {
    setLoading(true);
    try {
      const res = await generationAPI.trigger({
        project_id: projId,
        prompt: `${selectedStyle.name}: ${prompt}`,
        tier,
        enhance_prompt: true,
        task_type: taskType,
        requested_provider: selectedModelId ? availableModels.find(m => m.id === selectedModelId)?.provider : undefined,
      });

      setSceneStatus({
        scene_id: res.data.scene_id,
        status: 'pending',
        progress: 0,
        output_video_url: null,
        enhanced_prompt: null,
        error_message: null,
      });

      setStep('generating');
      startPolling(res.data.scene_id);
    } catch (err: any) {
      toast.error('ORCHESTRATION_FAILURE');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (sceneId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await generationAPI.status(sceneId);
        const data = res.data;

        setSceneStatus({
          scene_id: data.scene_id,
          status: data.status,
          progress: data.progress,
          output_video_url: data.output_video_url,
          enhanced_prompt: data.enhanced_prompt,
          error_message: data.error_message,
        });

        if (data.status === 'completed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStep('complete');
          toast.success('ARTIFACT_VALIDATED');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          toast.error(data.error_message || 'RENDER_FAILURE');
        }
      } catch {
        // Silent retry
      }
    }, 3000);
  };

  const statusLabels: Record<string, string> = {
    pending: 'SYNCHRONIZING...',
    enhancing: 'ENHANCING CREATIVE DIRECTION...',
    generating: 'COLLATING NEURAL ASSETS...',
    processing: 'FINALIZING RENDER...',
    completed: 'ARTIFACT READY',
    failed: 'ENGINE_FAILURE',
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-500/30 overflow-hidden bg-black text-white">
      <div className="ambient-glow" />
      <div className="ambient-glow-bottom opacity-50" />

      {/* ── Style Selector Modal ── */}
      <AnimatePresence>
        {isStyleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStyleModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-5xl bg-surface-950 border border-white/05 rounded-[4rem] overflow-hidden shadow-2xl"
            >
              <div className="p-12 border-b border-white/05 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-display font-black tracking-tighter uppercase italic">STYLE_REGISTRY</h2>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] italic mt-2">CALIBRATE VISUAL OUTPUT PROTOCOLS</p>
                </div>
                <button onClick={() => setIsStyleModalOpen(false)} className="w-16 h-16 rounded-2xl bg-white/03 hover:bg-white/05 flex items-center justify-center transition-all">
                  <X className="w-6 h-6 text-white/20" />
                </button>
              </div>
              <div className="p-12 grid grid-cols-2 md:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto">
                {styles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStyle(s);
                      setIsStyleModalOpen(false);
                    }}
                    className={`group relative aspect-[16/10] rounded-[2.5rem] overflow-hidden border-2 transition-all duration-500 ${selectedStyle.id === s.id ? 'border-brand-500 ring-8 ring-brand-500/05' : 'border-white/05 hover:border-white/20'}`}
                  >
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-10 left-10 text-left">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] italic text-white">{s.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-brand-400 italic opacity-60 mt-1">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="h-24 border-b border-white/[0.03] bg-surface-950/40 backdrop-blur-xl flex items-center justify-between px-10 z-50">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform duration-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter uppercase italic">ADGEN<span className="text-brand-500">.</span>STUDIO</span>
          </Link>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-900 border border-white/5 shadow-2xl">
            <LayoutDashboard className="w-4 h-4 text-white/20" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-black tracking-[0.2em] uppercase text-white/40 w-48 focus:text-white transition-all italic"
            />
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/05 border border-blue-500/10">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.3em] italic">NODES_STABLE</span>
          </div>
          <Link href="/settings" className="w-12 h-12 rounded-2xl border border-white/[0.05] flex items-center justify-center hover:bg-white/5 transition-all text-white/20 hover:text-white">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* ── Main Canvas ── */}
      <main className="flex-1 flex overflow-hidden relative z-10">

        {/* Sidebar Controls */}
        <aside className="hidden lg:flex w-96 border-r border-white/05 bg-black/40 backdrop-blur-3xl p-10 flex-col gap-12 overflow-y-auto">
          <div>
            <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] block mb-10 italic">PIPELINE CONFIGURATION</span>
            <div className="grid gap-4">
              {[
                { id: 'text_to_video', label: 'Text to Video' },
                { id: 'image_to_video', label: 'Image to Video' },
                { id: 'text_to_image', label: 'Text to Image' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setTaskType(type.id)}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-500 group ${taskType === type.id ? 'border-brand-500 bg-brand-500/05' : 'border-white/03 bg-white/[0.01] hover:border-white/10'}`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] italic mb-2 ${taskType === type.id ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>{type.label}</p>
                  <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest italic leading-none">V4.2 NEURAL ENGINE</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] block mb-10 italic">AESTHETIC PROTOCOLS</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsStyleModalOpen(true)}
                className="col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-brand-500/20 flex flex-col items-center justify-center gap-3 group hover:bg-white/05 transition-all duration-500"
              >
                <Palette className="w-6 h-6 text-brand-500 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">{selectedStyle.name}</span>
                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em] italic">Click to recalibrate</span>
              </button>
              {['CINEMATIC', 'MINIMAL', 'CYBERNEO', 'LUXURY_V4', 'VIBRANT', '3D_ORCH'].map(style => (
                <button
                  key={style}
                  className={`p-4 rounded-xl border border-white/03 bg-white/[0.01] text-[9px] font-black text-white/20 hover:border-brand-500/20 hover:text-white transition-all uppercase tracking-[0.2em] italic ${selectedStyle.name === style + '_V4' ? 'border-brand-500 text-white' : ''}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-12 border-t border-white/05">
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-500/05 to-blue-500/05 border border-white/05 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/05 blur-3xl" />
              <p className="text-[10px] font-black mb-3 uppercase tracking-[0.2em] italic text-brand-400">PRO_TIER_ACTIVE</p>
              <p className="text-xl font-display font-black tracking-tighter italic mb-6">420/500 <span className="text-white/10">CRD</span></p>
              <Link href="/pricing" className="w-full py-3.5 rounded-xl bg-white/[0.03] border border-white/05 hover:bg-white/05 text-[9px] font-black uppercase tracking-[0.3em] transition-all italic flex items-center justify-center">ENHANCE_CAPACITY</Link>
            </div>
          </div>
        </aside>

        {/* Central Stage */}
        <section className="flex-1 flex flex-col relative bg-black/20 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* Input Phase */}
            {(step === 'prompt' || step === 'upload') && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col items-center justify-center p-12 lg:p-24 max-w-6xl mx-auto w-full"
              >
                <div className="w-full space-y-16">

                  {/* Main Prompt Bar */}
                  <div className="relative group">
                    <div className="absolute -inset-10 bg-brand-500/10 blur-[100px] opacity-20 group-focus-within:opacity-40 transition-opacity" />
                    <div className="relative p-3 bg-surface-950/40 border border-white/03 rounded-[3.5rem] shadow-2xl overflow-hidden focus-within:border-brand-500/30 transition-all duration-700 backdrop-blur-3xl">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="ENTER CREATIVE DIRECTION..."
                        className="w-full bg-transparent border-none outline-none text-3xl md:text-5xl p-12 md:p-20 font-display font-black text-white placeholder:text-white/[0.02] resize-none min-h-[400px] uppercase italic tracking-tighter"
                      />
                      <div className="flex items-center justify-between p-8 border-t border-white/03 bg-white/[0.01]">
                        <div className="flex items-center gap-12 px-10">
                          <button onClick={() => setIsStyleModalOpen(true)} className="flex items-center gap-3 text-white/10 hover:text-brand-400 transition-all">
                            <Palette className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Styles</span>
                          </button>
                          <button className="flex items-center gap-3 text-white/10 hover:text-blue-400 transition-all">
                            <Cpu className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Engines</span>
                          </button>
                        </div>
                        <button
                          onClick={handleUploadOrGenerate}
                          disabled={loading || (!isTextOnly && !file)}
                          className="btn-glow h-24 px-16 rounded-[2rem] group"
                        >
                          <span className="text-lg font-black tracking-tighter uppercase italic">INITIALIZE RENDER</span>
                          <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform ml-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Actions Grid */}
                  <div className="grid lg:grid-cols-2 gap-12">

                    {/* Media Upload Box */}
                    {!isTextOnly && (
                      <div
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById('file-input')?.click()}
                        className={`relative aspect-[16/10] rounded-[3.5rem] border-2 border-dashed transition-all duration-1000 cursor-pointer overflow-hidden ${filePreview ? 'border-brand-500 bg-brand-500/05 shadow-2xl' : 'border-white/05 hover:border-white/10 hover:bg-white/[0.01]'}`}
                      >
                        <input id="file-input" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                        {filePreview ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {file?.type.startsWith('video/') ? (
                              <video src={filePreview} className="w-full h-full object-cover" autoPlay muted loop />
                            ) : (
                              <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute top-10 right-10 px-5 py-2.5 rounded-xl bg-brand-500 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl italic">ACTIVE_ASSET</div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] flex items-center justify-center text-white/05 mb-10 border border-white/05">
                              <Upload className="w-10 h-10" />
                            </div>
                            <h3 className="text-3xl font-display font-black uppercase tracking-tighter italic mb-3">SOURCE_FILE</h3>
                            <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em] max-w-[250px] italic">Inject reference artifact</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Variation Presets */}
                    <div className="rounded-[3.5rem] bg-white/[0.01] border border-white/5 p-12 flex flex-col">
                      <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] block mb-12 italic">RENDER PRESETS</span>
                      <div className="grid grid-cols-2 gap-6 flex-1">
                        {[
                          { name: 'Vertical_X', detail: '9:16 CINEMATIC' },
                          { name: 'Landscape_O', detail: '16:9 NEURAL' },
                          { name: 'Square_S', detail: '1:1 OPTIMIZED' },
                          { name: 'Ultra_W', detail: '21:9 WIDESCREEN' }
                        ].map(t => (
                          <button key={t.name} className="p-8 rounded-[2rem] border border-white/03 bg-white/[0.02] hover:border-brand-500/30 hover:bg-white/[0.05] transition-all duration-500 text-left group">
                            <p className="text-[10px] font-black mb-2 group-hover:text-brand-400 transition-colors uppercase tracking-[0.2em] italic">{t.name}</p>
                            <p className="text-[9px] text-white/10 uppercase font-black tracking-[0.3em] italic">{t.detail}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Processing Phase */}
            {step === 'generating' && sceneStatus && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-1 flex flex-col items-center justify-center p-20"
              >
                <div className="w-full max-w-3xl text-center space-y-24">
                  <div className="relative inline-block">
                    <div className="absolute -inset-24 bg-brand-500/10 blur-[150px] rounded-full animate-pulse" />
                    <div className="relative w-80 h-80 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="160" cy="160" r="150" className="stroke-white/[0.01] fill-none stroke-[4]" />
                        <motion.circle
                          cx="160" cy="160" r="150"
                          className="stroke-brand-500 fill-none stroke-[4]"
                          strokeLinecap="round"
                          strokeDasharray="942"
                          strokeDashoffset={942 - (942 * sceneStatus.progress) / 100}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-9xl font-display font-black tracking-tighter italic leading-none">{sceneStatus.progress}<span className="text-2xl text-white/10">%</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <h2 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-none">{statusLabels[sceneStatus.status]}</h2>
                    <div className="flex flex-col items-center gap-6">
                      <p className="text-brand-500 font-mono text-[10px] font-black uppercase tracking-[0.6em] italic animate-pulse">NEURAL_CLUSTER_SYNCING</p>
                      {sceneStatus.enhanced_prompt && (
                        <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/05 max-w-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-brand-500/20" />
                          <p className="text-white/20 text-[10px] font-mono leading-loose uppercase tracking-[0.2em] italic text-left">
                            {">"} {sceneStatus.enhanced_prompt}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Complete Phase */}
            {step === 'complete' && sceneStatus?.output_video_url && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col p-10 lg:p-20"
              >
                <div className="flex-1 relative rounded-[4rem] overflow-hidden bg-black shadow-2xl border border-white/03 group">
                  {taskType === 'text_to_image' ? (
                    <img src={sceneStatus.output_video_url} className="w-full h-full object-contain" />
                  ) : (
                    <video src={sceneStatus.output_video_url} className="w-full h-full object-contain" controls autoPlay loop />
                  )}

                  <div className="absolute top-12 left-12 flex flex-col gap-4">
                    <div className="px-5 py-2.5 rounded-xl bg-brand-500/80 backdrop-blur-3xl text-[9px] font-black uppercase tracking-[0.4em] text-white shadow-2xl italic">ARTIFACT_VALIDATED</div>
                    <div className="px-5 py-2.5 rounded-xl bg-surface-950/40 backdrop-blur-3xl border border-white/05 text-[9px] font-black uppercase tracking-[0.4em] text-white/40 shadow-2xl italic">NEURAL_RENDER_V4</div>
                  </div>

                  <div className="absolute bottom-12 right-12 flex items-center gap-8">
                    <button className="w-20 h-20 rounded-[1.5rem] bg-white/05 backdrop-blur-3xl border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white shadow-2xl group-hover:scale-110">
                      <History className="w-8 h-8" />
                    </button>
                    <a href={sceneStatus.output_video_url} download className="h-24 px-20 rounded-[2rem] bg-white text-black font-black text-sm uppercase tracking-[0.4em] flex items-center gap-6 hover:bg-white/90 transition-all shadow-2xl group-hover:scale-105 active:scale-95 italic">
                      <Download className="w-7 h-7" /> EXPORT_ASSET
                    </a>
                  </div>
                </div>

                {/* Variations Slider Grid */}
                <div className="h-72 mt-16 flex items-center gap-16">
                  <span className="text-[9px] font-black text-white/05 uppercase tracking-[0.8em] [writing-mode:vertical-lr] rotate-180 italic">RECURSIONS</span>
                  <div className="flex-1 grid grid-cols-4 lg:grid-cols-6 gap-10 h-full">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="rounded-[2.5rem] bg-white/[0.02] border border-white/03 overflow-hidden group relative cursor-pointer hover:border-brand-500/40 transition-all duration-700 aspect-square lg:aspect-auto">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                          <Play className="w-12 h-12 text-brand-500 fill-current" />
                        </div>
                        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-[9px] font-black text-white/10 tracking-[0.3em] uppercase italic transition-colors group-hover:text-white/40">
                          <span>NODE_0{i}</span>
                          <span className="text-brand-500/20 group-hover:text-brand-500">RESTORE</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setStep('prompt')}
                      className="rounded-[2.5rem] border-2 border-dashed border-white/03 hover:border-brand-500/20 hover:bg-brand-500/05 transition-all flex flex-col items-center justify-center group gap-6"
                    >
                      <Sparkles className="w-10 h-10 text-white/05 group-hover:text-brand-500 transition-all" />
                      <span className="text-[9px] font-black text-white/05 group-hover:text-white uppercase tracking-[0.4em] italic">REITERATE</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>
    </div>
  );
}
