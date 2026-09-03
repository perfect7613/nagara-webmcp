"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { useIngestPhotos } from "@/ui/use-ingest-photos";

export function PhotoIngest() {
  const [epoch, setEpoch] = useState(0);
  const { ingestFiles, isUploading, status } = useIngestPhotos();

  return (
    <div className="photo-ingest">
      <FileUpload
        key={epoch}
        compact
        multiple
        accept="image/*"
        label={isUploading ? "Uploading…" : "Add photos"}
        hint="Uploads through UploadThing. Local copies stay if the upload fails."
        onChange={async (files) => {
          await ingestFiles(files);
          setEpoch((value) => value + 1);
        }}
      />
      {status ? <p className="muted ingest-status">{status}</p> : null}
    </div>
  );
}
