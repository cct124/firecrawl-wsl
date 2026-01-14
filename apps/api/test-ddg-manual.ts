import { ddgSearch } from "./src/search/v2/ddgsearch";

async function testQuery(query: string) {
  console.log(`\nTesting query: "${query}"`);
  try {
    const results = await ddgSearch(query, 5);
    if (results.web && results.web.length > 0) {
      console.log(`Found ${results.web.length} results:`);
      results.web.forEach((res, i) => {
        console.log(`${i + 1}. ${res.title} - ${res.url}`);
      });
    } else {
      console.log("No results found.");
    }
  } catch (error) {
    console.error("Error during search:", error);
  }
}

async function main() {
  await testQuery("AudioContext suspended iOS WebView fix cocos creator");
}

main();
