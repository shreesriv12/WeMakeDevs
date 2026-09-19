import { authenticate } from "@/lib/auth";
import { debugError } from "@/lib/debug";
import { speakWithElevenLabs } from "@/lib/voice-providers";
import { z } from "zod";

const schema =
  z.object({
    text:
      z
        .string()
        .trim()
        .min(1)
        .max(1200)
  });

export async function POST(
  request: Request
) {
  try {
    await authenticate(
      request
    );

    const {
      text
    } =
      schema.parse(
        await request.json()
      );

    const audio =
      await speakWithElevenLabs(
        text
      );

    return new Response(
      audio,
      {
        status:
          200,

        headers: {
          "content-type":
            "audio/mpeg",

          "cache-control":
            "no-store",

          "content-length":
            String(
              audio.byteLength
            )
        }
      }
    );
  } catch (error) {
    debugError(
      "tts",
      "speech generation failed",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Speech generation failed"
      },
      {
        status:
          400
      }
    );
  }
}