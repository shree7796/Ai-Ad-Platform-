export type UpgradePlanKey = 'basic' | 'pro' | 'premium';

export const UPGRADE_PLAN_ORDER: UpgradePlanKey[] = ['basic', 'pro', 'premium'];

export interface UpgradePlanInfo {
  key: UpgradePlanKey;
  display: string;
  /** Short price line for the modal (monthly). */
  priceLabel: string;
  credits: string;
  tagline: string;
  features: string[];
}

export const UPGRADE_PLANS: Record<UpgradePlanKey, UpgradePlanInfo> = {
  basic: {
    key: 'basic',
    display: 'Basic',
    priceLabel: '$15/mo',
    credits: '1,200',
    tagline: 'For individuals',
    features: [
      '1,200 credits every month',
      'Text & image generation plus video tools',
      'Commercial-friendly use on your outputs',
      'No Lumina watermark',
      'Higher monthly caps than Free',
    ],
  },
  pro: {
    key: 'pro',
    display: 'Pro',
    priceLabel: '$30/mo',
    credits: '3,200',
    tagline: 'For power users',
    features: [
      '3,200 credits every month',
      'Pro & premium model tiers',
      'Longer videos and higher monthly caps',
      '20% bonus credits on top-up packs',
      'Priority generation queue',
    ],
  },
  premium: {
    key: 'premium',
    display: 'Studio',
    priceLabel: '$59/mo',
    credits: '7,000',
    tagline: 'Full creative studio',
    features: [
      '7,000 credits every month',
      'All models including premium tier',
      'Up to 60s video length',
      'Highest priority queue',
      '20% bonus credits on top-up packs',
    ],
  },
};
