'use client';

import { motion } from 'framer-motion';

const BRANDS = ['Publicis Groupe', 'Serviceplan', 'Mazda', 'Dentsu', 'Adidas', 'Humain'];

export default function LogoCloud() {
    const track = [...BRANDS, ...BRANDS, ...BRANDS];

    return (
        <section className="relative z-10 border-b border-neutral-200/80 bg-[#f0f0ee] py-16 md:py-20">
            <div className="mx-auto max-w-[1200px] px-6 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
                    Force multiplying teams at
                </p>
            </div>

            <div className="relative mt-10 w-full overflow-hidden">
                <motion.div
                    animate={{ x: [0, -1200] }}
                    transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                    className="flex w-max items-center gap-16 md:gap-24"
                >
                    {track.map((name, i) => (
                        <span
                            key={`${name}-${i}`}
                            className="shrink-0 text-[15px] font-medium text-neutral-300 md:text-[16px]"
                        >
                            {name}
                        </span>
                    ))}
                </motion.div>
                <div
                    className="pointer-events-none absolute inset-0 z-[2]"
                    style={{
                        background:
                            'linear-gradient(to right, #f0f0ee 0%, transparent 12%, transparent 88%, #f0f0ee 100%)',
                    }}
                />
            </div>
        </section>
    );
}
