import type { VoiceCategory } from "@/domain/categories";

export type VoiceStatus = "reported" | "ward_matched" | "on_record";
export type Actor = "human" | "agent";

export interface WardHit {
  id: string;
  name: string;
  corporation: string;
  wardNo: number;
  aliases: string[];
  lng: number;
  lat: number;
  bbox: [number, number, number, number];
  confidence: number;
}

export interface VoicePhoto {
  id: string;
  url: string;
  name?: string;
}

export interface VoiceEvent {
  at: string;
  label: string;
  actor: Actor;
}

export interface RelatedTender {
  refNo: string;
  title: string;
  sector: string;
  valueText: string;
  location: string;
  closingDate: string;
  detailUrl: string;
  matchedCategory: VoiceCategory | "none";
}

export interface Voice {
  id: string;
  title: string;
  body: string;
  category: VoiceCategory;
  areaName: string;
  ward: WardHit | null;
  lng: number;
  lat: number;
  photos: VoicePhoto[];
  supporters: number;
  status: VoiceStatus;
  timeline: VoiceEvent[];
  tenders: RelatedTender[];
  seeded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceDraft {
  photoUrl?: string;
  photoName?: string;
  areaName: string;
  title: string;
  body: string;
  category: VoiceCategory | null;
  lng?: number;
  lat?: number;
}

export interface AgentLog {
  at: string;
  tool: string;
  summary: string;
  actor: Actor;
}

export interface CityState {
  voices: Voice[];
  draft: VoiceDraft;
  selectedVoiceId: string | null;
  focusedVoiceId: string | null;
  activity: AgentLog[];
  updatedAt: string;
}

export interface CommandResult {
  ok: boolean;
  summary: string;
  clarification?: string;
  stateChanges: string[];
  data?: Record<string, unknown>;
}

export interface CitySnapshot {
  city: string;
  voiceCount: number;
  countsByCategory: Record<string, number>;
  selectedVoiceId: string | null;
  draft: VoiceDraft;
  voices: Array<Pick<Voice, "id" | "title" | "category" | "areaName" | "status" | "supporters">>;
}
