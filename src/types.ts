export type WorkStatus = 'LIVE_VERIFIED' | 'ONLINE_UNVERIFIED' | 'ARCHIVED' | 'CONCEPT' | 'RECOVERED';
export interface Project {
  id: string; name: string; category: string; url: string; icon?: string;
  description: string; summary: string; problem: string; exploration: string; outcome: string;
  ecosystem: string[]; status: WorkStatus; type: 'work' | 'experiment' | 'prototype'; visualType: 'real' | 'illustrative' | 'placeholder';
}
export interface JourneyStep { phase: string; title: string; subtitle: string; description: string; techKeywords: string[]; environment?: { device?: string; laptop?: string; learning?: string } }
export interface EcosystemGroup { category: string; items: { name: string; description: string; iconName: string }[] }
export interface Person { name: string; handle: string; avatar: string; role: string; socials?: { platform: string; url: string; label: string }[] }
export interface Community { name: string; title: string; tagline: string; image: string; url?: string; status?: string; members?: string[] }
