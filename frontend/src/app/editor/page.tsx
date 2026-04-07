'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Film, Upload, Sparkles, Loader2, Download, ArrowLeft,
  CheckCircle2, Cpu, LayoutDashboard, History, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, generationAPI, modelsAPI } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';

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

  // Default to intro unless we have an initial payload to jump straight into generating/prompting
  const [step, setStep] = useState<Step>(
    existingProjectId ? 'generating' : (initialPrompt ? 'prompt' : 'intro')
  );
  const [loading, setLoading] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled Project');

  // Project state
  const [projectId, setProjectId] = useState<string | null>(existingProjectId);

  // Prompt state
  const [prompt, setPrompt] = useState(initialPrompt);
  const [tier, setTier] = useState('basic');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);

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
      
      // Sync taskType from stored project metadata
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
      } else {
        // For fresh projects without scenes yet
        const task = project.task_type || taskType;
        if (task === 'text_to_video' || task === 'text_to_image') {
          setStep('prompt');
        } else {
          setStep('upload');
        }
      }
    } catch {
      toast.error('Failed to load project');
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

  const filteredModels = availableModels.filter(m => 
    m.supported_tasks.includes(taskType)
  );

  // ── File Upload ──
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleFile = (selectedFile: File) => {
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Please upload an image or video file');
      return;
    }
    setFile(selectedFile);
    setFilePreview(URL.createObjectURL(selectedFile));
  };

  const handleUploadOrGenerate = async () => {
    if (!isTextOnly && !file && !projectId) {
      toast.error('Please upload an image or video file');
      return;
    }

    if (!projectId) {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('title', title || 'Generation');
        formData.append('task_type', taskType); // Persist task type at creation
        if (file) {
          formData.append('media', file);
        }

        const res = await projectsAPI.create(formData);
        setProjectId(res.data.id);
        
        // If we just uploaded media, we can now move to prompt, or generate if prompt is ready
        if (prompt.trim()) {
          startGeneration(res.data.id);
        } else {
          setStep('prompt');
          setLoading(false);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Setup failed');
        setLoading(false);
      }
    } else {
      if (prompt.trim()) {
        startGeneration(projectId);
      } else {
        toast.error('Please enter a prompt');
      }
    }
  };

  const startGeneration = async (projId: string) => {
    setLoading(true);
    try {
      const res = await generationAPI.trigger({
        project_id: projId,
        prompt,
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
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Status Polling ──
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
          toast.success('Generation complete!');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          toast.error(data.error_message || 'Generation failed');
        }
      } catch {
        // Silent retry
      }
    }, 3000);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Initializing cluster...',
    enhancing: 'Enhancing prompt via LLM...',
    generating: 'Generating visual assets...',
    processing: 'Post-processing rendering...',
    completed: 'Complete!',
    failed: 'Generation Error',
  };

  const taskConfigs: Record<string, any> = {
    text_to_video: {
      title: 'Text to Video',
      desc: 'Describe your vision, and AI will generate a stunning cinematic video instantly.',
      action: 'Start Text-to-Video Engine',
      whatYouCanDo: [
        'Produce high-quality b-roll sequences', 
        'Animate complex descriptions visually',
        'Generate AI-driven music videos',
        'Create cinematic trailers from text',
        'Visualize storyboarding concepts quickly',
        'Render fantasy and sci-fi environments',
        'Generate short social media video ads',
        'Create educational animation explainers',
        'Visualize product demo scenarios'
      ],
      icon: <Film className="w-8 h-8 text-brand-500 mb-6" />
    },
    image_to_video: {
      title: 'Image to Video',
      desc: 'Bring static photos to life with dynamic motion, pans, and cinematic AI movement.',
      action: 'Animate Existing Image',
      whatYouCanDo: [
        'Add fluid motion to product photography', 
        'Turn design concepts into moving scenes',
        'Animate static logo marks dynamically',
        'Add realistic physics to 3D renders',
        'Create parallax 3D zoom effects from 2D',
        'Generate looping cinemagraphs',
        'Transition between architectural frames',
        'Bring static character designs to life',
        'Enhance visual storyboards with pan effects'
      ],
      icon: <Upload className="w-8 h-8 text-brand-500 mb-6" />
    },
    text_to_image: {
      title: 'Text to Image',
      desc: 'Generate gorgeous, photorealistic ad concepts and product assets from scratch.',
      action: 'Start Text-to-Image Engine',
      whatYouCanDo: [
        'Create conceptual product hero shots', 
        'Mock up endless lighting variations',
        'Generate website landing page backgrounds',
        'Design custom brand illustrations',
        'Visualize architecture concepts',
        'Render hyperrealistic portraits',
        'Create stylized flat vector art',
        'Ideate fashion and apparel designs',
        'Draft highly-detailed character concepts'
      ],
      icon: <Sparkles className="w-8 h-8 text-brand-500 mb-6" />
    },
    image_to_image: {
      title: 'Image to Image',
      desc: 'Transform your existing assets with powerful AI stylization and visual enhancements.',
      action: 'Restyle Visual Asset',
      whatYouCanDo: [
        'Change art styles (e.g. Sketch to 3D)', 
        'Relight and upscale existing photography',
        'Replace backgrounds behind subjects',
        'Enhance low-resolution concepts to 4K',
        'Convert daylight photos into night scenes',
        'Apply artistic painterly filters seamlessly',
        'Inpaint and modify specific objects',
        'Expand subjects into new aspect ratios',
        'Harmonize color grading across assets'
      ],
      icon: <Sparkles className="w-8 h-8 text-brand-500 mb-6" />
    }
  };
  const activeConfig = taskConfigs[taskType] || taskConfigs['image_to_video'];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <div className="ambient-glow" />

      {/* ── Studio Header ── */}
      <header className="h-16 border-b border-white/5 bg-surface-950/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-brand-500" />
            </div>
            <span className="font-display font-medium">Studio</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <Link href="/dashboard" className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">Pricing</Link>
          <Link href="/contact" className="text-white/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">Contact</Link>
        </div>
      </header>

      {/* ── Main Studio Workarea ── */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-12 px-6 overflow-y-auto z-10 w-full relative">
        <div className={`w-full ${step === 'intro' ? 'max-w-5xl' : 'max-w-3xl'} transition-all duration-500`}>
          
          <AnimatePresence mode="wait">
            {/* ── STEP 0: Intro Hero Section ── */}
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-16 w-full pb-20"
              >
                {/* Hero Header */}
                <div className="text-center w-full max-w-3xl mx-auto space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-900 border border-white/5 font-mono text-xs text-white/50 tracking-wider uppercase">
                    Model Workflow
                  </div>
                  <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tighter">
                    {activeConfig.title}
                  </h1>
                  <p className="text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
                    {activeConfig.desc}
                  </p>
                </div>

                {/* Primary Action Card */}
                <div className="glass-card hover:border-brand-500/30 transition-colors p-8 md:p-12 relative flex flex-col items-center justify-center text-center max-w-2xl mx-auto group">
                  <div className="absolute inset-0 bg-brand-500/5 blur-[100px] rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                  {activeConfig.icon}
                  <h2 className="text-2xl font-display font-medium mb-2">Ready to create?</h2>
                  <p className="text-white/40 text-sm mb-10 font-mono tracking-wide">
                    // Start configuring your generation parameters.
                  </p>
                  
                  <button 
                    onClick={() => setStep(isTextOnly ? 'prompt' : 'upload')}
                    className="btn-glow px-10 py-5 flex items-center justify-center gap-3 w-full max-w-xs text-surface-950 font-bold rounded-xl"
                  >
                    {activeConfig.action} <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                {/* What You Can Do Section */}
                <div className="pt-10 border-t border-white/5 w-full">
                  <div className="mb-10 text-center">
                    <h3 className="text-xl font-display font-medium mb-2">Capabilities</h3>
                    <p className="text-white/30 text-sm">Example output structures for this workflow</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeConfig.whatYouCanDo.map((capability: string, idx: number) => (
                      <div key={idx} className="bg-surface-900/40 border border-white/5 rounded-2xl p-6 flex flex-col group hover:border-brand-500/30 hover:bg-surface-800/60 transition-colors">
                        <h4 className="text-sm font-medium mb-6 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                          {capability}
                        </h4>
                        
                        {/* Placeholder Media Box mimicking neon look */}
                        <div className="w-full aspect-video rounded-xl bg-surface-950 border border-white/5 relative overflow-hidden flex items-center justify-center group-hover:border-brand-500/20 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-tr from-surface-900 to-brand-500/5 opacity-50" />
                            <div className="flex flex-col items-center gap-3 z-10 text-white/20">
                                <Sparkles className="w-8 h-8 opacity-50" />
                                <span className="font-mono text-xs uppercase tracking-widest text-brand-500/50">Example Render</span>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1 & 2: Upload and Prompt ── */}
            {(step === 'upload' || step === 'prompt') && (
              <motion.div
                key="creation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-5xl font-display font-medium tracking-tight mb-4">
                    {isTextOnly ? 'What are we creating?' : 'Upload & Describe'}
                  </h1>
                </div>

                <div className="glass-card p-6 md:p-8 relative">
                  
                  {/* File Dropzone (if needed) */}
                  {!isTextOnly && step === 'upload' && !projectId && (
                    <div className="mb-6">
                      <div
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${filePreview ? 'border-brand-500/30 bg-surface-900/50' : 'border-white/10 hover:border-brand-500/30 bg-surface-900/20'}`}
                        onClick={() => document.getElementById('file-input')?.click()}
                      >
                        <input
                          id="file-input"
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />

                        {filePreview ? (
                          <div className="space-y-4">
                            {file?.type.startsWith('video/') ? (
                              <video src={filePreview} className="max-h-64 mx-auto rounded-lg shadow-lg border border-white/5" controls muted />
                            ) : (
                              <img src={filePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-lg border border-white/5 object-contain" />
                            )}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800 text-xs text-brand-500 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Media attached
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-surface-800 mx-auto mb-4 flex items-center justify-center text-white/40">
                              <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-white/60 font-medium mb-1">Click or drag media here</p>
                            <p className="text-white/30 text-xs font-mono tracking-wide uppercase">Requires PNG, JPG, or MP4</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prompt Textarea */}
                  <div className="relative group focus-within:ring-4 ring-brand-500/10 rounded-xl transition-shadow">
                    <textarea
                      id="editor-prompt"
                      rows={4}
                      placeholder={isTextOnly ? "A cinematic shot of..." : "Describe how you want to animate this asset..."}
                      className="w-full bg-surface-900/80 border border-white/5 rounded-xl px-6 py-5 text-lg placeholder:text-white/30 focus:outline-none focus:border-brand-500/50 resize-none"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-mono text-brand-500 opacity-50 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-Enhance active
                    </div>
                  </div>

                  {/* Model & Settings Toggle */}
                  <div className="mt-6 flex items-center justify-between">
                    <button 
                      onClick={() => setShowModels(!showModels)}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {selectedModelId ? availableModels.find(m => m.id === selectedModelId)?.name : 'Auto-Select Engine'}
                    </button>
                  </div>

                  {/* Model Selection Panel */}
                  <AnimatePresence>
                    {showModels && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/5">
                          <button
                            onClick={() => { setSelectedModelId(null); setTier('basic'); setShowModels(false); }}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedModelId === null ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/5 bg-surface-900/50 hover:border-white/20'}`}
                          >
                            <p className="font-medium text-sm">Auto-Route ✨</p>
                            <p className="text-white/30 text-xs mt-1 font-mono">Best available engine</p>
                          </button>

                          {modelsLoading ? (
                            [1, 2].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)
                          ) : filteredModels.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setSelectedModelId(m.id); setTier(m.minimum_tier); setShowModels(false); }}
                              className={`p-4 rounded-xl border text-left transition-all ${selectedModelId === m.id ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/5 bg-surface-900/50 hover:border-white/20'}`}
                            >
                              <p className="font-medium text-sm truncate flex items-center gap-2">
                                <Cpu className="w-3 h-3 text-brand-500 opacity-50" />
                                {m.name}
                              </p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-white/30 text-[10px] font-mono uppercase">{m.provider}</span>
                                {m.cost_per_unit > 0 && <span className="text-brand-500 text-[10px] uppercase font-mono tracking-widest">Premium</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generate Button */}
                  <div className="mt-8">
                    <button
                      onClick={handleUploadOrGenerate}
                      disabled={loading || (!isTextOnly && !file && !projectId) || (step === 'prompt' && !prompt.trim())}
                      className="btn-glow w-full flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Generating ── */}
            {step === 'generating' && sceneStatus && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12 w-full max-w-xl mx-auto"
              >
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-xs font-semibold tracking-wider mb-6 uppercase">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                  </div>
                  <h1 className="text-3xl font-display font-medium tracking-tight mb-2">Rendering your vision</h1>
                </div>

                <div className="glass-card p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
                  
                  {/* Progress Ring */}
                  <div className="flex justify-center mb-10">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="60" className="stroke-surface-800 fill-none stroke-[4]" />
                        <motion.circle
                          cx="64" cy="64" r="60"
                          className="stroke-brand-500 fill-none stroke-[4] drop-shadow-[0_0_10px_rgba(163,255,18,0.5)]"
                          strokeLinecap="round"
                          strokeDasharray="377"
                          strokeDashoffset={377 - (377 * sceneStatus.progress) / 100}
                          transition={{ duration: 0.5 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-display font-bold text-white tracking-tighter">
                          {sceneStatus.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status label */}
                  <div className="text-center border-t border-white/5 pt-6">
                    <p className="font-mono text-sm tracking-wide text-brand-400 mb-2">
                       {`> ${statusLabels[sceneStatus.status] || 'Processing...'}`}
                    </p>
                  </div>

                  {/* Enhanced prompt console */}
                  {sceneStatus.enhanced_prompt && (
                    <div className="mt-8 p-5 rounded-xl bg-surface-950/80 border border-white/5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500/50" />
                      <p className="text-xs text-white/30 font-mono mb-2 uppercase tracking-widest">Compiler Output / Enhanced Prompt</p>
                      <p className="text-white/60 text-sm leading-relaxed font-mono">
                        {sceneStatus.enhanced_prompt}
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {sceneStatus.status === 'failed' && (
                    <div className="mt-6 p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 text-sm font-mono">{`> ERR: ${sceneStatus.error_message || 'Generation cluster failed.'}`}</p>
                      <button onClick={() => setStep('prompt')} className="btn-secondary mt-4 w-full">Restart Pipeline</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Complete ── */}
            {step === 'complete' && sceneStatus?.output_video_url && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 w-full max-w-4xl mx-auto"
              >
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-xs font-semibold tracking-wider mb-6 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Output Ready
                  </div>
                  <h1 className="text-3xl font-display font-medium mb-6">Asset Generated successfully</h1>
                </div>

                {/* Media player */}
                <div className="glass-card overflow-hidden border-2 border-white/5">
                  {(sceneStatus.output_video_url.endsWith('.jpg') || sceneStatus.output_video_url.endsWith('.png') || taskType === 'text_to_image' || taskType === 'image_to_image') ? (
                    <img
                      src={sceneStatus.output_video_url}
                      alt="Generated"
                      className="w-full aspect-video object-contain bg-surface-950"
                    />
                  ) : (
                    <video
                      id="output-video"
                      src={sceneStatus.output_video_url}
                      className="w-full aspect-video bg-surface-950"
                      controls autoPlay loop
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <a
                    href={sceneStatus.output_video_url}
                    download
                    className="btn-glow flex-1 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> Download Asset
                  </a>
                  <button
                    onClick={() => {
                      setStep('upload');
                      setFile(null);
                      setFilePreview(null);
                      setTitle('Untitled Project');
                      setPrompt('');
                      setProjectId(null);
                      setSceneStatus(null);
                      setSelectedModelId(null);
                    }}
                    className="btn-secondary flex items-center justify-center gap-2 px-8"
                  >
                    <Sparkles className="w-4 h-4 text-brand-500" /> New Generation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
