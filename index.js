require('dotenv').config();
const Parser = require('rss-parser');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const GitHubDeployer = require('./deploy');

// Initialize AI and RSS parser
const parser = new Parser();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

class AIGrowthEngine {
    constructor() {
        console.log("🚀 Initializing AI Growth Engine OS with Gemini...");
        if (!process.env.GEMINI_API_KEY) {
            console.warn("⚠️ WARNING: GEMINI_API_KEY is not set in .env file. The OS will fail.");
        }
        this.lessons = this.loadLessons();
    }

    loadLessons() {
        try {
            const perfPath = path.join(__dirname, 'performance.json');
            if (fs.existsSync(perfPath)) {
                const perf = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
                console.log("📈 [Agent] Loading performance insights from previous cycles...");
                return perf.lessons || [];
            }
        } catch (e) {
            console.error("❌ Failed to load lessons:", e);
        }
        return [];
    }

    async run(manualTopic = null) {
        console.log("\n--- Starting Growth Engine Cycle ---");
        
        try {
            // 0. Review Lessons
            const strategyContext = this.lessons.length > 0 
                ? `IMPORTANT STRATEGY ADJUSTMENTS BASED ON PAST PERFORMANCE:\n${this.lessons.join('\n')}`
                : "No previous performance data available. Use default high-conversion strategies.";

            // 1. Search & Detect Trends
            const trend = manualTopic 
                ? { title: manualTopic, snippet: `Manual target: ${manualTopic}`, link: "#" }
                : await this.detectTrend();
            
            if (manualTopic) console.log(`🎯 [Manual Override] Targetting: ${manualTopic}`);
            
            // 2. Score Money Potential
            const score = await this.scoreMoneyPotential(trend, strategyContext);
            
            if (score.potential >= 5) {
                console.log(`✅ Trend "${trend.title}" passed threshold. Potential Score: ${score.potential}/10`);
                console.log(`💡 Reason: ${score.reason}`);
                
                // 3. Build Landing Page
                const pagePath = await this.buildLandingPage(trend, score, strategyContext);
                
                // 4. Generate Content
                const content = await this.generateContent(trend, score, strategyContext);
                
                // 5. Auto-Deploy to GitHub Pages
                console.log(`\n🚀 [Agent] Deploying landing page to GitHub Pages...`);
                const deployer = new GitHubDeployer();
                const htmlContent = fs.readFileSync(pagePath, 'utf8');
                const runData = {
                    trend,
                    score,
                    content,
                    timestamp: new Date().toISOString()
                };
                const liveUrl = await deployer.deploy(htmlContent, runData);
                
                // Save to local database
                if (liveUrl) runData.liveUrl = liveUrl;
                fs.writeFileSync(path.join(__dirname, 'output', 'data.json'), JSON.stringify(runData, null, 2));

                // 5b. Post content with real live URL
                await this.postContent(content, liveUrl || pagePath);
                
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
        console.log("🔍 [Agent] Scanning multiple sources (Google News + Reddit)...");
        const trends = [];

        try {
            // Source 1: Google News RSS
            const feed = await parser.parseURL('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en');
            feed.items.slice(0, 5).forEach(item => {
                trends.push({ title: item.title, snippet: item.contentSnippet, link: item.link, source: "Google News" });
            });

            // Source 2: Reddit (r/technology)
            const redditRes = await fetch('https://www.reddit.com/r/technology/hot.json?limit=5', {
                headers: { 'User-Agent': 'AI-Growth-Engine-OS/1.0' }
            });
            const redditData = await redditRes.json();
            redditData.data.children.forEach(child => {
                trends.push({ 
                    title: child.data.title, 
                    snippet: `Reddit Thread (${child.data.ups} upvotes): ${child.data.selftext.substring(0, 100)}...`, 
                    link: `https://reddit.com${child.data.permalink}`,
                    source: `Reddit (r/${child.data.subreddit})`
                });
            });
        } catch (e) {
            console.warn("⚠️ Some trend sources failed to load:", e.message);
        }

        console.log(`📡 Aggregate discovery found ${trends.length} potential trends. Asking Gemini to pick the winner...`);
        
        const selectionPrompt = `
            From the following list of trending topics, select the ONE topic with the highest potential for creating a successful digital product or SaaS today.
            Consider virality, urgency, and monetization ease.
            
            Topics:
            ${JSON.stringify(trends, null, 2)}

            Return ONLY a valid JSON object of the selected topic.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: selectionPrompt,
            config: { responseMimeType: "application/json" }
        });

        const selected = JSON.parse(response.text);
        console.log(`🏆 Selected Trend: "${selected.title}" [Source: ${selected.source}]`);
        return selected;
    }

    async scoreMoneyPotential(trend, strategy) {
        console.log(`🧠 [Agent] Scoring money potential using Gemini...`);
        const prompt = `
            ${strategy}
            
            Analyze this trending news topic for its money-making potential.
            Topic: ${trend.title}
            Snippet: ${trend.snippet}

            Evaluate the topic based on these three pillars:
            1. Commercial Intent: Are people looking to spend money in this niche right now?
            2. Competition: How crowded is this space? Is there room for a new entrant?
            3. Productizability: How easily can this be turned into a digital product (SaaS, Guide, Newsletter)?

            Return ONLY a valid JSON object:
            {
                "potential": <number 1-10>,
                "commercial_intent": <number 1-10>,
                "competition_score": <number 1-10>,
                "productizability": <number 1-10>,
                "reason": "<detailed explanation of the score>",
                "monetization_idea": "<one specific high-potential product idea>"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    }

    async buildLandingPage(trend, score, strategy) {
        console.log(`🏗️ [Agent] Generating beautiful landing page via Gemini...`);
        const prompt = `
            ${strategy}
            
            Create a highly converting landing page for: "${score.monetization_idea}".
            Trend: "${trend.title}".
            
            Requirements:
            1. Use valid HTML5 and Tailwind CSS.
            2. Modern premium dark-mode aesthetic.
            3. Include Hero and Features sections.
            4. Return ONLY raw HTML.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let htmlContent = response.text.trim();
        if (htmlContent.startsWith('\`\`\`html')) {
            htmlContent = htmlContent.replace(/^\`\`\`html\n/, '').replace(/\n\`\`\`$/, '');
        }

        const dir = path.join(__dirname, 'output');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const filePath = path.join(dir, 'index.html');
        fs.writeFileSync(filePath, htmlContent);
        return filePath;
    }

    async generateContent(trend, score, strategy) {
        console.log(`📝 [Agent] Generating viral content via Gemini...`);
        const prompt = `
            ${strategy}
            
            Write a viral Twitter thread (2-3 tweets) and a professional LinkedIn post about: "${trend.title}".
            Goal: Drive traffic to: "${score.monetization_idea}".
            
            Return ONLY a valid JSON object:
            {
                "twitter": ["tweet 1", "tweet 2"],
                "linkedin": "full post"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    }

    async postContent(content, pagePath) {
        console.log(`🚀 [Agent] Ready to post!`);
        console.log(`\n--- TWITTER DRAFT ---`);
        content.twitter.forEach((t, i) => console.log(`${i+1}. ${t}`));
        console.log(`\n--- LINKEDIN DRAFT ---`);
        console.log(content.linkedin);
        console.log(`\n(Live URL: ${pagePath})`);
    }

    async learnFromPerformance(trend) {
        console.log(`📈 [Agent] Monitoring performance... (Learning module active)`);
    }
}

// OS Loop Function
async function startOS() {
    const os = new AIGrowthEngine();
    const manualTopic = process.argv[2]; // Check for manual topic
    const intervalHours = parseFloat(process.env.LOOP_INTERVAL_HOURS) || 6;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    if (manualTopic) {
        console.log(`🎯 Running one-time manual override for: ${manualTopic}`);
        await os.run(manualTopic);
        process.exit(0);
    }

    console.log(`🕒 OS Loop active. Running every ${intervalHours} hours.`);
    
    while (true) {
        await os.run();
        console.log(`💤 Sleeping for ${intervalHours} hours... Next run at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

startOS().catch(console.error);
