import { getStorageUrl } from "@/lib/storage-url";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline as UnderlineIcon, Type, Palette, Upload, X, Check, Image as ImageIcon, Loader2, Plus, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCw, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Square, IndentIncrease, IndentDecrease, PaintBucket, BoxSelect, Undo2, Redo2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { uploadWithSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";

type Props = {
  initialHtml: string;
  onCancel: () => void;
  onDone: (html: string) => void;
};

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96];

// CSS selector for elements that are likely text content (not pure containers)
const TEXT_TAGS = "h1,h2,h3,h4,h5,h6,p,span,a,blockquote,li,td,th,figcaption,strong,em,small,label,button";

export function TemplateInlineEditor({ initialHtml, onCancel, onDone }: Props) {
  const { user } = useAuth();
  const stageRef = useRef<HTMLDivElement>(null);
  const [textToolbar, setTextToolbar] = useState<{ left: number; top: number; el: HTMLElement } | null>(null);
  const [mediaToolbar, setMediaToolbar] = useState<{ left: number; top: number; el: HTMLElement } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingEls, setUploadingEls] = useState<HTMLElement[]>([]);
  const [overlayTick, setOverlayTick] = useState(0);
  const replaceImgRef = useRef<HTMLInputElement>(null);
  const replaceVidRef = useRef<HTMLInputElement>(null);
  const insertImgRef = useRef<HTMLInputElement>(null);
  const insertVidRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const historyTimerRef = useRef<number | null>(null);
  const isRestoringRef = useRef(false);

  const cleanEditorChrome = (root: HTMLElement) => {
    root.querySelectorAll<HTMLElement>("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      if (/dashed|hsl\(var\(--primary\)\)/i.test(el.style.outline)) el.style.outline = "";
    });
    root.querySelectorAll<HTMLElement>(".tpl-container").forEach((container) => {
      const wasSelected = container.dataset.selected === "1";
      container.removeAttribute("data-selected");
      const borderInfo = `${container.style.borderStyle} ${container.style.border}`;
      if (/dashed|dotted/i.test(borderInfo)) {
        container.style.border = "none";
      }
      if (wasSelected || /0\.5pc|hsl\(var\(--primary\)\)/i.test(container.style.outline)) {
        container.style.outline = "";
        container.style.outlineOffset = "";
      }
    });
  };

  const getStageHtml = useCallback(() => {
    if (!stageRef.current) return "";
    const clone = stageRef.current.cloneNode(true) as HTMLElement;
    cleanEditorChrome(clone);
    return clone.innerHTML;
  }, []);

  const pushHistory = useCallback(() => {
    const html = getStageHtml();
    if (!html || isRestoringRef.current) return;
    if (historyRef.current[historyIndexRef.current] === html) return;
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(html);
    historyRef.current = next.slice(-80);
    historyIndexRef.current = historyRef.current.length - 1;
  }, [getStageHtml]);

  const scheduleHistoryPush = useCallback(() => {
    if (isRestoringRef.current) return;
    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      pushHistory();
    }, 350);
  }, [pushHistory]);

  const restoreHistory = useCallback((step: -1 | 1) => {
    if (!stageRef.current) return;
    if (step === -1) pushHistory();
    const nextIndex = historyIndexRef.current + step;
    const html = historyRef.current[nextIndex];
    if (html === undefined) return;
    isRestoringRef.current = true;
    stageRef.current.innerHTML = html;
    cleanEditorChrome(stageRef.current);
    historyIndexRef.current = nextIndex;
    setTextToolbar(null);
    setMediaToolbar(null);
    isRestoringRef.current = false;
  }, [pushHistory]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => () => {
    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
  }, []);

  // Inject the template HTML once (guard against re-injection clobbering in-progress uploads)
  const injectedRef = useRef(false);
  useEffect(() => {
    if (!stageRef.current || injectedRef.current) return;
    stageRef.current.innerHTML = initialHtml;
    cleanEditorChrome(stageRef.current);
    injectedRef.current = true;
    pushHistory();
  }, [initialHtml, pushHistory]);

  const clearContainerSelection = useCallback(() => {
    if (!stageRef.current) return;
    stageRef.current.querySelectorAll<HTMLElement>(".tpl-container").forEach((c) => {
      c.removeAttribute("data-selected");
      c.style.outline = "";
      c.style.outlineOffset = "";
    });
  }, []);

  const closeToolbars = useCallback(() => {
    if (textToolbar) {
      textToolbar.el.removeAttribute("contenteditable");
      textToolbar.el.style.outline = "";
    }
    clearContainerSelection();
    setTextToolbar(null);
    setMediaToolbar(null);
  }, [textToolbar, clearContainerSelection]);

  const positionToolbarFor = (el: HTMLElement): { left: number; top: number } => {
    const rect = el.getBoundingClientRect();
    const top = Math.max(60, rect.top - 50);
    const left = Math.min(window.innerWidth - 320, Math.max(8, rect.left));
    return { left, top };
  };

  const selectContainer = (container: HTMLElement) => {
    clearContainerSelection();
    container.dataset.selected = "1";
    container.style.outline = "0.5pc solid #000";
    container.style.outlineOffset = "0";
  };

  const handleStageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !stageRef.current?.contains(target)) return;

    // Image / video / iframe (takes priority even inside a container)
    const media = target.closest("img, video, iframe") as HTMLElement | null;
    if (media) {
      e.preventDefault();
      e.stopPropagation();
      closeToolbars();
      setMediaToolbar({ ...positionToolbarFor(media), el: media });
      return;
    }

    // Container clicks: click on the container's own frame (border/padding, not a child) -> select + show toolbar.
    // Click on a text child inside a selected container -> text edit.
    const container = target.closest(".tpl-container") as HTMLElement | null;
    const directContainerHit = container && target === container;
    if (container) {
      if (directContainerHit) {
        e.preventDefault();
        e.stopPropagation();
        if (textToolbar) {
          textToolbar.el.removeAttribute("contenteditable");
          textToolbar.el.style.outline = "";
        }
        setTextToolbar(null);
        selectContainer(container);
        setMediaToolbar({ ...positionToolbarFor(container), el: container });
        return;
      }
      // Otherwise fall through so inner text elements enter edit mode like a textarea.
    }

    // Text element
    const textEl = target.closest(TEXT_TAGS) as HTMLElement | null;
    if (textEl && stageRef.current.contains(textEl)) {
      e.preventDefault();
      e.stopPropagation();
      // Close any previous text edit
      if (textToolbar && textToolbar.el !== textEl) {
        textToolbar.el.removeAttribute("contenteditable");
        textToolbar.el.style.outline = "";
      }
      // Keep container selection outline if the text is inside one, but hide media toolbar
      textEl.setAttribute("contenteditable", "true");
      textEl.style.outline = "2px dashed hsl(var(--primary))";
      textEl.focus();
      setMediaToolbar(null);
      setTextToolbar({ ...positionToolbarFor(textEl), el: textEl });
    }
  };

  // ---- Media transform helpers (nudge / rotate / align) ----
  const bumpToolbar = (el: HTMLElement) => setMediaToolbar({ ...positionToolbarFor(el), el });
  const nudgeMedia = (dx: number, dy: number) => {
    const el = mediaToolbar?.el; if (!el) return;
    el.style.position = el.style.position || "relative";
    const l = parseFloat(el.style.left) || 0;
    const t = parseFloat(el.style.top) || 0;
    el.style.left = `${l + dx}px`;
    el.style.top = `${t + dy}px`;
    bumpToolbar(el);
    pushHistory();
  };
  const rotateMedia = (deg: number) => {
    const el = mediaToolbar?.el; if (!el) return;
    const cur = parseFloat(el.dataset.rot || "0") || 0;
    const next = cur + deg;
    el.dataset.rot = String(next);
    el.style.transform = `rotate(${next}deg)`;
    bumpToolbar(el);
    pushHistory();
  };
  const alignMedia = (dir: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const el = mediaToolbar?.el; if (!el) return;
    const isContainer = el.classList.contains("tpl-container");
    if (dir === "top" || dir === "middle" || dir === "bottom") {
      const jc = dir === "top" ? "flex-start" : dir === "middle" ? "center" : "flex-end";
      if (isContainer) {
        // Vertically align the container's own children within itself.
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = jc;
        el.style.alignItems = "stretch";
        if (!el.style.minHeight) el.style.minHeight = "180px";
      } else {
        // Vertically align this media element within its parent container.
        const parent = el.parentElement as HTMLElement | null;
        if (parent) {
          parent.style.display = "flex";
          parent.style.flexDirection = "column";
          parent.style.justifyContent = jc;
          if (!parent.style.minHeight) parent.style.minHeight = "220px";
        }
      }
      bumpToolbar(el);
      pushHistory();
      return;
    }
    if (isContainer) {
      // Horizontal text alignment stays separate from vertical flex alignment.
      el.style.textAlign = dir;
      el.style.alignItems = "stretch";
      el.querySelectorAll<HTMLElement>("img, video, iframe").forEach((child) => {
        child.style.display = "block";
        if (dir === "left") { child.style.marginLeft = "0"; child.style.marginRight = "auto"; }
        if (dir === "right") { child.style.marginLeft = "auto"; child.style.marginRight = "0"; }
        if (dir === "center") { child.style.marginLeft = "auto"; child.style.marginRight = "auto"; }
      });
    } else {
      // Media element: align within its parent when parent is flex, else use auto margins.
      const parent = el.parentElement as HTMLElement | null;
      if (parent && window.getComputedStyle(parent).display === "flex") {
        parent.style.alignItems = dir === "left" ? "flex-start" : dir === "right" ? "flex-end" : "center";
      } else {
        el.style.display = "block";
        if (dir === "left") { el.style.marginLeft = "0"; el.style.marginRight = "auto"; }
        if (dir === "right") { el.style.marginLeft = "auto"; el.style.marginRight = "0"; }
        if (dir === "center") { el.style.marginLeft = "auto"; el.style.marginRight = "auto"; }
      }
    }
    bumpToolbar(el);
    pushHistory();
  };
  const setTextAlign = (dir: "left" | "center" | "right" | "justify" | "top" | "middle" | "bottom") => {
    if (!textToolbar) return;
    const el = textToolbar.el;
    if (dir === "top" || dir === "middle" || dir === "bottom") {
      const jc = dir === "top" ? "flex-start" : dir === "middle" ? "center" : "flex-end";
      // Vertically align this text block inside its parent (container) so it moves within the container.
      const parent = el.parentElement as HTMLElement | null;
      if (parent && parent.classList.contains("tpl-container")) {
        parent.style.display = "flex";
        parent.style.flexDirection = "column";
        parent.style.justifyContent = jc;
        parent.style.alignItems = "stretch";
        el.style.alignSelf = "stretch";
        el.style.width = "100%";
        if (!parent.style.minHeight) parent.style.minHeight = "220px";
      } else {
        // Fallback: give the element itself a min-height and flex layout so content shifts inside it.
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.justifyContent = jc;
        if (!el.style.minHeight) el.style.minHeight = "120px";
      }
      pushHistory();
      return;
    }
    el.style.textAlign = dir;
    const parent = el.parentElement as HTMLElement | null;
    if (parent && parent.classList.contains("tpl-container")) {
      parent.style.alignItems = "stretch";
      el.style.alignSelf = "stretch";
      el.style.width = "100%";
    }
    pushHistory();
  };

  const setTextBackground = (color: string) => {
    if (!textToolbar) return;
    textToolbar.el.style.backgroundColor = color;
    pushHistory();
  };
  const setTextBorder = (color: string) => {
    if (!textToolbar) return;
    if (!textToolbar.el.style.borderStyle) textToolbar.el.style.borderStyle = "solid";
    if (!textToolbar.el.style.borderWidth) textToolbar.el.style.borderWidth = "1px";
    textToolbar.el.style.borderColor = color;
    pushHistory();
  };

  const setContainerBackground = (color: string) => {
    if (!mediaToolbar) return;
    mediaToolbar.el.style.backgroundColor = color;
    pushHistory();
  };
  const setContainerBorder = (color: string) => {
    if (!mediaToolbar) return;
    const el = mediaToolbar.el;
    if (!el.style.borderStyle || el.style.borderStyle === "none") el.style.borderStyle = "solid";
    if (!el.style.borderWidth || el.style.borderWidth === "0px") el.style.borderWidth = "1px";
    el.style.borderColor = color;
    pushHistory();
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    window.setTimeout(pushHistory, 0);
  };

  const setFontSize = (px: number) => {
    if (!textToolbar) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && textToolbar.el.contains(sel.anchorNode)) {
      // Wrap selection in span with font-size
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      } catch { /* ignore */ }
    } else {
      // Apply to whole element
      textToolbar.el.style.fontSize = `${px}px`;
    }
    pushHistory();
  };

  const setColor = (color: string) => {
    if (!textToolbar) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && textToolbar.el.contains(sel.anchorNode)) {
      exec("foreColor", color);
    } else {
      textToolbar.el.style.color = color;
    }
    pushHistory();
  };

  // Track uploading elements and reposition their overlays every frame.
  useEffect(() => {
    if (uploadingEls.length === 0) return;
    let raf = 0;
    const loop = () => {
      setOverlayTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [uploadingEls.length]);

  const markUploading = (el: HTMLElement) => {
    el.setAttribute("data-uploading", "1");
    el.style.opacity = "0.55";
    setUploadingEls((prev) => (prev.includes(el) ? prev : [...prev, el]));
  };
  const unmarkUploading = (el: HTMLElement) => {
    el.removeAttribute("data-uploading");
    el.style.opacity = "";
    setUploadingEls((prev) => prev.filter((x) => x !== el));
  };

  const uploadInBackground = async (
    el: HTMLImageElement | HTMLVideoElement,
    file: File,
    kind: "image" | "video",
  ) => {
    if (!user) { toast.error("Sign in required"); unmarkUploading(el); return; }
    const max = kind === "image" ? 10 : 100;
    if (file.size > max * 1024 * 1024) {
      toast.error(`Max ${max}MB`);
      unmarkUploading(el);
      return;
    }
    const ext = file.name.split(".").pop() || (kind === "image" ? "png" : "mp4");
    const path = `${user.id}/${kind}/${Date.now()}.${ext}`;
    setUploading(true);
    try {
      const { error } = await uploadWithSupabaseRetry("research-media", path, file, { contentType: file.type }, 6);
      if (error) {
        toast.error(error.message || "Upload failed");
        unmarkUploading(el);
        return;
      }
      const url = await getStorageUrl("research-media", path);
      if (!url) { toast.error("Could not get URL"); unmarkUploading(el); return; }
      const oldSrc = el.getAttribute("src");
      el.setAttribute("src", url);
      if (oldSrc && oldSrc.startsWith("blob:")) URL.revokeObjectURL(oldSrc);
      pushHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      unmarkUploading(el);
    }
  };

  const onReplaceImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !mediaToolbar) return;
    const blob = URL.createObjectURL(f);
    let img: HTMLImageElement;
    if (mediaToolbar.el.tagName === "IMG") {
      img = mediaToolbar.el as HTMLImageElement;
      img.src = blob;
    } else {
      img = document.createElement("img");
      img.src = blob;
      img.style.cssText = mediaToolbar.el.getAttribute("style") || "max-width:100%;height:auto;";
      mediaToolbar.el.replaceWith(img);
    }
    markUploading(img);
    setMediaToolbar({ ...positionToolbarFor(img), el: img });
    pushHistory();
    void uploadInBackground(img, f, "image");
  };

  const onReplaceVid = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !mediaToolbar) return;
    const blob = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.src = blob;
    video.controls = true;
    video.style.cssText = mediaToolbar.el.getAttribute("style") || "max-width:100%;height:auto;";
    mediaToolbar.el.replaceWith(video);
    markUploading(video);
    setMediaToolbar({ ...positionToolbarFor(video), el: video });
    pushHistory();
    void uploadInBackground(video, f, "video");
  };

  // Where to append newly-inserted content: into the active container (if any), else the stage
  const activeParent = (): HTMLElement | null => {
    const t = mediaToolbar?.el;
    if (t && t.classList.contains("tpl-container")) return t;
    return stageRef.current;
  };

  const insertNewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const blob = URL.createObjectURL(f);
    const img = document.createElement("img");
    img.src = blob;
    img.style.cssText = "max-width:100%;height:auto;display:block;margin:1rem auto;";
    activeParent()?.appendChild(img);
    markUploading(img);
    pushHistory();
    void uploadInBackground(img, f, "image");
  };
  const insertNewVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const blob = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.src = blob;
    video.controls = true;
    video.style.cssText = "max-width:100%;height:auto;display:block;margin:1rem auto;";
    activeParent()?.appendChild(video);
    markUploading(video);
    pushHistory();
    void uploadInBackground(video, f, "video");
  };
  const insertNewTextBox = () => {
    const box = document.createElement("p");
    box.textContent = "New text — click to edit";
    box.style.cssText = "margin:1rem auto;max-width:800px;font:inherit;color:#000;";
    activeParent()?.appendChild(box);
    pushHistory();
    toast.success("Text box added");
  };
  const insertNewContainer = () => {
    const div = document.createElement("div");
    div.className = "tpl-container";
    div.style.cssText = "min-height:120px;padding:1.25rem;margin:1rem auto;max-width:800px;border:none;border-radius:8px;position:relative;";
    div.setAttribute("data-empty-label", "Container — click to add text, image, video");
    stageRef.current?.appendChild(div);
    pushHistory();
    toast.success("Container added");
  };

  // Media size controls (percentage-based)
  const parsePct = (v: string | null): string => {
    if (!v) return "";
    const m = String(v).match(/([\d.]+)\s*%/);
    return m ? m[1] : "";
  };
  const currentMediaSize = (() => {
    const el = mediaToolbar?.el;
    if (!el) return { w: "", h: "", r: "" };
    return {
      w: parsePct(el.style.width) || "",
      h: parsePct(el.style.height) || "",
      r: parsePct(el.style.borderRadius) || "",
    };
  })();
  const applyMediaSize = (key: "w" | "h" | "r", value: string) => {
    const el = mediaToolbar?.el;
    if (!el) return;
    const clean = value.replace(/[^\d.]/g, "");
    if (key === "w") el.style.width = clean ? `${clean}%` : "";
    if (key === "h") el.style.height = clean ? `${clean}%` : "";
    if (key === "r") el.style.borderRadius = clean ? `${clean}%` : "";
    // trigger re-render to update input display
    setMediaToolbar({ ...mediaToolbar!, el });
    pushHistory();
  };

  const handleDone = () => {
    if (textToolbar) {
      textToolbar.el.removeAttribute("contenteditable");
      textToolbar.el.style.outline = "";
    }
    const html = getStageHtml();
    clearContainerSelection();
    onDone(html);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] bg-background flex flex-col">
      {/* Top bar with Done & Cancel */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-background">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm font-semibold gradient-text">Editing template</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => restoreHistory(-1)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50" title="Undo">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button onClick={() => restoreHistory(1)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50" title="Redo">
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </button>
          <button onClick={insertNewTextBox} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <Plus className="h-3.5 w-3.5" /> Text
          </button>
          <button onClick={() => insertImgRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <ImageIcon className="h-3.5 w-3.5" /> Image
          </button>
          <input ref={insertImgRef} type="file" accept="image/*" className="hidden" onChange={insertNewImage} />
          <button onClick={() => insertVidRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            Video
          </button>
          <input ref={insertVidRef} type="file" accept="video/*" className="hidden" onChange={insertNewVideo} />
          <button onClick={insertNewContainer} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <Square className="h-3.5 w-3.5" /> Container
          </button>
          <button onClick={onCancel} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted/50">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button onClick={handleDone} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium gradient-bg text-primary-foreground hover:opacity-90">
            <Check className="h-3.5 w-3.5" /> Done
          </button>
        </div>
      </div>

      {/* The template stage — like a website */}
      <div className="flex-1 overflow-auto bg-white">
        <div
          ref={stageRef}
          className="template-inline-stage w-full"
          onClick={handleStageClick}
          onInput={scheduleHistoryPush}
        />
      </div>

      {/* Loading overlays for currently-uploading media (position tracked, no DOM mutation) */}
      {uploadingEls.map((el, i) => {
        if (!document.body.contains(el)) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return null;
        return (
          <div
            key={`ul-${i}-${overlayTick % 2}`}
            className="fixed pointer-events-none flex items-center justify-center"
            style={{
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
              background: "rgba(0,0,0,0.35)",
              borderRadius: "inherit",
              zIndex: 2147483601,
            }}
          >
            <Loader2 className="h-10 w-10 text-white animate-spin" strokeWidth={3} />
          </div>
        );
      })}

      {/* Floating text toolbar */}
      {textToolbar && (
        <div
          className="fixed z-[2147483601] flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-xl"
          style={{ left: textToolbar.left, top: textToolbar.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-muted/50" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-muted/50" title="Italic"><Italic className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-muted/50" title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <Type className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <select
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-7 rounded border border-border bg-background px-1 text-xs"
            defaultValue=""
          >
            <option value="" disabled>Size</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
          <div className="w-px h-5 bg-border mx-1" />
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="color"
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
            title="Text color"
          />
          <div className="w-px h-5 bg-border mx-1" />
          <PaintBucket className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="color"
            onChange={(e) => setTextBackground(e.target.value)}
            className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
            title="Background color"
          />
          <BoxSelect className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="color"
            onChange={(e) => setTextBorder(e.target.value)}
            className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
            title="Border color"
          />
          <div className="w-px h-5 bg-border mx-1" />
          {/* Text alignment */}
          <button onClick={() => setTextAlign("left")} className="p-1.5 rounded hover:bg-muted/50" title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => setTextAlign("center")} className="p-1.5 rounded hover:bg-muted/50" title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
          <button onClick={() => setTextAlign("right")} className="p-1.5 rounded hover:bg-muted/50" title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => setTextAlign("top")} className="p-1.5 rounded hover:bg-muted/50" title="Align top"><AlignStartVertical className="h-3.5 w-3.5" /></button>
          <button onClick={() => setTextAlign("middle")} className="p-1.5 rounded hover:bg-muted/50" title="Align middle"><AlignCenterVertical className="h-3.5 w-3.5" /></button>
          <button onClick={() => setTextAlign("bottom")} className="p-1.5 rounded hover:bg-muted/50" title="Align bottom"><AlignEndVertical className="h-3.5 w-3.5" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          {/* Indent / outdent (left / right arrows) */}
          <button onClick={() => exec("outdent")} className="p-1.5 rounded hover:bg-muted/50" title="Move left"><IndentDecrease className="h-3.5 w-3.5" /></button>
          <button onClick={() => exec("indent")} className="p-1.5 rounded hover:bg-muted/50" title="Move right"><IndentIncrease className="h-3.5 w-3.5" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={closeToolbars} className="p-1 rounded hover:bg-muted/50" title="Done"><Check className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Floating media toolbar */}
      {mediaToolbar && (
        <div
          className="fixed z-[2147483601] flex flex-wrap items-center gap-2 rounded-lg border border-border bg-popover p-1.5 shadow-xl max-w-[95vw]"
          style={{ left: mediaToolbar.left, top: mediaToolbar.top }}
          onMouseDown={(e) => {
            // Don't steal focus from input/select/textarea children so they can be typed into
            const t = e.target as HTMLElement;
            const tag = t.tagName;
            if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") e.preventDefault();
          }}
        >
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1">
            {mediaToolbar.el.classList.contains("tpl-container") ? "Container" : "Media"}
          </span>
          {mediaToolbar.el.classList.contains("tpl-container") && (
            <>
              <button onClick={insertNewTextBox} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted/50" title="Add text">
                <Plus className="h-3.5 w-3.5" /> Text
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <PaintBucket className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="color"
                onChange={(e) => setContainerBackground(e.target.value)}
                className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
                title="Container background color"
              />
              <BoxSelect className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="color"
                onChange={(e) => setContainerBorder(e.target.value)}
                className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
                title="Container border color"
              />
            </>
          )}
          <button
            onClick={() => replaceImgRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted/50 disabled:opacity-50"
            title="Replace with image"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Image
          </button>
          <input ref={replaceImgRef} type="file" accept="image/*" className="hidden" onChange={onReplaceImg} />
          <button
            onClick={() => replaceVidRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted/50 disabled:opacity-50"
            title="Replace with video"
          >
            Video
          </button>
          <input ref={replaceVidRef} type="file" accept="video/*" className="hidden" onChange={onReplaceVid} />
          <div className="w-px h-5 bg-border mx-1" />
          {/* Percentage-based resize controls */}
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            W
            <input
              type="number" min={1} max={100} placeholder="auto"
              value={currentMediaSize.w}
              onChange={(e) => applyMediaSize("w", e.target.value)}
              className="w-14 h-6 rounded border border-border bg-background px-1 text-xs text-foreground"
            />%
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            H
            <input
              type="number" min={1} max={100} placeholder="auto"
              value={currentMediaSize.h}
              onChange={(e) => applyMediaSize("h", e.target.value)}
              className="w-14 h-6 rounded border border-border bg-background px-1 text-xs text-foreground"
            />%
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Radius
            <input
              type="number" min={0} max={50} placeholder="0"
              value={currentMediaSize.r}
              onChange={(e) => applyMediaSize("r", e.target.value)}
              className="w-14 h-6 rounded border border-border bg-background px-1 text-xs text-foreground"
            />%
          </label>
          <div className="w-px h-5 bg-border mx-1" />
          {/* Nudge (drag with arrows) */}
          <button onClick={() => nudgeMedia(-10, 0)} className="p-1.5 rounded hover:bg-muted/50" title="Move left"><ArrowLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => nudgeMedia(0, -10)} className="p-1.5 rounded hover:bg-muted/50" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button onClick={() => nudgeMedia(0, 10)} className="p-1.5 rounded hover:bg-muted/50" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={() => nudgeMedia(10, 0)} className="p-1.5 rounded hover:bg-muted/50" title="Move right"><ArrowRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => rotateMedia(15)} className="p-1.5 rounded hover:bg-muted/50" title="Rotate"><RotateCw className="h-3.5 w-3.5" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          {/* Alignment */}
          <button onClick={() => alignMedia("left")} className="p-1.5 rounded hover:bg-muted/50" title="Align left"><AlignLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => alignMedia("center")} className="p-1.5 rounded hover:bg-muted/50" title="Align center"><AlignCenter className="h-3.5 w-3.5" /></button>
          <button onClick={() => alignMedia("right")} className="p-1.5 rounded hover:bg-muted/50" title="Align right"><AlignRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => alignMedia("top")} className="p-1.5 rounded hover:bg-muted/50" title="Align top"><AlignStartVertical className="h-3.5 w-3.5" /></button>
          <button onClick={() => alignMedia("middle")} className="p-1.5 rounded hover:bg-muted/50" title="Align middle"><AlignCenterVertical className="h-3.5 w-3.5" /></button>
          <button onClick={() => alignMedia("bottom")} className="p-1.5 rounded hover:bg-muted/50" title="Align bottom"><AlignEndVertical className="h-3.5 w-3.5" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={closeToolbars} className="p-1 rounded hover:bg-muted/50" title="Close"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}
