import { createOpenAI } from "@ai-sdk/openai";
import { config } from "../config";
import { createOllama } from "ollama-ai-provider";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { fireworks } from "@ai-sdk/fireworks";
import { deepinfra } from "@ai-sdk/deepinfra";
import { createVertex } from "@ai-sdk/google-vertex";

type Provider =
  | "openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function normalizeConfigString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getDefaultProvider(): Provider {
  return normalizeConfigString(config.OLLAMA_BASE_URL) ? "ollama" : "openai";
}

function getOpenAIBaseURL() {
  return (
    normalizeConfigString(config.OPENAI_BASE_URL) ?? DEFAULT_OPENAI_BASE_URL
  );
}

function isSiliconFlowBaseURL(baseURL: string) {
  try {
    const { hostname } = new URL(baseURL);
    return (
      hostname === "api.siliconflow.com" ||
      hostname.endsWith(".siliconflow.com")
    );
  } catch {
    return false;
  }
}

function getOpenAIProvider() {
  const baseURL = getOpenAIBaseURL();

  return createOpenAI({
    apiKey: normalizeConfigString(config.OPENAI_API_KEY),
    baseURL,
    name: isSiliconFlowBaseURL(baseURL) ? "siliconflow" : "openai",
  });
}

function getProviderList(): Record<Provider, any> {
  return {
    openai: getOpenAIProvider(),
    ollama: createOllama({
      baseURL: normalizeConfigString(config.OLLAMA_BASE_URL),
    }),
    anthropic,
    groq,
    google,
    openrouter: createOpenRouter({
      apiKey: normalizeConfigString(config.OPENROUTER_API_KEY),
    }),
    fireworks,
    deepinfra,
    vertex: createVertex({
      project: "firecrawl",
      baseURL:
        "https://aiplatform.googleapis.com/v1/projects/firecrawl/locations/global/publishers/google",
      location: "global",
      googleAuthOptions: config.VERTEX_CREDENTIALS
        ? {
            credentials: JSON.parse(atob(config.VERTEX_CREDENTIALS)),
          }
        : {
            keyFile: "./gke-key.json",
          },
    }),
  };
}

export function getModel(
  name: string,
  provider: Provider = getDefaultProvider(),
) {
  if (name === "gemini-2.5-pro") {
    name = "gemini-2.5-pro";
  }

  const resolvedModelName = normalizeConfigString(config.MODEL_NAME) ?? name;
  const providerList = getProviderList();

  if (provider === "openai") {
    const openaiProvider = providerList.openai;
    if (resolvedModelName.startsWith("o3-mini")) {
      return openaiProvider.chat(resolvedModelName);
    }

    return isSiliconFlowBaseURL(getOpenAIBaseURL())
      ? openaiProvider.chat(resolvedModelName)
      : openaiProvider(resolvedModelName);
  }

  return providerList[provider](resolvedModelName);
}

export function getEmbeddingModel(
  name: string,
  provider: Provider = getDefaultProvider(),
) {
  const resolvedEmbeddingModelName =
    normalizeConfigString(config.MODEL_EMBEDDING_NAME) ?? name;
  const providerList = getProviderList();

  return providerList[provider].embedding(resolvedEmbeddingModelName);
}
