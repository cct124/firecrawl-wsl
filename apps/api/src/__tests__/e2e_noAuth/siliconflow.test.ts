import request from "supertest";
import { config } from "../../config";

const TEST_URL = config.TEST_API_URL;
const hasSiliconFlow = /siliconflow\.(com|cn)/.test(
  config.OPENAI_BASE_URL ?? "",
);

(hasSiliconFlow ? describe : describe.skip)(
  "E2E SiliconFlow compatibility",
  () => {
    it("extracts structured JSON through v2/scrape using the configured SiliconFlow model", async () => {
      const response = await request(TEST_URL)
        .post("/v2/scrape")
        .set("Content-Type", "application/json")
        .send({
          url: "https://example.com",
          formats: [
            {
              type: "json",
              prompt:
                "Extract the page title and whether the page states it is for documentation examples.",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  mentionsDocumentationExamples: { type: "boolean" },
                },
                required: ["title", "mentionsDocumentationExamples"],
              },
            },
          ],
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data?.json).toBeDefined();
      expect(response.body.data.json.title).toContain("Example Domain");
      expect(response.body.data.json.mentionsDocumentationExamples).toBe(true);
    }, 120000);
  },
);
