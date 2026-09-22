"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface PlannerTopic {
  id: string;
  topicTitle: string;
  searchIntent: string | null;
  keywords: string[];
  status: "suggested" | "approved" | "rejected" | "generated" | "published";
  blogSlug?: string | null;
}

const STATUS_LABEL: Record<PlannerTopic["status"], string> = {
  suggested: "Suggested",
  approved: "Approved",
  rejected: "Rejected",
  generated: "Content Generated",
  published: "Published",
};

function TopicRow({
  topic,
  onDecide,
  onGenerateDraft,
  busy,
}: {
  topic: PlannerTopic;
  onDecide: (id: string, status: "approved" | "rejected") => void;
  onGenerateDraft: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{topic.topicTitle}</p>
          <p className="mt-1 text-xs text-gray-400">
            {topic.searchIntent ? `Intent: ${topic.searchIntent} · ` : ""}
            Keywords: {topic.keywords.join(", ")}
          </p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">
          {STATUS_LABEL[topic.status]}
        </span>
      </div>
      {topic.status === "suggested" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(topic.id, "approved")}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(topic.id, "rejected")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Reject
          </button>
        </div>
      ) : null}
      {topic.status === "approved" ? (
        <div className="mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onGenerateDraft(topic.id)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Generating..." : "Generate Draft Blog Post"}
          </button>
        </div>
      ) : null}
      {(topic.status === "generated" || topic.status === "published") && topic.blogSlug ? (
        <div className="mt-3">
          <Link
            href={`/admin/blogs/${topic.blogSlug}`}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Edit Draft →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function AiPlannerTopicList({
  toolId,
  initialTopics,
}: {
  toolId: string;
  initialTopics: PlannerTopic[];
}) {
  const router = useRouter();
  const [topics, setTopics] = useState(initialTopics);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-planner/tools/${toolId}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate topic ideas.");
        return;
      }
      router.refresh();
      const freshTopics = (data.plan?.topics ?? []) as {
        id: string;
        topicTitle: string;
        searchIntent: string | null;
        keywords: string;
        status: PlannerTopic["status"];
      }[];
      setTopics(freshTopics.map((t) => ({ ...t, keywords: JSON.parse(t.keywords) })));
      if (data.created === 0) {
        setError("No new topic ideas left to suggest for this tool right now.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDecide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ai-planner/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this topic.");
        return;
      }
      setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateDraft(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ai-planner/topics/${id}/generate-draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate a draft for this topic.");
        return;
      }
      setTopics((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "generated", blogSlug: data.blog.slug } : t
        )
      );
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const suggested = topics.filter((t) => t.status === "suggested");
  const approved = topics.filter((t) => t.status === "approved");
  const rejected = topics.filter((t) => t.status === "rejected");
  const generated = topics.filter((t) => t.status === "generated" || t.status === "published");

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {generating ? "Generating..." : "Generate More Topic Ideas"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {suggested.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Needs Review ({suggested.length})</h2>
          <div className="space-y-3">
            {suggested.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onDecide={handleDecide}
                onGenerateDraft={handleGenerateDraft}
                busy={busyId === topic.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {approved.length > 0 ? (
        <section>
          <h2 className="mb-1 font-semibold">Approved — Ready for Content Generation ({approved.length})</h2>
          <p className="mb-3 text-sm text-gray-500">
            Click &quot;Generate Draft Blog Post&quot; to assemble a draft from this tool&apos;s
            own content. It saves as a Draft — nothing is published automatically.
          </p>
          <div className="space-y-3">
            {approved.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onDecide={handleDecide}
                onGenerateDraft={handleGenerateDraft}
                busy={busyId === topic.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {generated.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Generated / Published ({generated.length})</h2>
          <div className="space-y-3">
            {generated.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onDecide={handleDecide}
                onGenerateDraft={handleGenerateDraft}
                busy={busyId === topic.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rejected.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-gray-400">Rejected ({rejected.length})</h2>
          <div className="space-y-3 opacity-60">
            {rejected.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                onDecide={handleDecide}
                onGenerateDraft={handleGenerateDraft}
                busy={busyId === topic.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {topics.length === 0 ? (
        <p className="text-sm text-gray-400">
          No topic ideas yet for this tool. Click &quot;Generate More Topic Ideas&quot; above to
          get started.
        </p>
      ) : null}
    </div>
  );
}
