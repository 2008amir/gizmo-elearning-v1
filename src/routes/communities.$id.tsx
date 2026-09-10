import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, Paperclip, Mic, StopCircle, Users, Crown, Copy, Check, Trash2, LogOut, UserCheck, UserX, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/communities/$id")({
  component: CommunityDetail,
  head: () => ({ meta: [{ title: "Community — Gizmo Office Plus" }] }),
});

type Community = { id: string; owner_id: string; name: string; description: string | null; image_url: string | null; invite_code: string; allow_open_join: boolean; member_count: number };
type Message = { id: string; community_id: string; user_id: string; content: string | null; attachment_url: string | null; attachment_type: "image" | "file" | "voice" | null; attachment_name: string | null; duration_seconds: number | null; created_at: string };
type Member = { user_id: string; role: string; joined_at: string; profile?: { first_name: string; last_name: string; username: string; avatar_url: string | null } };
type ReqRow = { id: string; user_id: string; status: string; created_at: string; profile?: { first_name: string; last_name: string; username: string; avatar_url: string | null } };

function CommunityDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const { data: community, isLoading: cLoading } = useQuery({
    queryKey: ["community", id],
    queryFn: async () => (await supabase.from("communities" as never).select("*").eq("id", id).maybeSingle()).data as unknown as Community | null,
  });

  const { data: membership } = useQuery({
    queryKey: ["community-membership", id, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("community_members" as never).select("role").eq("community_id", id).eq("user_id", user!.id).maybeSingle()).data as unknown as { role: string } | null,
  });

  const isOwner = !!community && !!user && community.owner_id === user.id;
  const isMember = !!membership;

  const { data: messages = [] } = useQuery({
    queryKey: ["community-messages", id],
    enabled: isMember,
    queryFn: async () => (await supabase.from("community_messages" as never).select("*").eq("community_id", id).order("created_at", { ascending: true }).limit(500)).data as unknown as Message[] ?? [],
  });

  const { data: members = [] } = useQuery({
    queryKey: ["community-members", id],
    enabled: isMember,
    queryFn: async () => {
      const { data } = await supabase.from("community_members" as never).select("user_id, role, joined_at").eq("community_id", id);
      const rows = (data as unknown as Member[]) ?? [];
      if (rows.length === 0) return rows;
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, username, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) as any }));
    },
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["community-requests", id],
    enabled: isOwner,
    queryFn: async () => {
      const { data } = await supabase.from("community_join_requests" as never).select("id, user_id, status, created_at").eq("community_id", id).eq("status", "pending").order("created_at", { ascending: false });
      const rows = (data as unknown as ReqRow[]) ?? [];
      if (rows.length === 0) return rows;
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, username, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) as any }));
    },
  });

  const profileById = new Map(members.map((m) => [m.user_id, m.profile]));

  // Realtime for messages + requests + members
  useEffect(() => {
    if (!isMember) return;
    const ch = supabase.channel(`community-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["community-messages", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_members", filter: `community_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["community-members", id] });
        qc.invalidateQueries({ queryKey: ["community", id] });
        qc.invalidateQueries({ queryKey: ["community-membership", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_join_requests", filter: `community_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["community-requests", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, isMember, qc]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (payload: Partial<Message>) => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("community_messages" as never).insert({
      community_id: id, user_id: user.id,
      content: payload.content ?? null,
      attachment_url: payload.attachment_url ?? null,
      attachment_type: payload.attachment_type ?? null,
      attachment_name: payload.attachment_name ?? null,
      duration_seconds: payload.duration_seconds ?? null,
    } as never);
    setSending(false);
    if (error) { toast.error(error.message); return; }
  };

  const sendText = async () => {
    const t = text.trim(); if (!t) return;
    setText("");
    await send({ content: t });
  };

  const uploadAndSend = async (file: File, kind: "image" | "file" | "voice", durationSeconds?: number) => {
    if (!user) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${id}/${user.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("community-media").upload(path, file, { contentType: file.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("community-media").createSignedUrl(path, 60 * 60 * 24 * 365);
    setUploading(false);
    await send({ attachment_url: signed?.signedUrl ?? "", attachment_type: kind, attachment_name: file.name, duration_seconds: durationSeconds });
  };

  const onPickFile = async (f: File) => {
    const kind: "image" | "file" = f.type.startsWith("image/") ? "image" : "file";
    await uploadAndSend(f, kind);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const seconds = recordSeconds;
        setRecordSeconds(0);
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        await uploadAndSend(file, "voice", seconds);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      toast.error(e?.message ?? "Microphone permission denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null as any;
      try { recorderRef.current.stop(); } catch {}
    }
    setRecording(false);
    setRecordSeconds(0);
    if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const copyInvite = async () => {
    if (!community) return;
    const link = `${window.location.origin}/communities/join/${community.invite_code}`;
    try { await navigator.clipboard.writeText(link); setInviteCopied(true); toast.success("Invite link copied"); setTimeout(() => setInviteCopied(false), 1800); }
    catch { toast.error("Could not copy"); }
  };

  const decide = async (reqId: string, approve: boolean) => {
    const { error } = await supabase.rpc("decide_join_request" as never, { _request_id: reqId, _approve: approve } as never);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Approved" : "Rejected");
  };

  const removeMember = async (uid: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("community_members" as never).delete().eq("community_id", id).eq("user_id", uid);
    if (error) toast.error(error.message);
  };

  const leave = async () => {
    if (!user) return;
    if (!confirm("Leave this community?")) return;
    const { error } = await supabase.from("community_members" as never).delete().eq("community_id", id).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Left community");
    navigate({ to: "/communities" });
  };

  const deleteCommunity = async () => {
    if (!isOwner) return;
    if (!confirm("Delete this community? This cannot be undone.")) return;
    const { error } = await supabase.from("communities" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Community deleted");
    navigate({ to: "/communities" });
  };

  if (cLoading) return <AppShell title="Community"><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>;
  if (!community) return <AppShell title="Community"><div className="p-6 text-sm text-muted-foreground">Community not found. <Link to="/communities" className="text-primary underline">Back</Link></div></AppShell>;

  if (!isMember) {
    return (
      <AppShell title={community.name}>
        <div className="p-6 max-w-md mx-auto text-center space-y-3">
          <MemberAvatar url={community.image_url} name={community.name} size={80} />
          <h1 className="text-2xl font-bold">{community.name}</h1>
          <p className="text-sm text-muted-foreground">{community.description}</p>
          <p className="text-sm text-muted-foreground">You are not a member of this community.</p>
          <Button onClick={() => navigate({ to: "/communities" })}>Back to communities</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={community.name} standalone onBack={() => navigate({ to: "/communities" })}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <MemberAvatar url={community.image_url} name={community.name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate flex items-center gap-1.5">
              {community.name}
              {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
            </div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" /> {community.member_count} members</div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" title="Members & settings"><Users className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader><SheetTitle>{community.name}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="glass rounded-xl p-3">
                  <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> Invite link</div>
                  <div className="flex gap-2">
                    <Input readOnly value={`${window.location.origin}/communities/join/${community.invite_code}`} className="text-xs" />
                    <Button size="icon" variant="outline" onClick={copyInvite}>{inviteCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</Button>
                  </div>
                </div>

                {isOwner && pendingRequests.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2">Pending requests ({pendingRequests.length})</div>
                    <div className="space-y-2">
                      {pendingRequests.map((r) => (
                        <div key={r.id} className="glass rounded-lg p-2.5 flex items-center gap-2">
                          <MemberAvatar url={r.profile?.avatar_url} name={`${r.profile?.first_name ?? "U"}`} size={32} />
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="font-medium truncate">{r.profile?.first_name} {r.profile?.last_name}</div>
                            <div className="text-xs text-muted-foreground truncate">@{r.profile?.username}</div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => decide(r.id, true)} className="text-emerald-500"><UserCheck className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => decide(r.id, false)} className="text-destructive"><UserX className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold mb-2">Members ({members.length})</div>
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40">
                        <MemberAvatar url={m.profile?.avatar_url} name={m.profile?.first_name ?? "?"} size={32} />
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="font-medium truncate flex items-center gap-1">{m.profile?.first_name} {m.profile?.last_name}{m.role === "owner" && <Crown className="h-3 w-3 text-amber-500" />}</div>
                          <div className="text-xs text-muted-foreground truncate">@{m.profile?.username}</div>
                        </div>
                        {isOwner && m.role !== "owner" && (
                          <Button size="icon" variant="ghost" onClick={() => removeMember(m.user_id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  {isOwner ? (
                    <Button variant="destructive" onClick={deleteCommunity} className="w-full"><Trash2 className="h-4 w-4 mr-2" /> Delete community</Button>
                  ) : (
                    <Button variant="outline" onClick={leave} className="w-full"><LogOut className="h-4 w-4 mr-2" /> Leave community</Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">No messages yet. Say hi 👋</div>
          ) : messages.map((m) => (
            <MessageBubble key={m.id} m={m} isSelf={m.user_id === user?.id} profile={profileById.get(m.user_id)} />
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3 bg-background">
          {recording ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 glass rounded-full px-4 py-2.5 inline-flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono">{String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:{String(recordSeconds % 60).padStart(2, "0")}</span>
                <span className="text-muted-foreground">Recording…</span>
              </div>
              <Button variant="outline" onClick={cancelRecording}>Cancel</Button>
              <Button onClick={stopRecording} className="gradient-bg text-primary-foreground"><StopCircle className="h-4 w-4 mr-1" /> Send</Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <label className="cursor-pointer">
                <div className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </div>
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])} />
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none bg-muted/40 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary max-h-28"
              />
              {text.trim() ? (
                <Button onClick={sendText} disabled={sending} size="icon" className="rounded-full gradient-bg text-primary-foreground"><Send className="h-4 w-4" /></Button>
              ) : (
                <Button onClick={startRecording} size="icon" className="rounded-full gradient-bg text-primary-foreground"><Mic className="h-4 w-4" /></Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MemberAvatar({ url, name, size = 40 }: { url: string | null | undefined; name: string; size?: number }) {
  const s = { height: size, width: size };
  if (url) return <img src={url} alt={name} style={s} className="rounded-full object-cover shrink-0" />;
  return <div style={s} className="rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold shrink-0 text-sm">{name[0]?.toUpperCase() ?? "?"}</div>;
}

function MessageBubble({ m, isSelf, profile }: { m: Message; isSelf: boolean; profile: Member["profile"] | undefined }) {
  const time = format(new Date(m.created_at), "p");
  return (
    <div className={cn("flex gap-2 max-w-full", isSelf ? "justify-end" : "justify-start")}>
      {!isSelf && <MemberAvatar url={profile?.avatar_url} name={profile?.first_name ?? "?"} size={32} />}
      <div className={cn("max-w-[75%] rounded-2xl px-3 py-2", isSelf ? "gradient-bg text-primary-foreground rounded-br-sm" : "glass rounded-bl-sm")}>
        {!isSelf && <div className="text-[10px] font-semibold opacity-80 mb-0.5">{profile?.first_name} {profile?.last_name}</div>}
        {m.attachment_url && m.attachment_type === "image" && (
          <a href={m.attachment_url} target="_blank" rel="noreferrer">
            <img src={m.attachment_url} alt={m.attachment_name ?? "image"} className="rounded-lg max-h-64 object-cover" />
          </a>
        )}
        {m.attachment_url && m.attachment_type === "voice" && (
          <audio controls src={m.attachment_url} className="max-w-full min-w-[220px]" />
        )}
        {m.attachment_url && m.attachment_type === "file" && (
          <a href={m.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
            <Paperclip className="h-4 w-4" /> {m.attachment_name ?? "Attachment"}
          </a>
        )}
        {m.content && <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>}
        <div className={cn("text-[10px] mt-0.5", isSelf ? "text-primary-foreground/70" : "text-muted-foreground")}>{time}</div>
      </div>
    </div>
  );
}
