import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import OpenAI, { toFile } from "npm:openai@4.85.4";

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
    const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2-2026-04-21";

    const { variation_id, instruction } = await req.json();
    if (!variation_id || !instruction) {
      return new Response(JSON.stringify({ error: "variation_id and instruction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: parentVar, error: parentError } = await supabase
      .from("design_variations")
      .select("*, design_requests(*), product_presets(*)")
      .eq("id", variation_id)
      .single();

    if (parentError || !parentVar) {
      return new Response(JSON.stringify({ error: "Parent variation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refinedPrompt = `${parentVar.prompt} Refinement modification: ${instruction}. Keep the overall structure and typography, applying the specified change.`;

    const { data: newVar, error: insErr } = await supabase
      .from("design_variations")
      .insert({
        request_id: parentVar.request_id,
        preset_id: parentVar.preset_id,
        variant_index: parentVar.variant_index,
        parent_id: parentVar.id,
        prompt: refinedPrompt,
        prompt_version: "v1_refined",
        model: imageModel,
        status: "queued",
      })
      .select()
      .single();

    if (insErr || !newVar) {
      throw new Error("Failed to queue refined variation: " + insErr?.message);
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const runRefine = async () => {
      await supabase.from("design_variations").update({ status: "running" }).eq("id", newVar.id);
      try {
        let imageB64: string | null = null;
        let fileList: any[] = [];

        // Download parent image if available
        if (parentVar.image_path) {
          const { data: parentImgBlob } = await supabase.storage.from("designs").download(parentVar.image_path);
          if (parentImgBlob) {
            const arr = await parentImgBlob.arrayBuffer();
            fileList.push(await toFile(new Uint8Array(arr), "parent.png", { type: "image/png" }));
          }
        }

        if (fileList.length > 0) {
          try {
            const res = await (openai.images as any).edit({
              model: imageModel,
              image: fileList[0],
              prompt: refinedPrompt,
              n: 1,
              size: "1024x1024",
              response_format: "b64_json",
            });
            imageB64 = res.data[0]?.b64_json;
          } catch (e: any) {
            console.warn("Refine edit API failed, falling back to generate:", e.message);
          }
        }

        if (!imageB64) {
          const genRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: refinedPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          });
          imageB64 = genRes.data[0]?.b64_json || null;
        }

        if (!imageB64) throw new Error("No image generated from refine");

        const binaryStr = atob(imageB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const storagePath = `${newVar.request_id}/${newVar.id}.png`;
        await supabase.storage.from("designs").upload(storagePath, bytes, { contentType: "image/png", upsert: true });

        await supabase.from("design_variations").update({
          status: "done",
          image_path: storagePath,
          openai_request_id: "req_refine_" + Date.now(),
        }).eq("id", newVar.id);
      } catch (err: any) {
        console.error("Refine variation failed:", err);
        await supabase.from("design_variations").update({ status: "failed", error: err.message }).eq("id", newVar.id);
      }
    };

    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(runRefine());
    } else {
      runRefine();
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
