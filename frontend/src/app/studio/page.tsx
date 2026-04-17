'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import TabSwitcher, { StudioTab } from '@/components/studio/TabSwitcher';
import OutputPanel, { OutputType } from '@/components/studio/OutputPanel';
import TextToImage from '@/components/studio/tabs/TextToImage';
import ImageToImage from '@/components/studio/tabs/ImageToImage';
import ImageToVideo from '@/components/studio/tabs/ImageToVideo';
import TextToVideo from '@/components/studio/tabs/TextToVideo';

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&auto=format';

import { projectsAPI, generationAPI } from '@/lib/api';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('text-to-image');
  const [loading, setLoading] = useState(false);
  const [outputSrc, setOutputSrc] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('none');
  const [lastPayload, setLastPayload] = useState<any>(null);

  const pollStatus = async (sceneId: string, type: OutputType) => {
    const interval = setInterval(async () => {
      try {
        const res = await generationAPI.status(sceneId);
        const { status, output_video_url, error_message } = res.data;

        if (status === 'completed') {
          clearInterval(interval);
          setOutputSrc(output_video_url);
          setLoading(false);
          toast.success(type === 'video' ? 'Video generated!' : 'Image generated!');
        } else if (status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          toast.error(error_message || 'Generation failed.');
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        toast.error('Error checking status.');
      }
    }, 2000);
  };

  const handleGenerate = async (payload: any, type: OutputType) => {
    setLastPayload(payload);
    setLoading(true);
    setOutputType(type);
    setOutputSrc(null);

    try {
      let project_id: string;

      // 1. Handle Project Creation
      if (payload.image) {
        // Image-to-X task
        const formData = new FormData();
        formData.append('title', `Studio ${activeTab} ${new Date().toLocaleTimeString()}`);
        formData.append('task_type', activeTab.replace(/-/g, '_'));
        formData.append('media', payload.image);

        const projectRes = await projectsAPI.create(formData);
        project_id = projectRes.data.id;
      } else {
        // Text-to-X task (create dummy project)
        const formData = new FormData();
        formData.append('title', `Text Studio ${new Date().toLocaleTimeString()}`);
        formData.append('task_type', activeTab.replace(/-/g, '_'));
        const projectRes = await projectsAPI.create(formData);
        project_id = projectRes.data.id;
      }

      // 2. Trigger Generation
      const task_type = activeTab.replace(/-/g, '_');
      const genRes = await generationAPI.trigger({
        project_id,
        prompt: payload.prompt,
        task_type,
        duration_seconds: payload.duration ? parseInt(payload.duration) : 10,
        enhance_prompt: 'enhance' in payload ? payload.enhance : true,
        // image_to_image: preserve_subject true + hero_cinematic_reframe uses flux hero reframe (see toggle).
        preserve_subject: task_type === 'image_to_image' ? true : undefined,
        cinematic_redraw: false,
        hero_cinematic_reframe:
          task_type === 'image_to_image' && 'heroCinematic' in payload ? !!payload.heroCinematic : undefined,
      });

      const { scene_id } = genRes.data;

      // 3. Start Polling
      pollStatus(scene_id, type);

    } catch (err: any) {
      console.error('Generation Error:', err);
      const msg = err.response?.data?.detail || 'Generation failed to start.';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (lastPayload && outputType !== 'none') handleGenerate(lastPayload, outputType);
  };

  const isVideoTab = activeTab === 'image-to-video' || activeTab === 'text-to-video';

  const tabMeta: Record<StudioTab, { title: string; subtitle: string }> = {
    'text-to-image': { title: 'Text to Image', subtitle: 'Generate stunning images from a description' },
    'image-to-image': { title: 'Image to Image', subtitle: 'Transform and enhance your existing images' },
    'image-to-video': { title: 'Image to Video', subtitle: 'Animate a still image into a dynamic video' },
    'text-to-video': { title: 'Text to Video', subtitle: 'Create cinematic video scenes from text' },
  };

  return (
    <div className="studio-layout">
      <Sidebar />

      {/* Main workspace */}
      <main className="studio-main">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ marginBottom: 28 }}
        >
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, Montserrat), sans-serif',
            letterSpacing: '-0.03em', marginBottom: 4,
          }}>
            {tabMeta[activeTab].title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            {tabMeta[activeTab].subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ marginBottom: 32 }}
        >
          <TabSwitcher
            active={activeTab}
            onChange={tab => {
              setActiveTab(tab);
              setOutputSrc(null);
              setOutputType('none');
            }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {activeTab === 'text-to-image' && (
              <TextToImage onGenerate={p => handleGenerate(p, 'image')} loading={loading} />
            )}
            {activeTab === 'image-to-image' && (
              <ImageToImage onGenerate={p => handleGenerate(p, 'image')} loading={loading} />
            )}
            {activeTab === 'image-to-video' && (
              <ImageToVideo onGenerate={p => handleGenerate(p, 'video')} loading={loading} />
            )}
            {activeTab === 'text-to-video' && (
              <TextToVideo onGenerate={p => handleGenerate(p, 'video')} loading={loading} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Output Panel */}
      <aside className="studio-output">
        <OutputPanel
          type={loading ? (isVideoTab ? 'video' : 'image') : outputType}
          src={outputSrc}
          loading={loading}
          onRegenerate={handleRegenerate}
        />
      </aside>
    </div>
  );
}
