import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import OpenAI, { toFile } from "npm:openai@4.85.4";
import { buildPrompt } from "../_shared/buildPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
    const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";
    const dailyLimit = parseInt(Deno.env.get("DAILY_IMAGE_LIMIT") || "100", 10);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { request_id } = body;

    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
      .from("design_variations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (countError) {
      console.error("Count check error:", countError);
    } else if (count !== null && count >= dailyLimit) {
      return new Response(
        JSON.stringify({ error: `Daily generation limit of ${dailyLimit} images reached for today.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch the design request
    const { data: requestData, error: reqError } = await supabase
      .from("design_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !requestData) {
      return new Response(JSON.stringify({ error: "Design request not found: " + (reqError?.message || '') }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch presets for product_type
    const { data: presets, error: presetError } = await supabase
      .from("product_presets")
      .select("*")
      .eq("product_type", requestData.product_type)
      .eq("active", true)
      .order("variant_index", { ascending: true });

    if (presetError || !presets || presets.length === 0) {
      return new Response(JSON.stringify({ error: "No presets found for product type " + requestData.product_type }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Fetch reference images
    const { data: refRows } = await supabase
      .from("reference_images")
      .select("*")
      .eq("request_id", request_id);

    const customerRefs = refRows?.filter((r: any) => r.kind === "customer") || [];
    const letteringRefs = refRows?.filter((r: any) => r.kind === "lettering") || [];

    // Check existing variations
    const { data: existingVars } = await supabase
      .from("design_variations")
      .select("*")
      .eq("request_id", request_id)
      .is("parent_id", null);

    let variationsToProcess: any[] = [];

    if (!existingVars || existingVars.length === 0) {
      // Create 5 queued rows
      const variationsToInsert = presets.slice(0, 5).map((preset: any) => {
        const prompt = buildPrompt(requestData, preset, customerRefs.length > 0);
        return {
          request_id,
          preset_id: preset.id,
          variant_index: preset.variant_index,
          prompt,
          prompt_version: preset.prompt_version || "v1",
          model: imageModel,
          status: "queued",
        };
      });

      const { data: insertedVariations, error: insertError } = await supabase
        .from("design_variations")
        .insert(variationsToInsert)
        .select();

      if (insertError || !insertedVariations) {
        throw new Error("Failed to queue variations: " + insertError?.message);
      }
      variationsToProcess = insertedVariations;
    } else {
      // Reset failed or queued variations to run again
      variationsToProcess = existingVars;
      await supabase
        .from("design_variations")
        .update({ status: "queued", error: null })
        .eq("request_id", request_id)
        .eq("status", "failed");
    }

    // Update request status to generating
    await supabase.from("design_requests").update({ status: "generating" }).eq("id", request_id);

    // 5. Execute generation with OpenAI
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const runGenerationJob = async () => {
      const tasks = variationsToProcess.map(async (variation: any) => {
        const preset = presets.find((p: any) => p.id === variation.preset_id) || presets[variation.variant_index - 1];
        const presetLettering = letteringRefs.find((r: any) => r.preset_key === preset?.preset_key) || letteringRefs[0];

        // Mark as running
        await supabase
          .from("design_variations")
          .update({ status: "running", error: null })
          .eq("id", variation.id);

        const executeOne = async () => {
          let imageResultB64: string | null = null;
          let openaiReqId: string | null = null;

          const hasLettering = requestData.include_name && presetLettering;

          if (hasLettering || customerRefs.length > 0) {
            const filesToUpload: any[] = [];

            if (hasLettering) {
              const { data: letteringData, error: letDownError } = await supabase.storage
                .from("lettering")
                .download(presetLettering.storage_path);

              if (letteringData && !letDownError) {
                const arrayBuf = await letteringData.arrayBuffer();
                filesToUpload.push(await toFile(new Uint8Array(arrayBuf), "lettering.png", { type: "image/png" }));
              }
            }

            for (let i = 0; i < customerRefs.length; i++) {
              const { data: refData } = await supabase.storage
                .from("references")
                .download(customerRefs[i].storage_path);

              if (refData) {
                const arrayBuf = await refData.arrayBuffer();
                filesToUpload.push(await toFile(new Uint8Array(arrayBuf), `ref_${i}.png`, { type: "image/png" }));
              }
            }

            if (filesToUpload.length > 0) {
              try {
                // OpenAI Images edit API with image input
                const editPayload: any = {
                  model: imageModel,
                  image: filesToUpload[0],
                  prompt: variation.prompt,
                  n: 1,
                  size: "1024x1024",
                };

                const res = await (openai.images as any).edit(editPayload);
                imageResultB64 = res.data[0]?.b64_json;
                openaiReqId = (res as any).id || (res.data[0] as any)?.generation_id || "gen_" + Date.now();
              } catch (editErr: any) {
                console.warn(`Edit API failed for preset ${preset?.label}:`, editErr.message);
              }
            }
          }

          if (!imageResultB64) {
            // Standard generation with gpt-image-2 (no response_format param)
            const genPayload: any = {
              model: imageModel,
              prompt: variation.prompt,
              n: 1,
              size: "1024x1024",
            };

            const res = await openai.images.generate(genPayload);
            imageResultB64 = res.data[0]?.b64_json || null;
            openaiReqId = (res as any).id || (res.data[0] as any)?.generation_id || "gen_" + Date.now();
          }

          if (!imageResultB64) {
            throw new Error("No image data returned from OpenAI");
          }

          // Decode base64 to binary
          const binaryStr = atob(imageResultB64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          // Upload to storage designs bucket
          const storagePath = `${request_id}/${variation.id}.png`;
          const { error: uploadError } = await supabase.storage
            .from("designs")
            .upload(storagePath, bytes, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            throw new Error("Storage upload error: " + uploadError.message);
          }

          // Mark variation as done
          await supabase
            .from("design_variations")
            .update({
              status: "done",
              image_path: storagePath,
              openai_request_id: openaiReqId,
              error: null,
            })
            .eq("id", variation.id);
        };

        try {
          await executeOne();
        } catch (firstErr: any) {
          console.warn(`Variation ${variation.id} failed, retrying in 5 seconds:`, firstErr.message);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          try {
            await executeOne();
          } catch (retryErr: any) {
            console.error(`Variation ${variation.id} failed after retry:`, retryErr.message);
            await supabase
              .from("design_variations")
              .update({
                status: "failed",
                error: retryErr.message || "Image generation failed",
              })
              .eq("id", variation.id);
          }
        }
      });

      await Promise.allSettled(tasks);

      // Check final status of all variations
      const { data: finalVars } = await supabase
        .from("design_variations")
        .select("status")
        .eq("request_id", request_id);

      const allDone = finalVars?.every((v: any) => v.status === "done" || v.status === "failed");
      if (allDone) {
        await supabase
          .from("design_requests")
          .update({ status: "done" })
          .eq("id", request_id);
      }
    };

    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(runGenerationJob());
    } else {
      runGenerationJob();
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id,
        count: variationsToProcess.length,
        status: "generating",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Generate designs error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
