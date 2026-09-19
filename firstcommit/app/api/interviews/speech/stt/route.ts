import { authenticate } from "@/lib/auth";
import { debugError, debugLog } from "@/lib/debug";
import { transcribeWithDeepgram } from "@/lib/voice-providers";

const MAX_AUDIO_BYTES =
  10_000_000;
const MIN_AUDIO_BYTES = 500;

export async function POST(
  request: Request
) {
  try {
    await authenticate(
      request
    );

    const rawContentType =
      request.headers.get(
        "content-type"
      ) ??
      "audio/webm";

    const contentType =
      rawContentType
        .split(";")[0]
        .trim();

    const audio =
      await request.arrayBuffer();

    debugLog(
      "stt",
      "audio received",
      {
        bytes:
          audio.byteLength,
        contentType
      }
    );

    if (
      audio.byteLength < MIN_AUDIO_BYTES
    ) {
      throw new Error(
        "Recording was empty or too short. Speak for a few seconds before stopping."
      );
    }

    if (
      audio.byteLength >
      MAX_AUDIO_BYTES
    ) {
      throw new Error(
        "Audio recording must be smaller than 10 MB"
      );
    }

    const transcript =
      await transcribeWithDeepgram(
        audio,
        contentType
      );

    if (
      !transcript.trim()
    ) {
      return Response.json(
        {
          error:
            "Audio was received, but no speech was detected. Speak for a few seconds and try again."
        },
        {
          status:
            422
        }
      );
    }

    return Response.json(
      {
        transcript
      }
    );
  } catch (error) {
    debugError(
      "stt",
      "speech transcription failed",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Transcription failed"
      },
      {
        status:
          400
      }
    );
  }
}
