"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_TONE } from "@/domain/categories";
import { PRODUCT_NAME } from "@/domain/product";
import { hydrateTenders, listRelatedTenders } from "@/modules/tenders";
import { useCity } from "@/ui/voice-provider";
import { useUploadThing } from "@/adapters/uploadthing/client";
import { WebMcpStatus } from "@/components/webmcp-status";
import type { RelatedTender } from "@/domain/types";

export function CreateMap() {
  const { state, commands } = useCity();
  const searchParams = useSearchParams();
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const focusedQuery = useRef(false);
  const [status, setStatus] = useState("");
  const [tenderSource, setTenderSource] = useState("bundled");
  const { startUpload, isUploading } = useUploadThing("originals", {
    onClientUploadComplete(files) {
      const file = files[0];
      if (file) commands.setDraft({ photoUrl: file.ufsUrl, photoName: file.name });
    },
  });

  const selected = state.voices.find((voice) => voice.id === state.selectedVoiceId) ?? null;
  const tenders = useMemo(() => {
    if (!selected) return [];
    const related = listRelatedTenders({ category: selected.category, areaName: selected.areaName });
    const byRef = new Map(selected.tenders.map((row) => [row.refNo, row]));
    for (const row of related) byRef.set(row.refNo, row);
    return [...byRef.values()];
  }, [selected, tenderSource]);

  useEffect(() => {
    const voiceId = searchParams.get("voice");
    if (!voiceId || focusedQuery.current) return;
    focusedQuery.current = true;
    commands.focusVoice(voiceId);
  }, [commands, searchParams]);

  useEffect(() => {
    fetch("/api/tenders")
      .then((response) => response.json())
      .then((data: { tenders?: RelatedTender[]; source?: string }) => {
        if (data.tenders) hydrateTenders(data.tenders);
        if (data.source) setTenderSource(data.source);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const node = mapNode.current;
    if (!node || mapRef.current) return;
    const map = new maplibregl.Map({
      container: node,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [77.64, 12.94],
      zoom: 11.4,
    });
    mapRef.current = map;
    const resize = () => map.resize();
    map.once("load", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = state.voices.map((voice) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin-dot";
      el.dataset.on = voice.id === state.selectedVoiceId ? "true" : "false";
      el.style.background = CATEGORY_TONE[voice.category];
      el.title = voice.title;
      el.addEventListener("click", () => commands.focusVoice(voice.id));
      return new maplibregl.Marker({ element: el }).setLngLat([voice.lng, voice.lat]).addTo(map);
    });
  }, [state.voices, state.selectedVoiceId, state.updatedAt, commands]);

  useEffect(() => {
    const map = mapRef.current;
    const id = state.focusedVoiceId;
    if (!map || !id) return;
    const voice = state.voices.find((item) => item.id === id);
    if (!voice) return;
    map.easeTo({ center: [voice.lng, voice.lat], zoom: 13.2, duration: 700 });
  }, [state.focusedVoiceId, state.voices]);

  const onFile = async (file?: File) => {
    if (!file) return;
    const local = URL.createObjectURL(file);
    commands.setDraft({ photoUrl: local, photoName: file.name });
    try {
      await startUpload([file]);
    } catch {
      setStatus("Kept the local photo. Hosted upload can finish later.");
    }
  };

  const onLocate = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      commands.setDraft({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      const ward = commands.resolveWard({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      setStatus(ward.summary);
    });
  };

  const onAreaBlur = () => {
    const areaName = state.draft.areaName.trim();
    if (!areaName) return;
    const ward = commands.resolveWard({ areaName });
    setStatus(ward.summary);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.draft.category) commands.classifyDraft();
    setStatus(commands.fileVoice({ actor: "human" }).summary);
  };

  return (
    <div className="map-app">
      <div ref={mapNode} className="map-stage" />
      <div className="map-top">
        <Link className="wordmark" href="/world">
          {PRODUCT_NAME.toLowerCase()}
        </Link>
        <div className="map-top-actions">
          <WebMcpStatus />
          <Link className="btn-quiet" href="/world">
            World
          </Link>
          <button type="button" className="btn-solid" onClick={onLocate}>
            Use my location
          </button>
        </div>
      </div>
      <form className="map-sheet" onSubmit={onSubmit}>
        <p className="kicker">File a voice</p>
        <h2 style={{ margin: "0 0 8px", fontSize: 28 }}>Photo and area name</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Drop a photo here, or let Codex fill this form with set_draft and file_voice.
        </p>
        <label
          className="drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onFile(event.dataTransfer.files[0]);
          }}
        >
          {state.draft.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.draft.photoUrl} alt="" />
          ) : (
            <span>Drop evidence photo</span>
          )}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        <input
          className="field"
          placeholder="Area name, e.g. HSR Layout, Bellandur, Whitefield"
          value={state.draft.areaName}
          onChange={(event) => commands.setDraft({ areaName: event.target.value })}
          onBlur={onAreaBlur}
        />
        <input
          className="field"
          placeholder="Short title"
          value={state.draft.title}
          onChange={(event) => commands.setDraft({ title: event.target.value })}
        />
        <textarea
          className="field"
          placeholder="What failed"
          value={state.draft.body}
          onChange={(event) => commands.setDraft({ body: event.target.value })}
        />
        <div className="chips">
          {CATEGORIES.filter((item) => item !== "waste").map((category) => (
            <button
              key={category}
              type="button"
              className="btn-chip"
              data-on={state.draft.category === category ? "true" : "false"}
              onClick={() => commands.setDraft({ category })}
            >
              {CATEGORY_LABEL[category]}
            </button>
          ))}
        </div>
        <button className="btn-solid" type="submit" disabled={isUploading} style={{ width: "100%" }}>
          Put it on record
        </button>
        {status ? <p className="muted">{status}</p> : null}
        {state.activity.length > 0 ? (
          <ul className="agent-log">
            {state.activity.slice(0, 4).map((item) => (
              <li key={`${item.at}-${item.tool}`}>
                <b>{item.tool}</b>
                <span>{item.summary}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
      {selected ? (
        <aside className="map-rail">
          <p className="kicker">{CATEGORY_LABEL[selected.category]}</p>
          <h3>{selected.title}</h3>
          <p className="muted">
            {selected.ward?.name} · {selected.ward?.corporation}
          </p>
          <p>{selected.body}</p>
          {selected.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.photos[0].url} alt="" className="rail-photo" />
          ) : null}
          <button type="button" className="btn-solid" onClick={() => commands.supportVoice(selected.id)}>
            Join this voice · {selected.supporters}
          </button>
          <p className="kicker" style={{ marginTop: 22 }}>
            Timeline
          </p>
          <ul className="timeline">
            {selected.timeline.map((event) => (
              <li key={`${event.at}-${event.label}`}>
                <span>{event.label}</span>
                <b>{event.actor}</b>
              </li>
            ))}
          </ul>
          <p className="kicker" style={{ marginTop: 22 }}>
            Related records ({tenderSource})
          </p>
          {tenders.length === 0 ? (
            <p className="muted">No matching public listing for this issue.</p>
          ) : (
            tenders.map((tender) => (
              <article key={tender.refNo} className="voice-card" style={{ marginTop: 10 }}>
                <p className="kicker">{tender.sector}</p>
                <h3 style={{ fontSize: 16 }}>{tender.title}</h3>
                <p className="muted">
                  {tender.valueText} · {tender.closingDate}
                </p>
                {tender.detailUrl ? (
                  <a className="muted" href={tender.detailUrl} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                ) : null}
              </article>
            ))
          )}
        </aside>
      ) : null}
    </div>
  );
}
