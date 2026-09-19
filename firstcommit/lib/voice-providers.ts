import { debugError, debugLog } from "./debug";

type DeepgramResponse = {
  results?: {
    channels?: {
      alternatives?: {
        transcript?: string;
      }[];
    }[];
  };
};

export async function transcribeWithDeepgram(
  audio: ArrayBuffer,
  contentType: string
) {
  const key =
    process.env.DEEPGRAM_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "DEEPGRAM_API_KEY is not configured"
    );
  }

  if (!audio.byteLength) {
    throw new Error(
      "No audio data was received"
    );
  }

  /*
   * MediaRecorder often sends:
   * audio/webm;codecs=opus
   *
   * Deepgram only needs the actual media
   * MIME type here.
   */
  const normalizedContentType =
    contentType
      .split(";")[0]
      .trim() || "audio/webm";

  debugLog(
    "deepgram",
    "transcription request",
    {
      bytes: audio.byteLength,
      contentType:
        normalizedContentType
    }
  );

  let response: Response;

  try {
    response =
      await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
        {
          method: "POST",

          headers: {
            Authorization:
              `Token ${key}`,

            "content-type":
              normalizedContentType
          },

          body: audio
        }
      );
  } catch (error) {
    debugError(
      "deepgram",
      "network request failed",
      error
    );

    throw new Error(
      "Unable to connect to Deepgram"
    );
  }

  if (!response.ok) {
    const errorBody =
      await response.text();

    debugError(
      "deepgram",
      "transcription request failed",
      new Error(
        `${response.status} ${response.statusText}`
      ),
      {
        response:
          errorBody.slice(
            0,
            1000
          )
      }
    );

    throw new Error(
      `Deepgram transcription failed (${response.status})`
    );
  }

  const body =
    (await response.json()) as
      DeepgramResponse;

  const transcript =
    body.results
      ?.channels?.[0]
      ?.alternatives?.[0]
      ?.transcript
      ?.trim() ?? "";

  debugLog(
    "deepgram",
    "transcription completed",
    {
      transcriptLength:
        transcript.length
    }
  );

  return transcript;
}

export async function speakWithElevenLabs(
  text: string
) {
  const key =
    process.env
      .ELEVENLABS_API_KEY
      ?.trim();

  const voiceId =
    process.env
      .ELEVENLABS_VOICE_ID
      ?.trim();

  if (!key) {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured"
    );
  }

  if (!voiceId) {
    throw new Error(
      "ELEVENLABS_VOICE_ID is not configured"
    );
  }

  const cleanText =
    text.trim();

  if (!cleanText) {
    throw new Error(
      "Text-to-speech input is empty"
    );
  }

  debugLog(
    "elevenlabs",
    "TTS request",
    {
      voiceId,
      textLength:
        cleanText.length
    }
  );

  let response: Response;

  try {
    response =
      await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
          voiceId
        )}`,
        {
          method: "POST",

          headers: {
            "xi-api-key":
              key,

            "content-type":
              "application/json",

            accept:
              "audio/mpeg"
          },

          body:
            JSON.stringify({
              text:
                cleanText,

              model_id:
                "eleven_multilingual_v2"
            })
        }
      );
  } catch (error) {
    debugError(
      "elevenlabs",
      "network request failed",
      error
    );

    throw new Error(
      "Unable to connect to ElevenLabs"
    );
  }

  if (!response.ok) {
    const errorBody =
      await response.text();

    debugError(
      "elevenlabs",
      "TTS request failed",
      new Error(
        `${response.status} ${response.statusText}`
      ),
      {
        response:
          errorBody.slice(
            0,
            1000
          )
      }
    );

    throw new Error(
      `ElevenLabs speech generation failed (${response.status})`
    );
  }

  const audio =
    await response.arrayBuffer();

  if (!audio.byteLength) {
    throw new Error(
      "ElevenLabs returned empty audio"
    );
  }

  debugLog(
    "elevenlabs",
    "TTS completed",
    {
      bytes:
        audio.byteLength,

      contentType:
        response.headers.get(
          "content-type"
        )
    }
  );

  return audio;
}

export async function generateWithOpenRouter(
  prompt: string
) {
  const key =
    process.env
      .OPENROUTER_API_KEY
      ?.trim();

  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured"
    );
  }

  const model =
    process.env
      .OPENROUTER_INTERVIEW_MODEL ??
    "meta-llama/llama-3.3-70b-instruct";

  debugLog(
    "openrouter",
    "generation request",
    {
      model,
      promptLength:
        prompt.length
    }
  );

  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${key}`,

          "content-type":
            "application/json"
        },

        body:
          JSON.stringify({
            model,

            messages: [
              {
                role:
                  "user",

                content:
                  prompt
              }
            ],

            temperature:
              0.2
          })
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    debugError(
      "openrouter",
      "generation failed",
      new Error(
        `${response.status} ${response.statusText}`
      ),
      {
        response:
          errorText.slice(
            0,
            1000
          )
      }
    );

    throw new Error(
      `OpenRouter generation failed (${response.status})`
    );
  }

  const body =
    (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
        };
      }[];
    };

  return (
    body.choices?.[0]
      ?.message?.content ??
    ""
  );
}