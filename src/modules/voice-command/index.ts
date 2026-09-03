import { PRODUCT_CITY } from "@/domain/product";
import { createId } from "@/domain/ids";
import type { VoiceCategory } from "@/domain/categories";
import type {
  Actor,
  CitySnapshot,
  CityState,
  CommandResult,
  Voice,
  VoiceDraft,
} from "@/domain/types";
import { classifyIssue, isCategory } from "@/modules/classify-issue";
import { listRelatedTenders } from "@/modules/tenders";
import { fromAreaName, fromPoint, nearbyAliases } from "@/modules/ward-lookup";
import { SEEDED_VOICES } from "@/modules/voices/seed";

const STORAGE_KEY = "nagara.city.v2";

const emptyDraft = (): VoiceDraft => ({
  areaName: "",
  title: "",
  body: "",
  category: null,
});

export function emptyCity(): CityState {
  return {
    voices: SEEDED_VOICES.map((voice) => ({
      ...voice,
      tenders:
        voice.tenders.length > 0
          ? voice.tenders
          : listRelatedTenders({ category: voice.category, areaName: voice.areaName }),
    })),
    draft: emptyDraft(),
    selectedVoiceId: SEEDED_VOICES[0]?.id ?? null,
    focusedVoiceId: null,
    activity: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadCity(): CityState {
  if (typeof window === "undefined") return emptyCity();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCity();
    const parsed = JSON.parse(raw) as CityState;
    if (!Array.isArray(parsed.voices)) return emptyCity();
    return { ...emptyCity(), ...parsed, activity: parsed.activity ?? [] };
  } catch {
    return emptyCity();
  }
}

export function persistCity(state: CityState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface VoiceCommands {
  getState: () => CityState;
  getSnapshot: () => CitySnapshot;
  setDraft: (patch: Partial<VoiceDraft>) => CommandResult;
  resolveWard: (input: { areaName?: string; lng?: number; lat?: number }) => CommandResult;
  classifyDraft: (caption?: string) => CommandResult;
  logActivity: (entry: { tool: string; summary: string; actor?: Actor }) => CommandResult;
  fileVoice: (input?: {
    actor?: Actor;
    title?: string;
    body?: string;
    areaName?: string;
    category?: VoiceCategory;
    lng?: number;
    lat?: number;
    photoUrl?: string;
  }) => CommandResult;
  listVoices: (filter?: { category?: string; wardId?: string; status?: string }) => CommandResult;
  getVoice: (id: string) => CommandResult;
  supportVoice: (id?: string) => CommandResult;
  focusVoice: (id: string) => CommandResult;
  selectVoice: (id: string | null) => CommandResult;
  attachTenders: (input?: { voiceId?: string; query?: string }) => CommandResult;
}

function snapshotOf(state: CityState): CitySnapshot {
  const countsByCategory: Record<string, number> = {};
  for (const voice of state.voices) {
    countsByCategory[voice.category] = (countsByCategory[voice.category] ?? 0) + 1;
  }
  return {
    city: PRODUCT_CITY,
    voiceCount: state.voices.length,
    countsByCategory,
    selectedVoiceId: state.selectedVoiceId,
    draft: state.draft,
    voices: state.voices.map((voice) => ({
      id: voice.id,
      title: voice.title,
      category: voice.category,
      areaName: voice.areaName,
      status: voice.status,
      supporters: voice.supporters,
    })),
  };
}

function ok(summary: string, changes: string[], data?: Record<string, unknown>): CommandResult {
  return { ok: true, summary, stateChanges: changes, data };
}

function fail(summary: string): CommandResult {
  return { ok: false, summary, stateChanges: [] };
}

export function createVoiceCommands(
  getState: () => CityState,
  setState: (next: CityState) => void,
): VoiceCommands {
  const commit = (next: CityState, summary: string, changes: string[], data?: Record<string, unknown>) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setState(stamped);
    persistCity(stamped);
    return ok(summary, changes, data);
  };

  return {
    getState,
    getSnapshot: () => snapshotOf(getState()),
    setDraft(patch) {
      const state = getState();
      const cleaned = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      ) as Partial<VoiceDraft>;
      return commit(
        { ...state, draft: { ...state.draft, ...cleaned } },
        "Form updated.",
        ["draft"],
        { draft: { ...state.draft, ...cleaned } },
      );
    },
    resolveWard(input) {
      const areaName = input.areaName ?? getState().draft.areaName;
      const ward =
        typeof input.lng === "number" && typeof input.lat === "number"
          ? fromPoint(input.lng, input.lat)
          : fromAreaName(areaName);
      if (!ward) return fail("Could not resolve a GBA ward from that area name.");
      return ok(`Ward ${ward.name} · ${ward.corporation}.`, [], {
        ward,
        nearby: nearbyAliases(ward),
      });
    },
    classifyDraft(caption) {
      const draft = getState().draft;
      const result = classifyIssue(caption ?? `${draft.title} ${draft.body} ${draft.areaName}`);
      if (result.category) {
        const state = getState();
        return commit(
          { ...state, draft: { ...state.draft, category: result.category } },
          result.reason,
          ["draft.category"],
          result,
        );
      }
      return ok(result.reason, [], result);
    },
    fileVoice(input = {}) {
      const state = getState();
      const actor = input.actor ?? "human";
      const areaName = (input.areaName ?? state.draft.areaName).trim();
      const title = (input.title ?? state.draft.title).trim();
      const body = (input.body ?? state.draft.body).trim();
      const photoUrl = input.photoUrl ?? state.draft.photoUrl;
      if (!areaName || !photoUrl) {
        return fail("Need a photo and an area name to file a voice.");
      }

      const classified = classifyIssue(`${title} ${body} ${areaName}`);
      const category =
        (input.category && isCategory(input.category) ? input.category : null) ??
        state.draft.category ??
        classified.category;
      if (!category) {
        return fail(classified.reason);
      }

      const lng = input.lng ?? state.draft.lng;
      const lat = input.lat ?? state.draft.lat;
      const ward =
        typeof lng === "number" && typeof lat === "number" ? fromPoint(lng, lat) : fromAreaName(areaName);
      if (!ward) return fail("Could not match a ward. Try a Bengaluru locality name.");

      const existing = state.voices.find(
        (voice) => voice.category === category && voice.ward?.id === ward.id && voice.title === (title || areaName),
      );
      if (existing) {
        return fail(`A similar voice already exists (${existing.id}). Use support_voice.`);
      }

      const now = new Date().toISOString();
      const voice: Voice = {
        id: createId("voice"),
        title: title || `${category} in ${ward.name}`,
        body,
        category,
        areaName,
        ward,
        lng: lng ?? ward.lng,
        lat: lat ?? ward.lat,
        photos: [{ id: createId("photo"), url: photoUrl, name: state.draft.photoName }],
        supporters: 1,
        status: "on_record",
        timeline: [
          { at: now, label: "Reported", actor },
          { at: now, label: `Ward matched: ${ward.name}`, actor: "agent" },
          { at: now, label: "On record in Nagara", actor: "agent" },
        ],
        tenders: listRelatedTenders({ areaName, category, wardId: ward.name }),
        createdAt: now,
        updatedAt: now,
      };

      return commit(
        {
          ...state,
          voices: [voice, ...state.voices],
          selectedVoiceId: voice.id,
          focusedVoiceId: voice.id,
          draft: emptyDraft(),
        },
        `Filed ${voice.id} in ${ward.name}.`,
        ["voices", "selection"],
        { voice },
      );
    },
    listVoices(filter = {}) {
      const voices = getState().voices.filter((voice) => {
        if (filter.category && voice.category !== filter.category) return false;
        if (filter.wardId && voice.ward?.id !== filter.wardId && voice.ward?.name !== filter.wardId) {
          return false;
        }
        if (filter.status && voice.status !== filter.status) return false;
        return true;
      });
      return ok(`${voices.length} voice(s).`, [], { voices });
    },
    getVoice(id) {
      const voice = getState().voices.find((item) => item.id === id);
      if (!voice) return fail("Voice not found.");
      return ok(voice.title, [], { voice });
    },
    supportVoice(id) {
      const state = getState();
      const voiceId = id ?? state.selectedVoiceId;
      if (!voiceId) return fail("Select a voice first.");
      const voices = state.voices.map((voice) =>
        voice.id === voiceId
          ? {
              ...voice,
              supporters: voice.supporters + 1,
              timeline: [
                ...voice.timeline,
                { at: new Date().toISOString(), label: "Someone joined this voice", actor: "human" as const },
              ],
            }
          : voice,
      );
      const voice = voices.find((item) => item.id === voiceId);
      return commit({ ...state, voices }, `Support recorded (${voice?.supporters ?? 0}).`, ["voices"], { voice });
    },
    focusVoice(id) {
      const state = getState();
      const voice = state.voices.find((item) => item.id === id);
      if (!voice) return fail("Voice not found.");
      return commit(
        { ...state, selectedVoiceId: id, focusedVoiceId: id },
        `Looking at ${voice.title}.`,
        ["selection"],
        { voice },
      );
    },
    selectVoice(id) {
      const state = getState();
      return commit({ ...state, selectedVoiceId: id }, "Selection updated.", ["selection"]);
    },
    attachTenders(input = {}) {
      const state = getState();
      const voice = state.voices.find((item) => item.id === (input.voiceId ?? state.selectedVoiceId));
      const tenders = listRelatedTenders({
        areaName: voice?.areaName ?? state.draft.areaName,
        category: voice?.category ?? state.draft.category,
        query: input.query,
        wardId: voice?.ward?.name,
      });
      if (voice) {
        const voices = state.voices.map((item) => (item.id === voice.id ? { ...item, tenders } : item));
        return commit({ ...state, voices }, `${tenders.length} related tender(s).`, ["voices"], { tenders });
      }
      return ok(`${tenders.length} related tender(s).`, [], { tenders });
    },
    logActivity(entry) {
      const state = getState();
      const item = {
        at: new Date().toISOString(),
        tool: entry.tool,
        summary: entry.summary,
        actor: entry.actor ?? "agent",
      };
      return commit(
        { ...state, activity: [item, ...state.activity].slice(0, 12) },
        entry.summary,
        ["activity"],
        { activity: item },
      );
    },
  };
}
