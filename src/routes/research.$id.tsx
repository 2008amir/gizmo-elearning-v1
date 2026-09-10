import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { Heart, Send, ArrowLeft, Loader2, Reply, Check } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* Scope <style> blocks from rendered research HTML so internal CSS doesn't leak into the site UI. */
function scopeCssRules(css: string, scope: string): string {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let i = 0;
  while (i < noComments.length) {
    if (noComments[i] === "@") {
      const semi = noComments.indexOf(";", i);
      const brace = noComments.indexOf("{", i);
      if (brace === -1 || (semi !== -1 && semi < brace)) {
        out += noComments.slice(i, semi + 1); i = semi + 1; continue;
      }
      let depth = 0, j = brace;
      for (; j < noComments.length; j++) {
        if (noComments[j] === "{") depth++;
        else if (noComments[j] === "}") { depth--; if (depth === 0) { j++; break; } }
      }
      out += noComments.slice(i, brace + 1) + scopeCssRules(noComments.slice(brace + 1, j - 1), scope) + "}";
      i = j; continue;
    }
    const brace = noComments.indexOf("{", i);
    if (brace === -1) break;
    const close = noComments.indexOf("}", brace);
    if (close === -1) break;
    const selectors = noComments.slice(i, brace);
    const body = noComments.slice(brace + 1, close);
    const scoped = selectors.split(",").map((s) => {
      const t = s.trim();
      if (!t) return "";
      if (t === "html" || t === "body" || t === "*") return scope;
      return `${scope} ${t}`;
    }).filter(Boolean).join(", ");
    out += `${scoped}{${body}}`;
    i = close + 1;
  }
  return out;
}
function splitContent(html: string): { styles: string[]; body: string } {
  const styles: string[] = [];
  const body = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => {
    styles.push(String(css)); return "";
  });
  return { styles, body };
}

/* Google Fonts used by the rich editor */
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "Roboto:wght@400;700","Open+Sans:wght@400;700","Lato:wght@400;700",
    "Montserrat:wght@400;700","Poppins:wght@400;700","Source+Sans+Pro:wght@400;700",
    "Nunito:wght@400;700","Raleway:wght@400;700","Merriweather:wght@400;700",
    "Playfair+Display:wght@400;700","Pacifico","Lobster","Dancing+Script:wght@400;700",
    "Great+Vibes","Satisfy","Caveat:wght@400;700","Shadows+Into+Light",
    "Permanent+Marker","Bangers","Press+Start+2P",
  ].map((f) => `family=${f}`).join("&") + "&display=swap";

function formatCommentDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startToday - startThat) / 86400000);
  if (days === 1) return "1 day ago";
  if (days > 1 && days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export const Route = createFileRoute("/research/$id")({
  component: () => <RequireAuth><ResearchDetail /></RequireAuth>,
  head: () => ({
    meta: [
      { title: "Research — Gizmo Office Plus" },
      { name: "description", content: "Read the full research write-up, comments and discussion on Gizmo Office Plus." },
      { property: "og:title", content: "Research — Gizmo Office Plus" },
      { property: "og:description", content: "Read the full research write-up, comments and discussion on Gizmo Office Plus." },
    ],
  }),
});

function extractPageStyles(contentHtml: string | null | undefined) {
  const html = contentHtml || "";
  const styleMatch = html.match(/^<[^>]+style="([^"]*)"/i);
  if (!styleMatch) return { pageBg: undefined, pageColor: undefined };
  const style = styleMatch[1];
  const bgColor = style.match(/background-color:\s*([^;]+)/i)?.[1];
  const bgImage = style.match(/background-image:\s*([^;]+)/i)?.[1];
  const bg = style.match(/background:\s*([^;]+)/i)?.[1];
  const color = style.match(/(?:^|;)\s*color:\s*([^;]+)/i)?.[1];
  return {
    pageBg: bg || bgImage || bgColor || undefined,
    pageColor: color || undefined,
  };
}

function ResearchDetail() {
  const { id } = Route.useParams();
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["research", id],
    queryFn: async () => {
      const { data: r, error } = await supabase.from("research").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return r;
    },
  });

  const { data: courseForBack } = useQuery({
    queryKey: ["research-back-course", data?.research_type],
    enabled: !!data?.research_type,
    queryFn: async () => (await supabase.from("courses" as never).select("id").eq("title", data!.research_type!).maybeSingle()).data as { id: string } | null,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ["likes", id],
    queryFn: async () => {
      const { data } = await supabase.from("likes").select("user_id").eq("research_id", id);
      return data ?? [];
    },
  });
  const liked = !!user && likes.some((l: any) => l.user_id === user.id);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, parent_id, comment_likes(user_id)")
        .eq("research_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = rows ?? [];
      const userIds = Array.from(new Set(list.map((c: any) => c.user_id))).filter(Boolean);
      let profilesById: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, first_name, last_name, avatar_url")
          .in("id", userIds);
        profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((c: any) => ({ ...c, profiles: profilesById[c.user_id] ?? null }));
    },
  });

  // Extract styles unconditionally (before any early returns)
  const { pageBg, pageColor } = useMemo(() => extractPageStyles(data?.content_html), [data?.content_html]);

  // Scope <style> blocks embedded in the content_html so they only apply inside the article.
  const scopeIdRef = useRef(`research-${id}`);
  const { styles: contentStyles, body: contentBody } = useMemo(
    () => splitContent(data?.content_html || ""),
    [data?.content_html],
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const tagId = `scoped-${scopeIdRef.current}`;
    let tag = document.getElementById(tagId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = tagId;
      document.head.appendChild(tag);
    }
    const scope = `.${scopeIdRef.current}`;
    tag.textContent = contentStyles.map((c) => scopeCssRules(c, scope)).join("\n");
    return () => { tag?.remove(); };
  }, [contentStyles]);

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await withSupabaseRetry(() => supabase.from("likes").delete().eq("user_id", user.id).eq("research_id", id), 5, { kind: "table", target: "likes", action: "delete research like" });
    } else {
      await withSupabaseRetry(() => supabase.from("likes").insert({ user_id: user.id, research_id: id }), 5, { kind: "table", target: "likes", action: "insert research like" });
    }
    qc.invalidateQueries({ queryKey: ["likes", id] });
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || !user) return;
    setSubmitting(true);
    const { error } = await withSupabaseRetry(() => supabase.from("comments").insert({ user_id: user.id, research_id: id, content: text }), 5, { kind: "table", target: "comments", action: "insert research comment" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  const submitReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text || !user) return;
    setReplySubmitting(true);
    const { error } = await withSupabaseRetry(
      () => supabase.from("comments").insert({ user_id: user.id, research_id: id, content: text, parent_id: parentId } as any),
      5,
      { kind: "table", target: "comments", action: "insert reply" },
    );
    setReplySubmitting(false);
    if (error) { toast.error(error.message); return; }
    setReplyText("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  const toggleCommentLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) return;
    if (currentlyLiked) {
      await withSupabaseRetry(() => supabase.from("comment_likes").delete().eq("user_id", user.id).eq("comment_id", commentId), 5, { kind: "table", target: "comment_likes", action: "delete comment like" });
    } else {
      await withSupabaseRetry(() => supabase.from("comment_likes").insert({ user_id: user.id, comment_id: commentId }), 5, { kind: "table", target: "comment_likes", action: "insert comment like" });
    }
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">Research not found</h2>
          <Link to="/dashboard" search={{}} className="mt-4 inline-block text-primary hover:underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }


  const textColor = pageColor || "#111827";

  return (
    <div
      className="min-h-screen relative"
      style={{ background: pageBg || "#ffffff", color: textColor }}
    >
      {/* Inject Google Fonts so editor fonts render in published view */}
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />

      {/* Back arrow – returns to the course dashboard */}
      {courseForBack?.id ? (
        <Link
          to="/course/$id"
          params={{ id: courseForBack.id }}
          className="sticky top-4 left-4 z-50 transition-opacity hover:opacity-70 drop-shadow-lg inline-block ml-4 mt-4"
          style={{ color: textColor }}
          aria-label="Back to course"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
      ) : (
        <Link
          to="/dashboard"
          className="sticky top-4 left-4 z-50 transition-opacity hover:opacity-70 drop-shadow-lg inline-block ml-4 mt-4"
          style={{ color: textColor }}
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
      )}


      {/* Research content – starts from the very top */}
      <article className="w-full overflow-hidden">
        <div
          className={cn("rich-editor-content rich-editor-light max-w-none w-full", scopeIdRef.current)}
          style={{ color: textColor, position: "relative" }}
          dangerouslySetInnerHTML={{ __html: contentBody || "" }}
        />
      </article>

      {/* Interaction & comments area – uses the normal site theme, not the research background */}
      <div className="bg-background text-foreground" style={{ color: "inherit" }}>
        <hr className="border-border" />
        <div className="max-w-3xl mx-auto px-4 pb-12 pt-6 text-foreground" style={{ color: "hsl(var(--foreground))" }}>
        {user && data && (
          <CompleteBar userId={user.id} researchId={id} researchType={data.research_type || "unknown"} />
        )}
        {/* Interaction bar */}
        <div className="mt-2 border border-border rounded-2xl p-4 bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLike}
              className={cn(
                "h-10 w-10 rounded-full border flex items-center justify-center transition-all shrink-0",
                liked ? "bg-red-50 border-red-400 text-red-500" : "border-border hover:bg-muted text-muted-foreground"
              )}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart className={cn("h-5 w-5", liked && "fill-current")} />
            </button>
            <span className="text-sm font-medium text-foreground/80">{likes.length}</span>

            <div className="flex-1 relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={1}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-12 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[42px] max-h-32 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={submitComment}
                disabled={submitting || !comment.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                aria-label="Send comment"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Comments */}
        <section className="mt-6 space-y-3 pb-8">
          <h2 className="text-sm font-semibold text-muted-foreground">{comments.length} Comments</h2>
          {(() => {
            const all = comments as any[];
            const repliesByParent: Record<string, any[]> = {};
            all.forEach((c) => {
              if (c.parent_id) {
                (repliesByParent[c.parent_id] ||= []).push(c);
              }
            });
            Object.values(repliesByParent).forEach((arr) =>
              arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
            );
            const topLevel = all.filter((c) => !c.parent_id);

            const renderCard = (c: any, isReply = false) => {
              const cliked = !!user && c.comment_likes?.some((l: any) => l.user_id === user.id);
              const fullName = `${c.profiles?.first_name ?? ""} ${c.profiles?.last_name ?? ""}`.trim() || c.profiles?.username || "User";
              const initials = ((c.profiles?.first_name?.[0] ?? "") + (c.profiles?.last_name?.[0] ?? "")).toUpperCase() || "U";
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className={cn("ring-1 ring-gray-200 shrink-0", isReply ? "h-8 w-8" : "h-10 w-10")}>
                      <AvatarImage src={c.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{fullName}</div>
                      <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground/80">{c.content}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatCommentDate(c.created_at)}</span>
                        {isAdmin && !isReply && (
                          <button
                            type="button"
                            onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Reply className="h-3.5 w-3.5" /> Reply
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <button
                        onClick={() => toggleCommentLike(c.id, cliked)}
                        className={cn(
                          "h-8 w-8 rounded-full border flex items-center justify-center transition",
                          cliked ? "bg-red-50 border-red-400 text-red-500" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                        aria-label={cliked ? "Unlike comment" : "Like comment"}
                      >
                        <Heart className={cn("h-4 w-4", cliked && "fill-current")} />
                      </button>
                      <span className="text-xs text-muted-foreground mt-1">{c.comment_likes?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            };

            return topLevel.map((c) => {
              const replies = repliesByParent[c.id] ?? [];
              return (
                <div key={c.id} className="space-y-2">
                  {renderCard(c)}
                  {(replies.length > 0 || replyTo === c.id) && (
                    <div className="pl-4 border-l-2 border-border space-y-2">
                      {replies.map((r) => renderCard(r, true))}
                      {replyTo === c.id && (
                        <div className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center gap-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              rows={1}
                              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px] max-h-32 text-foreground"
                            />
                            <button
                              onClick={() => submitReply(c.id)}
                              disabled={replySubmitting || !replyText.trim()}
                              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shrink-0"
                              aria-label="Send reply"
                            >
                              {replySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Be the first to comment!</p>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

function CompleteBar({ userId, researchId, researchType }: { userId: string; researchId: string; researchType: string }) {
  const qc = useQueryClient();
  const { data: done } = useQuery({
    queryKey: ["research-progress", userId, researchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("research_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("research_id", researchId)
        .maybeSingle();
      return !!data;
    },
  });
  const [busy, setBusy] = useState(false);
  const mark = async () => {
    setBusy(true);
    // Optimistic: mark done + bump course progress immediately
    qc.setQueryData(["research-progress", userId, researchId], true);
    qc.setQueriesData<{ research_id: string }[] | undefined>({ queryKey: ["progress-course"] }, (prev) => {
      if (!prev) return prev;
      if (prev.some((p) => p.research_id === researchId)) return prev;
      return [...prev, { research_id: researchId }];
    });
    const { error } = await supabase
      .from("research_progress")
      .insert({ user_id: userId, research_id: researchId, research_type: researchType });
    setBusy(false);
    if (error) {
      // rollback
      qc.invalidateQueries({ queryKey: ["research-progress", userId, researchId] });
      qc.invalidateQueries({ queryKey: ["progress-course"] });
      toast.error(error.message);
      return;
    }
    toast.success("Lesson completed — progress updated");
    qc.invalidateQueries({ queryKey: ["research-progress"] });
    qc.invalidateQueries({ queryKey: ["research-locks"] });
    qc.invalidateQueries({ queryKey: ["progress-course"] });
  };
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
      <div className="text-sm">
        {done ? (
          <span className="inline-flex items-center gap-2 text-primary font-medium"><Check className="h-4 w-4" /> You've completed this research.</span>
        ) : (
          <span className="text-foreground/80">Finished reading? Mark it complete to unlock the next research in this section.</span>
        )}
      </div>
      {!done && (
        <Button onClick={mark} disabled={busy} className="gradient-bg text-primary-foreground shrink-0">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Mark as complete
        </Button>
      )}
    </div>
  );
}

