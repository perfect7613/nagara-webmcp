"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

export const FileUpload = ({
  onChange,
  compact = false,
  multiple = true,
  accept = "image/*",
  label = "Add photos",
  hint = "Drag files here or click to browse.",
}: {
  onChange?: (files: File[]) => void;
  compact?: boolean;
  multiple?: boolean;
  accept?: string;
  label?: string;
  hint?: string;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange?.(newFiles);
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple,
    noClick: true,
    accept: { [accept]: [] },
    onDrop: handleFileChange,
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "file-drop relative block w-full overflow-hidden text-left",
          compact ? "p-4" : "p-8",
        )}
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) =>
            handleFileChange(Array.from(event.target.files || []))
          }
          className="hidden"
        />
        <div className="relative z-10 flex items-center gap-3">
          <span className="icon-well">
            <IconUpload className="h-4 w-4" />
          </span>
          <span>
            <span className="file-drop-label">{isDragActive ? "Drop to add" : label}</span>
            <span className="muted">{hint}</span>
          </span>
        </div>
        {files.length > 0 ? (
          <ul className="file-drop-list">
            {files.slice(-4).map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>
                {file.name}
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
        ) : null}
      </button>
    </div>
  );
};

export function GridPattern() {
  return null;
}
