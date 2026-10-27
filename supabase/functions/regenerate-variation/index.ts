import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import OpenAI from "npm:openai@4.85.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
    const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";

    const body = await req.json();
    const { variation_id } = body;

    if (!variation_id) {
      return new Response(JSON.stringify({ error: "variation_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: oldVar, error: varError } = await supabase
      .from("design_variations")
      .select("*, design_requests(*), product_presets(*)")
      .eq("id", variation_id)
      .single();

    if (varError || !oldVar) {
      return new Response(JSON.stringify({ error: "Variation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert new queued variation row
    const { data: newVar, error: insErr } = await supabase
      .from("design_variations")
      .insert({
        request_id: oldVar.request_id,
        preset_id: oldVar.preset_id,
        variant_index: oldVar.variant_index,
        prompt: oldVar.prompt,
        prompt_version: oldVar.prompt_version || "v1",
        model: imageModel,
        status: "queued",
      })
      .select()
      .single();

    if (insErr || !newVar) {
      throw new Error("Failed to create regenerated variation: " + insErr?.message);
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const runRegen = async () => {
      await supabase.from("design_variations").update({ status: "running" }).eq("id", newVar.id);
      try {
        const res = await openai.images.generate({
          model: imageModel,
          prompt: newVar.prompt,
          n: 1,
          size: "1024x1024",
        });
        const imageB64 = res.data[0]?.b64_json || null;

        if (!imageB64) throw new Error("No image data returned from model");

        const binaryStr = atob(imageB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const storagePath = `${newVar.request_id}/${newVar.id}.png`;
        await supabase.storage.from("designs").upload(storagePath, bytes, { contentType: "image/png", upsert: true });

        await supabase.from("design_variations").update({
          status: "done",
          image_path: storagePath,
          openai_request_id: (res as any).id || (res.data[0] as any)?.generation_id || "req_regen_" + Date.now(),
        }).eq("id", newVar.id);
      } catch (err: any) {
        console.error("Regenerate failed:", err);
        await supabase.from("design_variations").update({ status: "failed", error: err.message }).eq("id", newVar.id);
      }
    };

    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(runRegen());
    } else {
      runRegen();
    }

    return new Response(JSON.stringify({ success: true, variation_id: newVar.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
