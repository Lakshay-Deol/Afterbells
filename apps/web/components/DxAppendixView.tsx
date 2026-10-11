"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type DxEvent } from "@/lib/api";
import { ErrorState, LoadingState } from "./WorkspaceUI";
export function DxAppendixView() {
  const [notice, setNotice] = useState("");
  const appendix = useQuery({
    queryKey: ["dx"],
    queryFn: ({ signal }) =>
      api<{ events: DxEvent[] }>("/dx/events?limit=100", { signal }),
  });
  const events = appendix.data?.events ?? [];
  const markdown =
    "# AfterBells integration evidence\n\n" +
    events
      .map(
        (event) =>
          `- ${event.timestamp} · ${event.module} · ${event.endpoint} · HTTP ${event.httpStatus ?? "Unknown"} · ${event.latencyMs ?? "Unknown"} ms`,
      )
      .join("\n");
  const csvCell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = [
    "timestamp,module,endpoint,httpStatus,latencyMs,success",
    ...events.map((event) =>
      [
        event.timestamp,
        event.module,
        event.endpoint,
        event.httpStatus,
        event.latencyMs,
        event.success,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("Markdown copied.");
    } catch {
      setNotice("Clipboard unavailable. Select the text below to copy it.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "afterbells-dx-evidence.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("CSV download started.");
  }
  return (
    <section className="panel p-5">
      <div className="section-heading">
        <h2>Developer evidence export</h2>
        <button
          className="secondary-action"
          onClick={() => void appendix.refetch()}
          disabled={appendix.isFetching}
        >
          Refresh
        </button>
      </div>
      <ErrorState
        error={appendix.error}
        retry={() => void appendix.refetch()}
      />
      {appendix.isPending && (
        <LoadingState>Loading evidence export…</LoadingState>
      )}
      <p className="small-note">
        Export stored integration events. This is source material, not an
        independently verified experience report.
      </p>
      <div className="flex gap-3 mt-4">
        <button
          className="secondary-action"
          disabled={!appendix.data || !events.length}
          onClick={() => void copy()}
        >
          Copy Markdown
        </button>
        <button
          className="secondary-action"
          disabled={!appendix.data || !events.length}
          onClick={download}
        >
          Export CSV
        </button>
      </div>
      {notice && (
        <p role="status" className="inline-notice mt-4">
          {notice}
        </p>
      )}
      {appendix.data && <pre className="evidence-json mt-4">{markdown}</pre>}
    </section>
  );
}
