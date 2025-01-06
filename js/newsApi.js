import { config } from "./config.js";

export class NewsAPI {
  constructor() {
    this.apiKey = config.newsApiKey;
    this.baseUrl = "https://content.guardianapis.com/search";
    this.geminiKey = config.geminiApiKey;
    this.geminiUrl = config.endpoints.gemini;
    this.currentLanguage = "en";
  }

  async fetchNews(categories) {
    const query = categories.join(" OR ");
    try {
      const response = await fetch(
        `${this.baseUrl}?q=${query}&api-key=${this.apiKey}&show-fields=thumbnail,bodyText`
      );
      const data = await response.json();
      const articles = await this.processArticles(data.response.results);
      return articles;
    } catch (error) {
      console.error("Error fetching news:", error);
      return [];
    }
  }

  async processArticles(articles) {
    const processedArticles = [];

    for (const article of articles) {
      if (!article.webTitle || !article.fields?.bodyText) {
        continue;
      }

      // Generate random sentiment (keeping this for compatibility)
      const sentiments = ["positive", "negative", "neutral"];
      const randomSentiment =
        sentiments[Math.floor(Math.random() * sentiments.length)];

      // Format article to match the existing structure
      processedArticles.push({
        title: article.webTitle,
        description: article.fields.bodyText.slice(0, 200) + "...", // Truncate description
        url: article.webUrl,
        urlToImage: article.fields.thumbnail || "placeholder.jpg",
        sentiment: randomSentiment,
      });
    }
    return processedArticles;
  }

  async generateSummary(text) {
    try {
      const response = await fetch(`${this.geminiUrl}?key=${this.geminiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please provide a brief 2-sentence summary of the following text: ${text}`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      return "Summary unavailable";
    } catch (error) {
      console.error("Error generating summary:", error);
      return "Summary unavailable";
    }
  }

  async translateText(text, targetLang) {
    try {
      const response = await fetch(`${this.geminiUrl}?key=${this.geminiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Translate the following text to ${targetLang}: ${text}`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      return text; // Return original text if translation fails
    } catch (error) {
      console.error("Error translating text:", error);
      return text;
    }
  }

  async translateArticle(article, targetLang) {
    if (targetLang === "en") return article;

    // Create a single text block to translate
    const combinedText = `Title: ${article.title}\nDescription: ${article.description}`;

    try {
      const translatedText = await this.translateText(combinedText, targetLang);

      // Split the translated text back into title and description
      const parts = translatedText.split("\n");
      const translatedTitle = parts[0].replace("Title: ", "");
      const translatedDescription = parts[1].replace("Description: ", "");

      return {
        ...article,
        title: translatedTitle,
        description: translatedDescription,
      };
    } catch (error) {
      console.error("Error translating article:", error);
      return article;
    }
  }
}
