import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseSubmission,
  type Submission,
} from "../_shared/rsvp-validation.ts";

const MAX_BODY_BYTES = 32 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error("missing_configuration");
  return value;
}

function parseListEnv(name: string): string[] {
  return requiredEnv(name)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return parseListEnv("RSVP_ALLOWED_ORIGINS").includes(origin) ? origin : null;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  origin: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function getClientIp(request: Request): string {
  const candidate = request.headers.get("x-real-ip")?.trim();
  if (!candidate || candidate.length > 45 || !isValidIp(candidate)) {
    throw new Error("client_ip_unavailable");
  }
  return candidate;
}

function isValidIp(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => {
      const number = Number(part);
      return number >= 0 && number <= 255;
    });
  }
  if (!/^[0-9a-f:]+$/i.test(value) || value.includes(":::")) return false;
  const halves = value.split("::");
  if (halves.length > 2) return false;
  const groups = halves.flatMap((half) => half ? half.split(":") : []);
  if (groups.some((group) => group.length < 1 || group.length > 4)) {
    return false;
  }
  return halves.length === 2 ? groups.length < 8 : groups.length === 8;
}

async function hashClientIp(ip: string): Promise<string> {
  const secret = requiredEnv("RSVP_IP_HASH_SECRET");
  if (new TextEncoder().encode(secret).length < 32) {
    throw new Error("invalid_configuration");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip)),
  );
  return `\\x${
    Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }`;
}

async function readLimitedBody(request: Request): Promise<string> {
  if (!request.body) throw new Error("invalid_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("body_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

Deno.serve(async (request: Request): Promise<Response> => {
  let origin: string | null;
  try {
    origin = getAllowedOrigin(request);
  } catch {
    console.error("submit-rsvp: CORS configuration is missing or invalid");
    return new Response("Service unavailable", { status: 503 });
  }
  if (!origin) return new Response("Origin not allowed", { status: 403 });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse(
      405,
      { success: false, error: "Método no permitido." },
      origin,
    );
  }
  if (
    !request.headers.get("content-type")?.toLowerCase().startsWith(
      "application/json",
    )
  ) {
    return jsonResponse(415, {
      success: false,
      error: "Formato de solicitud no permitido.",
    }, origin);
  }

  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (declaredSize > MAX_BODY_BYTES) {
    return jsonResponse(413, {
      success: false,
      error: "La solicitud es demasiado grande.",
    }, origin);
  }

  let submission: Submission;
  let rawBody: string;
  try {
    rawBody = await readLimitedBody(request);
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") {
      return jsonResponse(413, {
        success: false,
        error: "La solicitud es demasiado grande.",
      }, origin);
    }
    return jsonResponse(400, {
      success: false,
      error: "Revisá los datos del formulario.",
    }, origin);
  }
  try {
    submission = parseSubmission(JSON.parse(rawBody));
  } catch {
    return jsonResponse(400, {
      success: false,
      error: "Revisá los datos del formulario.",
    }, origin);
  }

  try {
    const clientIpHash = await hashClientIp(getClientIp(request));
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: rateLimitError } = await serviceClient.rpc(
      "consume_rsvp_rate_limit",
      {
        p_ip_hash: clientIpHash,
        p_request_id: submission.request_id,
        p_window_seconds: 900,
        p_max_requests: 5,
      },
    );
    if (rateLimitError) {
      console.error("submit-rsvp: rate limit check failed");
      return jsonResponse(503, {
        success: false,
        error: "No se pudo procesar la solicitud.",
      }, origin);
    }
    if (allowed !== true) {
      return jsonResponse(429, {
        success: false,
        error: "Se alcanzó el límite de solicitudes. Intentá más tarde.",
      }, origin);
    }

    const { data, error } = await serviceClient.rpc("submit_public_rsvp", {
      p_request_id: submission.request_id,
      p_contact_name: submission.contact_name,
      p_contact_surname: submission.contact_surname,
      p_email: submission.email,
      p_phone: submission.phone,
      p_attending: submission.attending,
      p_attendees: submission.attendees,
      p_observations: submission.observations,
      p_song_suggestion: submission.song_suggestion,
      p_dietary_restrictions: submission.dietary_restrictions,
      p_dietary_details: submission.dietary_details,
    });
    if (error) {
      if (error.code === "23505") {
        return jsonResponse(409, {
          success: false,
          error: "No se pudo procesar la solicitud.",
        }, origin);
      }
      if (error.code === "22023") {
        return jsonResponse(400, {
          success: false,
          error: "Revisá los datos del formulario.",
        }, origin);
      }
      console.error("submit-rsvp: registration RPC failed");
      return jsonResponse(503, {
        success: false,
        error: "No se pudo procesar la solicitud.",
      }, origin);
    }
    if (
      !isRecord(data) || typeof data.balance_due !== "number" ||
      typeof data.included_attendees !== "number"
    ) {
      console.error(
        "submit-rsvp: registration RPC returned an invalid response",
      );
      return jsonResponse(503, {
        success: false,
        error: "No se pudo procesar la solicitud.",
      }, origin);
    }

    return jsonResponse(200, {
      success: true,
      balance_due: data.balance_due,
      included_attendees: data.included_attendees,
    }, origin);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error(`submit-rsvp: request failed (${reason})`);
    return jsonResponse(503, {
      success: false,
      error: "No se pudo procesar la solicitud.",
    }, origin);
  }
});
