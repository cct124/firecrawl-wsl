import { config } from "../../../config";
import {
  ALLOW_TEST_SUITE_WEBSITE,
  describeIf,
  HAS_AI,
  scrapeTimeout,
  TEST_PRODUCTION,
  TEST_SUITE_WEBSITE,
} from "../lib";
import { idmux, Identity, scrape } from "./lib";

const HAS_SILICONFLOW = /siliconflow\.(com|cn)/.test(
  config.OPENAI_BASE_URL ?? "",
);

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "v2-siliconflow-json-extract",
    concurrency: 25,
    credits: 1000000,
  });
}, 10000 + scrapeTimeout);

describeIf(
  (TEST_PRODUCTION || (HAS_AI && ALLOW_TEST_SUITE_WEBSITE)) && HAS_SILICONFLOW,
)("V2 SiliconFlow compatibility", () => {
  it.concurrent(
    "extracts structured JSON with the configured SiliconFlow model",
    async () => {
      const response = await scrape(
        {
          url: `${TEST_SUITE_WEBSITE}/example.json`,
          formats: [
            {
              type: "json",
              schema: {
                type: "object",
                properties: {
                  userId: { type: "number" },
                  id: { type: "number" },
                  title: { type: "string" },
                  body: { type: "string" },
                },
                required: ["userId", "id", "title", "body"],
              },
            },
          ],
          timeout: scrapeTimeout,
        },
        identity,
      );

      expect(response.json).toBeDefined();
      expect(response.json.userId).toBe(1);
      expect(response.json.id).toBe(1);
      expect(response.json.title).toBeDefined();
      expect(response.json.body).toBeDefined();
    },
    scrapeTimeout,
  );
});
