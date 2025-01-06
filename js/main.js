import { NewsAPI } from "./newsApi.js";

class NewsAggregator {
  constructor() {
    this.newsApi = new NewsAPI();
    this.preferences = [];
    this.isViewingBookmarks = false;
    this.setupEventListeners();
    this.loadPreferences();
  }

  setupEventListeners() {
    document
      .getElementById("savePreferences")
      .addEventListener("click", () => this.savePreferences());

    document
      .getElementById("sentimentFilter")
      .addEventListener("change", (e) =>
        this.filterNewsBySentiment(e.target.value)
      );

    document
      .getElementById("languageFilter")
      .addEventListener("change", (e) => this.changeLanguage(e.target.value));

    document
      .getElementById("showBookmarks")
      .addEventListener("click", () => this.toggleBookmarksView());

    // Add event delegation for bookmark buttons
    document.getElementById("newsGrid").addEventListener("click", (e) => {
      const bookmarkBtn = e.target.closest(".bookmark-btn");
      if (bookmarkBtn) {
        const articleData = JSON.parse(bookmarkBtn.dataset.article);
        this.toggleBookmark(articleData);

        // Toggle bookmark icon
        const icon = bookmarkBtn.querySelector("i");
        icon.classList.toggle("fa-bookmark");
        icon.classList.toggle("fa-bookmark-o");
        bookmarkBtn.classList.toggle("bookmarked");
      }
    });
  }

  savePreferences() {
    const checkboxes = document.querySelectorAll(".categories input:checked");
    this.preferences = Array.from(checkboxes).map((cb) => cb.value);
    localStorage.setItem("newsPreferences", JSON.stringify(this.preferences));
    this.fetchNews();
  }

  loadPreferences() {
    const saved = localStorage.getItem("newsPreferences");
    if (saved) {
      this.preferences = JSON.parse(saved);
      this.preferences.forEach((pref) => {
        const checkbox = document.querySelector(`input[value="${pref}"]`);
        if (checkbox) checkbox.checked = true;
      });
      this.fetchNews();
    }
  }

  async fetchNews() {
    const articles = await this.newsApi.fetchNews(this.preferences);
    this.currentArticles = articles;
    this.displayNews(articles);
  }

  async handleSummaryClick(button, articleDescription) {
    try {
      button.disabled = true;
      button.textContent = "Generating...";

      const summaryContainer = button.parentElement.querySelector(".summary");
      summaryContainer.style.display = "block";

      const summary = await this.newsApi.generateSummary(articleDescription);

      summaryContainer.innerHTML = `
        <h4>AI Summary:</h4>
        <p>${summary}</p>
      `;
      button.style.display = "none";
    } catch (error) {
      console.error("Error generating summary:", error);
      button.textContent = "Error - Try Again";
      button.disabled = false;
    }
  }

  displayNews(articles) {
    const newsGrid = document.getElementById("newsGrid");
    newsGrid.innerHTML = articles
      .map((article) => {
        const isBookmarked = this.isArticleBookmarked(article);
        return `
            <div class="news-card">
                <button class="bookmark-btn ${
                  isBookmarked ? "bookmarked" : ""
                }" 
                  data-article='${JSON.stringify(article).replace(/'/g, "\\'")}'
                >
                    <i class="fas ${
                      isBookmarked ? "fa-bookmark" : "fa-bookmark-o"
                    }"></i>
                </button>
                <img src="${article.urlToImage || "placeholder.jpg"}" alt="${
          article.title
        }">
                <h3>${article.title}</h3>
                <div class="article-content">
                  <p class="description">${article.description}</p>
                  <div class="summary" style="display: none;"></div>
                  <div class="button-group">
                    <button class="summary-btn" onclick="app.handleSummaryClick(this, '${article.description.replace(
                      /'/g,
                      "\\'"
                    )}')">
                      Get AI Summary
                    </button>
                    <button class="read-more-btn" onclick="window.open('${
                      article.url
                    }', '_blank')">
                      <span>Read More</span>
                      <i class="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
                <span class="sentiment ${article.sentiment}">${
          article.sentiment
        }</span>
            </div>
          `;
      })
      .join("");
  }

  filterNewsBySentiment(sentiment) {
    const cards = document.querySelectorAll(".news-card");
    cards.forEach((card) => {
      if (
        sentiment === "all" ||
        card.querySelector(`.sentiment.${sentiment}`)
      ) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  async changeLanguage(language) {
    const newsGrid = document.getElementById("newsGrid");
    const loadingMessage = document.createElement("div");
    loadingMessage.className = "loading-message";
    loadingMessage.textContent = "Translating... Please wait";
    newsGrid.appendChild(loadingMessage);

    try {
      // Translate articles in batches of 3 to avoid overwhelming the API
      const translatedArticles = [];
      const batchSize = 3;

      for (let i = 0; i < this.currentArticles.length; i += batchSize) {
        const batch = this.currentArticles.slice(i, i + batchSize);
        const translatedBatch = await Promise.all(
          batch.map((article) =>
            this.newsApi.translateArticle(article, language)
          )
        );
        translatedArticles.push(...translatedBatch);

        // Update loading message with progress
        const progress = Math.min(
          100,
          Math.round(((i + batchSize) / this.currentArticles.length) * 100)
        );
        loadingMessage.textContent = `Translating... ${progress}%`;

        // Add a small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.displayNews(translatedArticles);
    } catch (error) {
      console.error("Error translating articles:", error);
      alert("Translation failed. Please try again later.");
    } finally {
      loadingMessage.remove();
    }
  }

  isArticleBookmarked(article) {
    const bookmarks = this.getBookmarks();
    return bookmarks.some((bookmark) => bookmark.url === article.url);
  }

  getBookmarks() {
    const bookmarks = localStorage.getItem("bookmarks");
    return bookmarks ? JSON.parse(bookmarks) : [];
  }

  toggleBookmark(article) {
    const bookmarks = this.getBookmarks();
    const index = bookmarks.findIndex(
      (bookmark) => bookmark.url === article.url
    );

    if (index === -1) {
      // Add to bookmarks
      bookmarks.push(article);
      this.showToast("Article bookmarked");
    } else {
      // Remove from bookmarks
      bookmarks.splice(index, 1);
      this.showToast("Bookmark removed");
    }

    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));

    // Update the display only if we're viewing bookmarks
    if (this.isViewingBookmarks) {
      this.displayNews(this.getBookmarks());
    }
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 100);
  }

  toggleBookmarksView() {
    this.isViewingBookmarks = !this.isViewingBookmarks;
    const bookmarksBtn = document.getElementById("showBookmarks");
    const preferencesSection = document.querySelector(".preferences");

    if (this.isViewingBookmarks) {
      bookmarksBtn.innerHTML = '<i class="fas fa-newspaper"></i> Show News';
      preferencesSection.style.display = "none";
      this.displayNews(this.getBookmarks());
    } else {
      bookmarksBtn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarks';
      preferencesSection.style.display = "block";
      this.displayNews(this.currentArticles);
    }
  }
}

// Initialize the application
const app = new NewsAggregator();

// Make app available globally for the onclick handlers
window.app = app;
