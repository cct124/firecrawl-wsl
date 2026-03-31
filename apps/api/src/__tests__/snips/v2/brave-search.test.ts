import { config } from "../../../config";
import { describeIf, scrapeTimeout } from "../lib";
import request, { TEST_API_URL, idmux, Identity } from "./lib";

const HAS_BRAVE_SEARCH = !!config.BRAVE_SEARCH_API_KEY;

let identity: Identity;

beforeAll(async () => {
  identity = await idmux({
    name: "v2-brave-search",
    concurrency: 50,
    credits: 1000000,
  });
}, 10000);

describeIf(HAS_BRAVE_SEARCH)("V2 Brave Search compatibility", () => {
  it.concurrent(
    "returns web, news, and images without downgrade warning",
    async () => {
      const response = await request(TEST_API_URL)
        .post("/v2/search")
        .set("Authorization", `Bearer ${identity.apiKey}`)
        .set("Content-Type", "application/json")
        .send({
          query: "firecrawl",
          sources: ["web", "news", "images"],
          limit: 2,
          timeout: scrapeTimeout,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.warning).toBeUndefined();
      expect(response.body.data.web).toBeDefined();
      expect(response.body.data.web.length).toBeGreaterThan(0);
      expect(response.body.data.news).toBeDefined();
      expect(response.body.data.news.length).toBeGreaterThan(0);
      expect(response.body.data.images).toBeDefined();
      expect(response.body.data.images.length).toBeGreaterThan(0);
    },
    scrapeTimeout,
  );
});
