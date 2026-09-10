// Generate research content HTML from a prompt using Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, title, research_type, template_html } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasTemplate = typeof template_html === "string" && template_html.trim().length > 0;

    const system = hasTemplate
      ? `You are a medical/scientific research writer. You will receive a TEMPLATE (semantic HTML). Rewrite/customize that template so its layout, structure, section headings, colors, inline styles and visual design are PRESERVED, but the text content becomes the requested research. Replace placeholder text with real, professional, factual content. Keep every wrapper element, class, and inline style intact. Do NOT include <html>, <head>, <body>, or <style>. Return ONLY the resulting HTML — no markdown, no code fences.`
      : `You are a medical/scientific research writer. Produce clean semantic HTML for the body of a research article. Use <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <table> where suitable. Do NOT include <html>, <head>, <body>, or <style>. Keep text professional and factual. Use inline style="max-width:900px;margin:0 auto;padding:2rem;font-family:system-ui,sans-serif;line-height:1.7;color:#111827;background:#ffffff" on a single wrapping <div>.`;

    const user = hasTemplate
      ? `Title: ${title || "(untitled)"}\nType: ${research_type || "general"}\n\nInstructions from admin:\n${prompt}\n\nTEMPLATE (customize this — keep structure & styles, replace text):\n${template_html}\n\nReturn ONLY the customized HTML.`
      : `Title: ${title || "(untitled)"}\nType: ${research_type || "general"}\n\nInstructions from admin:\n${prompt}\n\nReturn ONLY the HTML — no markdown, no code fences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error", resp.status, body);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    let html = data?.choices?.[0]?.message?.content ?? "";
    // strip accidental code fences
    html = String(html).replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-research error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
