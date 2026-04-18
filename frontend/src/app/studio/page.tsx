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
import { projectsAPI, generationAPI, formatApiError } from '@/lib/api';
import { BRAND_NAME } from '@/lib/brand';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('text-to-image');
  const [loading, setLoading] = useState(false);
  const [outputSrc, setOutputSrc] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('none');
  const [lastPayload, setLastPayload] = useState<any>(null);

  /** Poll until completed/failed. Without a max, loading never stops if the Celery worker is down or the task hangs. */
  const pollStatus = (sceneId: string, type: OutputType) => {
    let attempts = 0;
    const maxAttempts = 180; // 2s × 180 = 6 minutes
    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setLoading(false);
        toast.error(
          'Generation timed out (job never finished). Start the Celery worker (e.g. docker compose up -d worker), ' +
            'confirm Redis and FAL_KEY in .env, then try again.',
          { duration: 8000 }
        );
        return;
      }
      try {
        const res = await generationAPI.status(sceneId);
        const { status, output_video_url, error_message } = res.data;

        if (status === 'completed') {
          clearInterval(interval);
          setOutputSrc(output_video_url ?? null);
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
        toast.error(formatApiError(err, 'Error checking status.'));
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
      const durationRaw = payload?.duration;
      const durationParsed =
        durationRaw != null && String(durationRaw).trim() !== ''
          ? parseInt(String(durationRaw).replace(/\D/g, '') || '0', 10)
          : 0;
      const duration_seconds =
        Number.isFinite(durationParsed) && durationParsed > 0 ? Math.min(120, durationParsed) : 10;

      const genRes = await generationAPI.trigger({
        project_id,
        prompt: payload.prompt,
        task_type,
        duration_seconds,
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

    } catch (err: unknown) {
      console.error('Generation Error:', err);
      toast.error(formatApiError(err, 'Generation failed to start.'));
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
    <div className="studio-layout studio-layout--with-preview">
      <Sidebar />

      {/* Main workspace */}
      <main className="studio-main">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ marginBottom: 28 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>{BRAND_NAME}</span>
            <span style={{ opacity: 0.45 }}>·</span>
            <span>Studio</span>
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, Montserrat), sans-serif',
            letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.15,
          }}>
            {tabMeta[activeTab].title}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, fontWeight: 500, maxWidth: 520, lineHeight: 1.55 }}>
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
        <div className="studio-output-panel">
          <OutputPanel
            type={loading ? (isVideoTab ? 'video' : 'image') : outputType}
            src={outputSrc}
            loading={loading}
            onRegenerate={handleRegenerate}
          />
        </div>
      </aside>
    </div>
  );
}
