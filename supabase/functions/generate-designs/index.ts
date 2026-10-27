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
    const imageModel = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2-2026-04-21";
    const dailyLimit = parseInt(Deno.env.get("DAILY_IMAGE_LIMIT") || "100", 10);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""), {
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id } = await req.json();
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
      return new Response(JSON.stringify({ error: "Design request not found" }), {
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
      return new Response(JSON.stringify({ error: "No presets found for product type" }), {
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

    // 5. Create queued rows for each preset (variant 1 to 5)
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

    // Update request status to generating
    await supabase.from("design_requests").update({ status: "generating" }).eq("id", request_id);

    // 6. Background async execution using EdgeRuntime.waitUntil
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const runGenerationJob = async () => {
      const tasks = insertedVariations.map(async (variation: any) => {
        const preset = presets.find((p: any) => p.id === variation.preset_id);
        const presetLettering = letteringRefs.find((r: any) => r.preset_key === preset?.preset_key) || letteringRefs[0];

        // Mark as running
        await supabase
          .from("design_variations")
          .update({ status: "running" })
          .eq("id", variation.id);

        const executeOne = async () => {
          let imageResultB64: string | null = null;
          let openaiReqId: string | null = null;

          const hasLettering = requestData.include_name && presetLettering;
          const hasImages = hasLettering || customerRefs.length > 0;

          if (hasImages) {
            // Prepare image files
            const filesToUpload: any[] = [];

            // Lettering must be first reference image
            if (hasLettering) {
              const { data: letteringData, error: letDownError } = await supabase.storage
                .from("lettering")
                .download(presetLettering.storage_path);

              if (letteringData && !letDownError) {
                const arrayBuf = await letteringData.arrayBuffer();
                filesToUpload.push(await toFile(new Uint8Array(arrayBuf), "lettering.png", { type: "image/png" }));
              }
            }

            // Customer reference photos
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
              // Try OpenAI image edit
              try {
                // OpenAI images.edit accepts 'image' (or array in latest models)
                const editPayload: any = {
                  model: imageModel,
                  image: filesToUpload[0],
                  prompt: variation.prompt,
                  n: 1,
                  size: "1024x1024",
                  response_format: "b64_json",
                };

                const res = await (openai.images as any).edit(editPayload);
                imageResultB64 = res.data[0]?.b64_json;
                openaiReqId = (res as any).id || (res as any)._request_id || "req_" + Date.now();
              } catch (editErr: any) {
                console.warn(`Edit API error with model ${imageModel}, attempting fallback:`, editErr.message);
                // Fallback to images.generate if edit fails or model doesn't support edit
                const genRes = await openai.images.generate({
                  model: "dall-e-3",
                  prompt: variation.prompt,
                  n: 1,
                  size: "1024x1024",
                  response_format: "b64_json",
                  quality: "standard",
                });
                imageResultB64 = genRes.data[0]?.b64_json || null;
                openaiReqId = "req_fallback_" + Date.now();
              }
            }
          }

          if (!imageResultB64) {
            // Text to image generation
            try {
              const res = await openai.images.generate({
                model: imageModel.includes("gpt-image") ? imageModel : "dall-e-3",
                prompt: variation.prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json",
                quality: "standard",
              });
              imageResultB64 = res.data[0]?.b64_json || null;
              openaiReqId = "req_gen_" + Date.now();
            } catch (genErr: any) {
              // Fallback to dall-e-3
              const fallbackRes = await openai.images.generate({
                model: "dall-e-3",
                prompt: variation.prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json",
                quality: "standard",
              });
              imageResultB64 = fallbackRes.data[0]?.b64_json || null;
              openaiReqId = "req_gen_fallback_" + Date.now();
            }
          }

          if (!imageResultB64) {
            throw new Error("No image data returned from generation model");
          }

          // Decode base64 to binary
          const binaryStr = atob(imageResultB64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          // Upload to designs bucket: {request_id}/{variation_id}.png
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

          // Update variation row to done
          await supabase
            .from("design_variations")
            .update({
              status: "done",
              image_path: storagePath,
              openai_request_id: openaiReqId,
            })
            .eq("id", variation.id);
        };

        // Retry logic: try once, wait 5 seconds if failed, retry once
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

      // Check if all variations are finished and update request status
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

    // Use EdgeRuntime.waitUntil if available in Supabase Edge Functions
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(runGenerationJob());
    } else {
      // In local testing or fallback
      runGenerationJob();
    }

    // Return immediate response with request_id
    return new Response(
      JSON.stringify({
        success: true,
        request_id,
        count: insertedVariations.length,
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
