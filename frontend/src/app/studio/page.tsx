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
import ImageTo3D from '@/components/studio/tabs/ImageTo3D';
import TextToStory from '@/components/studio/tabs/TextToStory';
import IgamingAssets from '@/components/studio/tabs/IgamingAssets';
import { projectsAPI, generationAPI, uploadAPI, formatApiError, isUpgradePromptError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { isFreeStudioPlan } from '@/lib/studioPlan';
import { useUsageSummary } from '@/hooks/useUsageSummary';
import UpgradePlanModal, { type UpgradeModalReason } from '@/components/studio/UpgradePlanModal';
import EmailVerificationBanner from '@/components/studio/EmailVerificationBanner';

function isStudioTab(v: string | null): v is StudioTab {
  return (
    v === 'text-to-image' ||
    v === 'image-to-image' ||
    v === 'image-to-video' ||
    v === 'text-to-video' ||
    v === 'image-to-3d' ||
    v === 'text-to-story' ||
    v === 'igaming-assets'
  );
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: usage, loading: usageLoading } = useUsageSummary();
  const [activeTab, setActiveTab] = useState<StudioTab>('text-to-image');
  const [loading, setLoading] = useState(false);
  const [outputSrc, setOutputSrc] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<OutputType>('none');
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeModalReason>('generic');
  const [upgradeDetail, setUpgradeDetail] = useState<string | undefined>(undefined);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const t = searchParams.get('tab');
    if (isStudioTab(t)) {
      setActiveTab(t);
    } else {
      router.replace('/studio?tab=text-to-image', { scroll: false });
    }
  }, [searchParams, router]);

  const openUpgradeModal = (reason: UpgradeModalReason, detail?: string) => {
    setUpgradeReason(reason);
    setUpgradeDetail(detail);
    setUpgradeOpen(true);
    setLoading(false);
  };

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
          toast.success(
            type === 'video' ? 'Video generated!' : type === 'model' ? '3D model ready!' : 'Image generated!',
          );
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
    setOutputType(type);

    const videoTab = activeTab === 'image-to-video' || activeTab === 'text-to-video';
    const threeDTab = activeTab === 'image-to-3d';
    const storyTab = activeTab === 'text-to-story';
    const igamingTab = activeTab === 'igaming-assets';
    const paidOnlyStudioTab = videoTab || threeDTab || storyTab || igamingTab;

    if (isFreeStudioPlan(user?.plan) && paidOnlyStudioTab) {
      openUpgradeModal(threeDTab ? 'three_d_free' : storyTab ? 'story_free' : igamingTab ? 'igaming_free' : 'video_free');
      return;
    }

    if (!videoTab && usage && !usageLoading) {
      const cap = usage.monthly_image_quota ?? 0;
      const used = usage.image_generations_this_month ?? 0;
      if (cap > 0 && used >= cap) {
        openUpgradeModal('quota');
        return;
      }
    }

    setLoading(true);
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
        duration_seconds: task_type === 'text_to_story' ? (payload.sceneDuration ?? 5) : duration_seconds,
        enhance_prompt:
          task_type === 'image_to_3d' || task_type === 'text_to_story'
            ? false
            : 'enhance' in payload
              ? payload.enhance
              : true,
        preserve_subject: task_type === 'image_to_image' ? true : undefined,
        cinematic_redraw: false,
        hero_cinematic_reframe:
          task_type === 'image_to_image' && 'heroCinematic' in payload ? !!payload.heroCinematic : undefined,
        image_model:
          task_type === 'text_to_story'
            ? `text_to_story_${payload.sceneCount ?? 5}${(payload.sceneDuration ?? 5) > 5 ? '_10s' : ''}`
            : (task_type === 'image_to_image' ||
                task_type === 'text_to_image' ||
                task_type === 'image_to_3d') &&
              payload.model
            ? payload.model
            : undefined,
        video_model:
          (task_type === 'image_to_video' || task_type === 'text_to_video') && payload.videoModel
            ? payload.videoModel
            : undefined,
        reference_image_url,
        aspect_ratio:
          (task_type === 'image_to_image' || task_type === 'text_to_image') && payload?.ratio
            ? String(payload.ratio)
            : undefined,
        idempotency_key: idempotencyKeyRef.current,
        // Story Studio fields
        ...(task_type === 'text_to_story' && {
          story_scene_count: payload.sceneCount ?? 5,
          story_narrator_voice: payload.voice ?? 'fable',
          story_video_model: payload.videoModel ?? 'kling_21_pro',
          generate_audio: payload.generateMusic ?? true,
          audio_prompt: payload.musicPrompt || undefined,
          audio_type: 'music',
          story_scene_duration: payload.sceneDuration ?? 5,
        }),
        // iGaming Asset Generator fields
        ...(task_type === 'igaming_assets' && {
          igaming_template: payload.igaming_template ?? 'slot_icon',
          igaming_style: payload.igaming_style ?? 'gold',
          igaming_quality: payload.igaming_quality ?? 'standard',
          image_model: payload.image_model ?? 'igaming_standard',
          enhance_prompt: false,
        }),
      });
      idempotencyKeyRef.current = crypto.randomUUID();

      const { scene_id } = genRes.data;

      // 3. Start Polling
      pollStatus(scene_id, type);

    } catch (err: unknown) {
      console.error('Generation Error:', err);
      if (isUpgradePromptError(err)) {
        const msg = formatApiError(err, '');
        const low = msg.toLowerCase();
        let reason: UpgradeModalReason = 'generic';
        if (low.includes('credit')) reason = 'credits';
        else if (
          low.includes('monthly') ||
          low.includes('quota') ||
          low.includes('limit reached') ||
          low.includes('allowance')
        ) {
          reason = 'quota';
        }
        openUpgradeModal(reason, msg);
        return;
      }
      toast.error(formatApiError(err, 'Generation failed to start.'));
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (lastPayload && outputType !== 'none') handleGenerate(lastPayload, outputType);
  };

  const isVideoTab = activeTab === 'image-to-video' || activeTab === 'text-to-video' || activeTab === 'text-to-story';
  const isModelTab = activeTab === 'image-to-3d';
  const isIgamingTab = activeTab === 'igaming-assets';

  const tabMeta: Record<StudioTab, { title: string; subtitle: string; accent: CanvasAccent }> = {
    'text-to-image': {
      title: 'Text to Image',
      subtitle: 'Your image appears in this black preview area. Controls are in the bar below.',
      accent: 'image',
    },
    'image-to-image': {
      title: 'Image Edit',
      subtitle: 'Your restyled image shows here. Upload a photo below, describe the change, then generate.',
      accent: 'image',
    },
    'image-to-video': {
      title: 'Animate',
      subtitle: 'Your animated clip plays here when ready. Drop an image below and pick a motion model.',
      accent: 'video',
    },
    'text-to-video': {
      title: 'Text to Video',
      subtitle: 'Your clip appears in this canvas. Describe the scene below, then use the + button.',
      accent: 'video',
    },
    'image-to-3d': {
      title: 'Image to 3D',
      subtitle: 'Upload a clear photo - your GLB or mesh downloads from here when generation finishes.',
      accent: 'model',
    },
    'text-to-story': {
      title: 'Story Studio',
      subtitle: 'Your story video renders here when complete. Write a script below, pick your scenes and voice, then generate.',
      accent: 'video',
    },
    'igaming-assets': {
      title: 'iGaming Assets',
      subtitle: 'Your 4-asset pack (front, left angle, right angle, promo) appears here. Describe your game asset below.',
      accent: 'igaming',
    },
  };

  return (
    <div className="studio-layout studio-layout--generator">
      <UpgradePlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        detailMessage={upgradeDetail}
      />
      <StudioIconRail />
      <Sidebar />

      <main className="studio-main studio-workspace-main">
        {user && user.email_verified === false && (
          <div style={{ padding: '14px 20px 0' }}>
            <EmailVerificationBanner email={user.email} />
          </div>
        )}
        <div className="studio-workspace-stack">
          <div className="studio-main-canvas studio-workspace-canvas">
            <OutputPanel
              type={loading ? (isVideoTab ? 'video' : isModelTab ? 'model' : isIgamingTab ? 'igaming' : 'image') : outputType}
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
                  {activeTab === 'image-to-3d' && (
                    <ImageTo3D onGenerate={p => handleGenerate(p, 'model')} loading={loading} />
                  )}
                  {activeTab === 'text-to-story' && (
                    <TextToStory onGenerate={p => handleGenerate(p, 'video')} loading={loading} />
                  )}
                  {activeTab === 'igaming-assets' && (
                    <IgamingAssets onGenerate={p => handleGenerate(p, 'igaming')} loading={loading} />
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
