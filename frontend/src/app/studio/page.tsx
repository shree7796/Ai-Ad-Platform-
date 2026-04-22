'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import StudioIconRail from '@/components/studio/StudioIconRail';
import type { StudioTab } from '@/lib/studioTabs';
import OutputPanel, { OutputType, type CanvasAccent } from '@/components/studio/OutputPanel';
import TextToImage from '@/components/studio/tabs/TextToImage';
import ImageToImage from '@/components/studio/tabs/ImageToImage';
import ImageToVideo from '@/components/studio/tabs/ImageToVideo';
import TextToVideo from '@/components/studio/tabs/TextToVideo';
import { projectsAPI, generationAPI, uploadAPI, formatApiError } from '@/lib/api';

function isStudioTab(v: string | null): v is StudioTab {
  return (
    v === 'text-to-image' ||
    v === 'image-to-image' ||
    v === 'image-to-video' ||
    v === 'text-to-video'
  );
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StudioTab>('text-to-image');
  const [loading, setLoading] = useState(false);
  const [outputSrc, setOutputSrc] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('none');
  const [lastPayload, setLastPayload] = useState<any>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const t = searchParams.get('tab');
    if (isStudioTab(t)) {
      setActiveTab(t);
    } else {
      router.replace('/studio?tab=text-to-image', { scroll: false });
    }
  }, [searchParams, router]);

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

      // Upload reference / end-frame image if provided (image_to_video reference models)
      let reference_image_url: string | undefined;
      if (payload.referenceImage instanceof File) {
        try {
          const refRes = await uploadAPI.upload(payload.referenceImage);
          reference_image_url = refRes.data.url;
        } catch (refErr) {
          throw new Error(formatApiError(refErr, 'Failed to upload reference image.'));
        }
      }

      const genRes = await generationAPI.trigger({
        project_id,
        prompt: payload.prompt,
        task_type,
        duration_seconds,
        enhance_prompt: 'enhance' in payload ? payload.enhance : true,
        preserve_subject: task_type === 'image_to_image' ? true : undefined,
        cinematic_redraw: false,
        hero_cinematic_reframe:
          task_type === 'image_to_image' && 'heroCinematic' in payload ? !!payload.heroCinematic : undefined,
        image_model:
          (task_type === 'image_to_image' || task_type === 'text_to_image') && payload.model
            ? payload.model
            : undefined,
        video_model:
          (task_type === 'image_to_video' || task_type === 'text_to_video') && payload.videoModel
            ? payload.videoModel
            : undefined,
        reference_image_url,
        idempotency_key: idempotencyKeyRef.current,
      });
      idempotencyKeyRef.current = crypto.randomUUID();

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

  const tabMeta: Record<StudioTab, { title: string; subtitle: string; accent: CanvasAccent }> = {
    'text-to-image': {
      title: 'Text to Image',
      subtitle: 'Your image appears in this black preview area. Controls are in the bar below.',
      accent: 'image',
    },
    'image-to-image': {
      title: 'Image to Image',
      subtitle: 'Your edited image shows here after generate. Use the pill bar below for prompts and settings.',
      accent: 'image',
    },
    'image-to-video': {
      title: 'Image to Video',
      subtitle: 'Your video plays in this preview when it is ready. Settings stay in the bottom bar.',
      accent: 'video',
    },
    'text-to-video': {
      title: 'Text to Video',
      subtitle: 'Your clip appears in this canvas. Describe the scene below, then use the + button.',
      accent: 'video',
    },
  };

  return (
    <div className="studio-layout studio-layout--generator">
      <StudioIconRail />
      <Sidebar />

      <main className="studio-main studio-workspace-main">
        <div className="studio-workspace-stack">
          <div className="studio-main-canvas studio-workspace-canvas">
            <OutputPanel
              type={loading ? (isVideoTab ? 'video' : 'image') : outputType}
              src={outputSrc}
              loading={loading}
              onRegenerate={handleRegenerate}
              toolTitle={tabMeta[activeTab].title}
              toolSubtitle={tabMeta[activeTab].subtitle}
              imageOrVideo={tabMeta[activeTab].accent}
            />
          </div>

          <div className="studio-workspace-dock">
            <div className="krea-composer">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
