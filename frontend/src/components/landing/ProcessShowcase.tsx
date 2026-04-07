'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const STEPS = [
    {
        tag: 'Step 01',
        title: 'Upload your vision.',
        desc: 'Simply upload an image or write a prompt. Our engine understands composition, depth, and texture instantly.',
        video: 'https://videos.pexels.com/video-files/5946112/5946112-uhd_2560_1440_24fps.mp4',
        accent: '#818cf8'
    },
    {
        tag: 'Step 02',
        title: 'AI Neural Refinement.',
        desc: 'The Lumina Brain simulates lighting, physics, and fluid motion to bring your creative concept to life.',
        video: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_25fps.mp4',
        accent: '#c084fc'
    },
    {
        tag: 'Step 03',
        title: 'Cinematic Export.',
        desc: 'Get high-fidelity 4K video ads ready for distribution. One click to transform ideas into viral content.',
        video: 'https://videos.pexels.com/video-files/4249015/4249015-uhd_2560_1440_30fps.mp4',
        accent: '#fb7185'
    }
];

function ProcessStep({ step, index }: { step: typeof STEPS[0], index: number }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{
                display: 'flex',
                flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
                alignItems: 'center',
                gap: 80,
                marginBottom: 160,
                flexWrap: 'wrap'
            }}
        >
            {/* Text Info */}
            <div style={{ flex: 1, minWidth: 320 }}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: step.accent,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4em',
                    marginBottom: 20
                }}>
                    {step.tag}
                </div>
                <h3 style={{
                    fontSize: 'clamp(32px, 4vw, 56px)',
                    fontWeight: 900,
                    color: '#e6e6e6',
                    letterSpacing: '-0.04em',
                    lineHeight: 1.1,
                    marginBottom: 24
                }}>
                    {step.title}
                </h3>
                <p style={{
                    fontSize: 19,
                    color: '#a1a1aa',
                    lineHeight: 1.6,
                    maxWidth: 480
                }}>
                    {step.desc}
                </p>
            </div>

            {/* Video Visual */}
            <div style={{
                flex: 1.2,
                minWidth: 320,
                position: 'relative',
                borderRadius: 40,
                overflow: 'hidden',
                aspectRatio: '16/10',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                background: '#0a0c10'
            }}>
                <video
                    autoPlay loop muted playsInline
                    crossOrigin="anonymous"
                    poster={step.video.replace('.mp4', '.jpeg').replace('video-files', 'photos').replace('-uhd', '/pexels-photo').replace('-hd', '/pexels-photo')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                >
                    <source src={step.video} type="video/mp4" />
                </video>

                {/* Subtle overlay to keep contrast high */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to bottom, transparent 60%, ${step.accent}15 100%)`,
                    pointerEvents: 'none'
                }} />
            </div>
        </motion.div>
    );
}

export default function ProcessShowcase() {
    return (
        <section style={{ padding: '160px 24px', background: '#0f1115', position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 120 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#a1a1aa',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4em',
                            marginBottom: 16
                        }}
                    >
                        Behind the Magic
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        style={{
                            fontSize: 'clamp(36px, 5vw, 72px)',
                            fontWeight: 900,
                            color: '#e6e6e6',
                            letterSpacing: '-0.05em'
                        }}
                    >
                        How it works.
                    </motion.h2>
                </div>

                <div>
                    {STEPS.map((step, i) => (
                        <ProcessStep key={i} step={step} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
