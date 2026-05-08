require('dotenv').config();
const Parser = require('rss-parser');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Initialize AI and RSS parser
const parser = new Parser();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

class AIGrowthEngine {
    constructor() {
        console.log("🚀 Initializing AI Growth Engine OS with Gemini...");
        if (!process.env.GEMINI_API_KEY) {
            console.warn("⚠️ WARNING: GEMINI_API_KEY is not set in .env file. The OS will fail.");
        }
    }

    async run() {
        console.log("\n--- Starting Growth Engine Cycle ---");
        
        try {
            // 1. Search & Detect Trends
            const trend = await this.detectTrend();
            
            // 2. Score Money Potential
            const score = await this.scoreMoneyPotential(trend);
            
            if (score.potential > 7) {
                console.log(`✅ Trend "${trend.title}" passed threshold. Potential Score: ${score.potential}/10`);
                console.log(`💡 Reason: ${score.reason}`);
                
                // 3. Build Landing Page
                const pagePath = await this.buildLandingPage(trend, score);
                
                // 4. Generate Content
                const content = await this.generateContent(trend, score);
                
                // 5. Deploy & Post (Mocked deployment logic for now)
                await this.postContent(content, pagePath);
                
                // 6. Learn from Performance
                await this.learnFromPerformance(trend);
            } else {
                console.log(`❌ Trend "${trend.title}" rejected. Score: ${score.potential}/10.`);
                console.log(`💡 Reason: ${score.reason}`);
            }
        } catch (error) {
            console.error("❌ Error in Growth Engine Cycle:", error);
        }
        
        console.log("--- Cycle Complete ---\n");
    }

    async detectTrend() {
        console.log("🔍 [Agent] Searching Google News for tech/business trends...");
        // Using Google News RSS for 'Technology'
        const feed = await parser.parseURL('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en');
        
        // Pick the top news item
        const topItem = feed.items[0];
        console.log(`📡 Found trend: ${topItem.title}`);
        
        return {
            title: topItem.title,
            link: topItem.link,
            snippet: topItem.contentSnippet || topItem.title
        };
    }

    async scoreMoneyPotential(trend) {
        console.log(`🧠 [Agent] Scoring money potential using Gemini...`);
        const prompt = `
            Analyze this trending news topic for its potential to generate online income (e.g., through info products, SaaS, affiliate marketing, or newsletters).
            Topic: ${trend.title}
            Snippet: ${trend.snippet}

            Return ONLY a valid JSON object with the following structure:
            {
                "potential": <number between 1 and 10>,
                "reason": "<short explanation of why it scored this way>",
                "monetization_idea": "<one specific product or service idea>"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const textResponse = response.text;
        return JSON.parse(textResponse);
    }

    async buildLandingPage(trend, score) {
        console.log(`🏗️ [Agent] Generating beautiful landing page via Gemini...`);
        const prompt = `
            You are an expert web developer and copywriter.
            Create a highly converting landing page for this product idea: "${score.monetization_idea}".
            The product is based on this trending topic: "${trend.title}".
            
            Requirements:
            1. Use valid HTML5 structure.
            2. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
            3. Use a modern, premium, dark-mode glassmorphism aesthetic with vibrant gradients (e.g. text-transparent bg-clip-text bg-gradient-to-r).
            4. Include a Hero section with a compelling headline, subheadline, and a "Get Early Access" call-to-action button with hover animations.
            5. Include a Features section explaining how it helps the user.
            6. Return ONLY the raw HTML code. Do not include markdown code blocks (\`\`\`html). Just start with <!DOCTYPE html>.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let htmlContent = response.text.trim();
        // Fallback cleanup if Gemini includes markdown wrapping
        if (htmlContent.startsWith('\`\`\`html')) {
            htmlContent = htmlContent.replace(/^\`\`\`html\n/, '').replace(/\n\`\`\`$/, '');
        }

        const dir = path.join(__dirname, 'output');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        
        const filePath = path.join(dir, 'index.html');
        fs.writeFileSync(filePath, htmlContent);
        console.log(`✅ Landing page generated at: ./output/index.html`);
        return filePath;
    }

    async generateContent(trend, score) {
        console.log(`📝 [Agent] Generating viral social media content via Gemini...`);
        const prompt = `
            Write a viral Twitter thread (2-3 tweets) and a professional LinkedIn post about this topic: "${trend.title}".
            The goal is to drive traffic to our new product: "${score.monetization_idea}".
            
            Return ONLY a valid JSON object with this structure:
            {
                "twitter": ["tweet 1", "tweet 2"],
                "linkedin": "full linkedin post text"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text);
    }

    async postContent(content, pagePath) {
        console.log(`🚀 [Agent] Ready to post!`);
        console.log(`\n--- TWITTER DRAFT ---`);
        content.twitter.forEach((t, i) => console.log(`${i+1}. ${t}`));
        console.log(`\n--- LINKEDIN DRAFT ---`);
        console.log(content.linkedin);
        console.log(`\n(Link in bio: ${pagePath})`);
    }

    async learnFromPerformance(trend) {
        console.log(`\n📈 [Agent] System is monitoring analytics... (Learning module pending real data integration)`);
    }
}

const os = new AIGrowthEngine();
os.run();
