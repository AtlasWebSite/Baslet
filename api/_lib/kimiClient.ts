import OpenAI from 'openai';
import { getContentPrompt, getSystemPrompt } from './aiPrompts.js';
import { AiValidationError, parseAiJson, validateAiContent, type AiContentType } from './aiSchemas.js';
import { requireEnvironment } from './http.js';

const DEFAULT_MODEL = 'kimi-k3';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

interface KimiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface KimiGenerationResult {
  content: ReturnType<typeof validateAiContent>;
  model: string;
  usage: KimiUsage;
}

function createKimiClient() {
  return new OpenAI({
    apiKey: requireEnvironment('MOONSHOT_API_KEY'),
    baseURL: process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1',
    timeout: 45_000,
  });
}

function getErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeStatus = 'status' in error ? (error as { status?: unknown }).status : undefined;
  return typeof maybeStatus === 'number' ? maybeStatus : undefined;
}

function isRetryable(error: unknown) {
  const status = getErrorStatus(error);
  if (status && RETRYABLE_STATUSES.has(status)) return true;
  return error instanceof Error && /timeout|network|fetch|econnreset/i.test(error.message);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function emptyUsage(): KimiUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function mapUsage(usage: OpenAI.Completions.CompletionUsage | undefined): KimiUsage {
  if (!usage) return emptyUsage();
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  };
}

async function requestKimiJson(type: AiContentType, topic: string, repairAttempt: boolean) {
  const client = createKimiClient();
  const model = process.env.KIMI_MODEL ?? DEFAULT_MODEL;
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: type === 'flashcards' ? 3_200 : 4_000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: getContentPrompt(type, topic, repairAttempt) },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) throw new AiValidationError();

  return {
    model,
    usage: mapUsage(completion.usage),
    parsed: parseAiJson(rawContent),
  };
}

export async function generateContentWithKimi(type: AiContentType, topic: string): Promise<KimiGenerationResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await requestKimiJson(type, topic, false);
      return {
        content: validateAiContent(response.parsed, type),
        model: response.model,
        usage: response.usage,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === 2) break;
      await sleep(450 * (attempt + 1));
    }
  }

  if (lastError instanceof AiValidationError) {
    const repaired = await requestKimiJson(type, topic, true);
    return {
      content: validateAiContent(repaired.parsed, type),
      model: repaired.model,
      usage: repaired.usage,
    };
  }

  throw lastError;
}

