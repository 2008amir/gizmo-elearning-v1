import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const clean = (v: unknown) => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Require an authenticated admin caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { course_id, course_title, count = 10 } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const { data: course } = await supabase.from("courses").select("title").eq("id", course_id).maybeSingle();
    const title = String(course?.title || course_title || "");

    // Gather research strictly linked to this course (via sections OR research_type = course title)
    const { data: sections } = await supabase.from("course_sections").select("id").eq("course_id", course_id);
    const sectionIds = (sections ?? []).map((s: any) => s.id);
    let research: any[] = [];
    if (sectionIds.length) {
      const { data } = await supabase.from("research").select("title,content_html").in("section_id", sectionIds).limit(80);
      research = data ?? [];
    }
    if (!research.length && title) {
      const { data } = await supabase.from("research").select("title,content_html").ilike("research_type", title).limit(80);
      research = data ?? [];
    }

    // Balance corpus across lessons so no single lesson dominates
    const perLessonBudget = research.length ? Math.max(2000, Math.floor(100000 / research.length)) : 100000;
    const lessons = research
      .map((r, i) => {
        const body = clean(r.content_html).slice(0, perLessonBudget);
        return `# LESSON ${i + 1}: ${clean(r.title)}\n${body}`;
      })
      .filter((p) => clean(p).length > 20);
    const corpus = lessons.join("\n\n---\n\n").slice(0, 120000);

    if (clean(corpus).length < 80) {
      return new Response(JSON.stringify({
        created: 0,
        needs_content: true,
        message: "This course has no research content yet. Add lessons with research content before generating exam questions.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lessonCount = lessons.length;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an exam writer. Generate multiple-choice questions STRICTLY and ONLY from the provided research content. Rules:\n- Use ONLY facts explicitly stated in the LESSON sections below.\n- Do NOT invent facts, do NOT use outside knowledge, do NOT ask about topics not present in the content.\n- Every question, every option, and every correct answer must be directly supported by the supplied text.\n- Spread questions ACROSS ALL ${lessonCount} lessons — do not draw only from one lesson. Aim for roughly balanced coverage of every lesson.\nReturn ONLY valid JSON: {"questions":[{"question":"...","options":["a","b","c","d"],"correct_index":0,"lesson":1}]}` },
          { role: "user", content: `Write exactly ${count} MCQs (4 options each) covering ALL ${lessonCount} lessons below. Distribute questions roughly evenly across lessons. Use ONLY facts from the research content.\n\n===RESEARCH CONTENT START===\n${corpus}\n===RESEARCH CONTENT END===` },
        ],
      }),
    });
    if (!resp.ok) return new Response(JSON.stringify({ error: await resp.text() }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = await resp.json();
    let content = String(data?.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(content);
    const qs = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (!qs.length) return new Response(JSON.stringify({ created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const rows = qs.map((q: any) => {
      const originalCorrect = Number(q.correct_index) || 0;
      const opts = Array.isArray(q.options) ? [...q.options] : [];
      const correctVal = opts[originalCorrect];
      // Shuffle options
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      const newCorrect = Math.max(0, opts.indexOf(correctVal));
      return { course_id, question: String(q.question), options: opts, correct_index: newCorrect, source: "ai" };
    });
    const { error } = await supabase.from("exam_questions").insert(rows);
    if (error) throw error;
    return new Response(JSON.stringify({ created: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
