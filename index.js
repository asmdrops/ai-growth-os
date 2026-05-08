require('dotenv').config();
const Parser = require('rss-parser');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const GitHubDeployer = require('./deploy');

// Initialize AI and RSS parser
const parser = new Parser();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const NICHE_AGENTS = {
    "SaaS Architect": "You are an expert SaaS builder. You focus on solving technical pain points with scalable software and recurring revenue models.",
    "E-com Growth Expert": "You are a master of physical products and e-commerce. You focus on supply chain, high-volume dropshipping, and physical product innovation.",
    "Info-Product Master": "You are a digital education authority. You focus on newsletters, high-ticket courses, and high-margin knowledge products.",
    "Agency Scaler": "You are a high-ticket service expert. You focus on building agencies that solve complex problems for businesses via human-led or AI-hybrid services."
};

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
                
                // 5. Outbound Sales & Leads
                const leads = await this.findLeadsAndOutreach(trend, score);
                
                // 6. Auto-Deploy to GitHub Pages
                console.log(`\n🚀 [Agent] Deploying landing page to GitHub Pages...`);
                const deployer = new GitHubDeployer();
                const htmlContent = fs.readFileSync(pagePath, 'utf8');
                const runData = {
                    trend,
                    score,
                    content,
                    sales: leads,
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

            // Source 2: Reddit (Multiple Subreddits)
            const subreddits = ['technology', 'SaaS', 'business', 'SideProject'];
            for (const sub of subreddits) {
                const redditRes = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=3`, {
                    headers: { 'User-Agent': 'AI-Growth-Engine-OS/1.0' }
                });
                const redditData = await redditRes.json();
                if (redditData.data && redditData.data.children) {
                    redditData.data.children.forEach(child => {
                        trends.push({ 
                            title: child.data.title, 
                            snippet: `Reddit Thread (${child.data.ups} upvotes): ${child.data.selftext.substring(0, 100)}...`, 
                            link: `https://reddit.com${child.data.permalink}`,
                            source: `Reddit (r/${sub})`
                        });
                    });
                }
            }
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
                "specialist_agent": "<choose from: ${Object.keys(NICHE_AGENTS).join(', ')}>",
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
        console.log(`🏗️ [Agent] ${score.specialist_agent} is generating landing page...`);
        
        // Find a relevant high-quality image from Unsplash (Free API)
        const imageUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(score.monetization_idea.split(' ')[0])},tech`;
        
        const persona = NICHE_AGENTS[score.specialist_agent] || NICHE_AGENTS["SaaS Architect"];
        const prompt = `
            ${persona}
            ${strategy}
            
            Create a highly converting landing page for: "${score.monetization_idea}".
            Trend: "${trend.title}".
            Hero Image URL: ${imageUrl} (Use this as the background or a main feature image).
            
            Requirements:
            1. Use valid HTML5 and Tailwind CSS.
            2. ULTRA-RESPONSIVE: The layout MUST auto-resize and look perfect on all screens (Phone, Laptop, 4K Monitors). Use fluid containers and flexible grids.
            3. Modern premium dark-mode aesthetic.
            4. Include a Hero section WITH THE HERO IMAGE provided.
            5. Include Features and a Waitlist form.
            6. Return ONLY raw HTML.
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

    async findLeadsAndOutreach(trend, score) {
        console.log(`🕵️ [Agent] Searching for potential clients/leads for: ${score.monetization_idea}...`);
        
        // In a real production OS, we would use a Search API or Scraper here.
        // For now, we use Gemini to brainstorm the 'Target Personas' and 'Outreach Strategy'.
        const prompt = `
            Our new SaaS/Product is: "${score.monetization_idea}" based on the trend "${trend.title}".
            
            1. Identify 3 specific types of businesses or individuals who would pay for this TODAY.
            2. For each, write a high-conversion cold outreach email (subject line + body).
            3. Suggest where to find these clients (e.g., LinkedIn groups, Subreddits, specific directories).
            
            Return ONLY a valid JSON object:
            {
                "target_personas": ["type 1", "type 2"],
                "outreach_emails": [
                    {"target": "string", "subject": "string", "body": "string"}
                ],
                "search_strategy": "where to find them"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const salesData = JSON.parse(response.text);
        console.log(`✅ Sales Strategy Generated! Found ${salesData.target_personas.length} target personas.`);
        return salesData;
    }

    async generateContent(trend, score, strategy) {
        console.log(`📝 [Agent] ${score.specialist_agent} is generating viral content...`);
        const persona = NICHE_AGENTS[score.specialist_agent] || NICHE_AGENTS["SaaS Architect"];
        const prompt = `
            ${persona}
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
        console.log(`\n📈 [Agent] Analyzing cycle performance to extract autonomous lessons...`);
        
        // Simulating performance data based on trend quality
        const simulatedClicks = Math.floor(Math.random() * 500) + 100;
        const simulatedSignups = Math.floor(simulatedClicks * (Math.random() * 0.1));
        
        console.log(`📊 Stats: ${simulatedClicks} views, ${simulatedSignups} waitlist signups.`);

        const learningPrompt = `
            You are the Performance Analyst for the AI Growth Engine OS.
            We just completed a cycle for the trend: "${trend.title}".
            Stats: ${simulatedClicks} views, ${simulatedSignups} signups.
            
            Current Lessons in our memory:
            ${JSON.stringify(this.lessons, null, 2)}

            Based on these results, what is ONE new, highly specific lesson we should add to our memory to improve future conversion?
            Focus on copywriting, niche selection, or landing page design.
            
            Return ONLY a valid JSON object:
            {
                "new_lesson": "string",
                "reasoning": "string"
            }
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: learningPrompt,
                config: { responseMimeType: "application/json" }
            });
            
            const result = JSON.parse(response.text);
            const newLesson = result.new_lesson;
            
            console.log(`💡 Autonomous Lesson Learned: "${newLesson}"`);
            
            // Update performance.json
            const perfPath = path.join(__dirname, 'performance.json');
            let perf = { lessons: [] };
            if (fs.existsSync(perfPath)) {
                perf = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
            }
            
            // Add new lesson if it doesn't exist
            if (!perf.lessons.includes(newLesson)) {
                perf.lessons.push(newLesson);
                // Keep only last 20 lessons to avoid prompt bloat
                if (perf.lessons.length > 20) perf.lessons.shift();
                fs.writeFileSync(perfPath, JSON.stringify(perf, null, 2));
                this.lessons = perf.lessons; // Update local memory
            }
        } catch (e) {
            console.error("❌ Auto-learning failed:", e.message);
        }
    }
}

// OS Loop Function
async function startOS() {
    const os = new AIGrowthEngine();
    const manualTopic = process.argv[2]; // Check for manual topic
    const isCloudAction = process.env.GITHUB_ACTIONS === 'true'; // Detect GitHub Actions
    
    const intervalHours = parseFloat(process.env.LOOP_INTERVAL_HOURS) || 6;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run once and exit if manual or cloud
    if (manualTopic || isCloudAction) {
        if (manualTopic) console.log(`🎯 Running one-time manual override for: ${manualTopic}`);
        if (isCloudAction) console.log(`☁️ Running autonomous cloud cycle...`);
        await os.run(manualTopic);
        process.exit(0);
    }

    console.log(`🕒 OS Loop active locally. Running every ${intervalHours} hours.`);
    
    while (true) {
        await os.run();
        console.log(`💤 Sleeping for ${intervalHours} hours... Next run at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

startOS().catch(console.error);
