import { generateObject } from "ai";
import { z } from "zod";
import { config } from "../../config";
import { getModel } from "../generic-ai";

describe("generic-ai", () => {
  const originalOpenAIApiKey = config.OPENAI_API_KEY;
  const originalOpenAIBaseUrl = config.OPENAI_BASE_URL;
  const originalModelName = config.MODEL_NAME;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.OPENAI_API_KEY = originalOpenAIApiKey;
    config.OPENAI_BASE_URL = originalOpenAIBaseUrl;
    config.MODEL_NAME = originalModelName;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("uses chat completions for SiliconFlow-compatible OpenAI endpoints", async () => {
    config.OPENAI_API_KEY = "test-key";
    config.OPENAI_BASE_URL = "https://api.siliconflow.com/v1";
    config.MODEL_NAME = "Qwen/Qwen3-30B-A3B-Instruct-2507";

    const calls: Array<{ url: string; body: unknown }> = [];
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
          url: String(input),
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });

        return new Response(
          JSON.stringify({
            id: "chatcmpl-test",
            object: "chat.completion",
            created: 1,
            model: "Qwen/Qwen3-30B-A3B-Instruct-2507",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: JSON.stringify({ answer: "ok" }),
                },
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    ) as typeof fetch;

    const result = await generateObject({
      model: getModel("gpt-4o-mini", "openai"),
      schema: z.object({
        answer: z.string(),
      }),
      prompt: 'Return {"answer":"ok"}',
    });

    expect(result.object).toEqual({ answer: "ok" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.siliconflow.com/v1/chat/completions",
    );
    expect(getModel("gpt-4o-mini", "openai").provider).toBe("siliconflow.chat");
  });

  it("falls back to the default OpenAI base URL when OPENAI_BASE_URL is blank", () => {
    config.OPENAI_API_KEY = "test-key";
    config.OPENAI_BASE_URL = "";
    config.MODEL_NAME = undefined;

    const model = getModel("gpt-4o-mini", "openai");

    expect(model.provider).toBe("openai.responses");
    expect(
      model.config.url({ path: "/responses", modelId: model.modelId }),
    ).toBe("https://api.openai.com/v1/responses");
  });
});
