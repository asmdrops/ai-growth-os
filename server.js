const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const authCode = process.env.DASHBOARD_AUTH_CODE;
    if (!authCode) return next(); // No code set, skip auth
    
    if (req.query.code === authCode || req.headers['x-auth-code'] === authCode) {
        return next();
    }
    res.status(401).send('🔒 Unauthorized. Please provide your personal access code.');
};

// Lead capture API (Public)
app.post('/api/leads', (req, res) => {
    const { email, topic } = req.body;
    if (!email) return res.status(400).send('Email is required');
    
    const leadsPath = path.join(__dirname, 'output', 'leads.json');
    let leads = [];
    try {
        if (fs.existsSync(leadsPath)) {
            leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
        }
    } catch (e) {}
    
    leads.push({ email, topic, timestamp: new Date().toISOString() });
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
    res.status(200).json({ success: true });
});

// Serve the generated landing pages directly
app.use('/preview', express.static(path.join(__dirname, 'output')));

app.get('/', authMiddleware, (req, res) => {
    let data = null;
    let leads = [];
    try {
        const raw = fs.readFileSync(path.join(__dirname, 'output', 'data.json'));
        data = JSON.parse(raw);
        
        if (fs.existsSync(path.join(__dirname, 'output', 'leads.json'))) {
            leads = JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 'leads.json')));
        }
    } catch (e) {}

    if (!data) {
        return res.send('<h2>No cycles have completed yet. Run <pre>node index.js</pre> first.</h2>');
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Growth Engine OS - Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white min-h-screen p-4 md:p-8 font-sans">
        <div class="w-full mx-auto space-y-6">
            <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                🚀 AI Growth Engine OS
            </h1>
            <p class="text-slate-400">System Status: Active | Last run: ${new Date(data.timestamp).toLocaleString()}</p>
            
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Trend Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 class="text-xl font-semibold mb-4 text-blue-400">🔍 Trend Discovery</h2>
                    <div class="mb-4">
                        <span class="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 font-bold uppercase">${data.trend.source}</span>
                    </div>
                    <p class="font-medium text-lg leading-snug">${data.trend.title}</p>
                    <a href="${data.trend.link}" target="_blank" class="text-xs text-slate-500 hover:text-indigo-400 mt-2 inline-block">View Source &rarr;</a>
                    
                    <div class="mt-6 pt-6 border-t border-slate-700">
                        <h2 class="text-xl font-semibold mb-4 text-yellow-400">🧠 AI Evaluation</h2>
                        <div class="grid grid-cols-2 gap-3 mb-4 text-center">
                            <div class="bg-slate-700/30 p-2 rounded border border-slate-700">
                                <span class="block text-xl font-bold">${data.score.potential}/10</span>
                                <span class="text-[8px] text-slate-400 uppercase font-bold">Potential</span>
                            </div>
                            <div class="bg-slate-700/30 p-2 rounded border border-slate-700">
                                <span class="block text-xl font-bold text-emerald-400">${data.score.commercial_intent}/10</span>
                                <span class="text-[8px] text-slate-400 uppercase font-bold">Intent</span>
                            </div>
                        </div>
                        <p class="text-slate-400 text-xs italic line-clamp-4 mb-4">"${data.score.reason}"</p>
                        <div class="bg-indigo-900/40 p-3 rounded-lg border border-indigo-500/30">
                            <span class="block text-[10px] text-indigo-300 uppercase font-bold mb-1">Target Niche:</span>
                            <span class="text-sm text-indigo-100 font-medium">${data.score.monetization_idea}</span>
                        </div>
                    </div>
                </div>

                <!-- Content Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 class="text-xl font-semibold mb-4 text-emerald-400">📝 Viral Content</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <h3 class="text-[10px] font-bold text-slate-500 uppercase mb-2">Twitter Strategy</h3>
                            <div class="bg-slate-900/50 p-3 rounded border border-slate-700 text-xs text-slate-300">
                                ${data.content.twitter[0]}
                            </div>
                        </div>
                        <div>
                            <h3 class="text-[10px] font-bold text-slate-500 uppercase mb-2">LinkedIn Authority</h3>
                            <div class="bg-slate-900/50 p-3 rounded border border-slate-700 text-xs text-slate-300 h-48 overflow-y-auto">
                                ${data.content.linkedin}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sales Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 class="text-xl font-semibold mb-4 text-orange-400">🕵️ Sales & Outreach</h2>
                    
                    <div class="space-y-4">
                        ${!data.sales ? '<p class="text-xs text-slate-500 italic">Sales strategy pending for this run...</p>' : `
                        <div>
                            <h3 class="text-[10px] font-bold text-slate-500 uppercase mb-2">Target Personas</h3>
                            <div class="flex flex-wrap gap-2">
                                ${data.sales.target_personas.map(p => `<span class="bg-orange-500/10 text-orange-400 text-[10px] px-2 py-1 rounded border border-orange-500/20">${p}</span>`).join('')}
                            </div>
                        </div>
                        <div>
                            <h3 class="text-[10px] font-bold text-slate-500 uppercase mb-2">Outreach Strategy</h3>
                            <p class="text-xs text-slate-400 italic mb-2">${data.sales.search_strategy}</p>
                            <div class="bg-slate-900/50 p-3 rounded border border-slate-700 text-xs text-slate-300 h-40 overflow-y-auto">
                                <span class="text-orange-300 font-bold block mb-1">Email Draft:</span>
                                <strong>Sub: ${data.sales.outreach_emails[0].subject}</strong><br><br>
                                ${data.sales.outreach_emails[0].body}
                            </div>
                        </div>
                        `}
                    </div>
                </div>

                <!-- Preview Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:col-span-1 h-[600px] flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-pink-400">🏗️ Generated Site</h2>
                        <a href="${data.liveUrl || '/preview/index.html'}" target="_blank" class="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-white font-bold transition flex items-center">
                            Live URL &nbsp; 🔗
                        </a>
                    </div>
                    <iframe src="/preview/index.html" class="flex-1 w-full bg-white rounded-lg border-4 border-slate-700" title="Landing Page Preview"></iframe>
                </div>

                <!-- Leads Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:col-span-4">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-semibold text-emerald-400">👥 Captured Leads</h2>
                        <span class="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">${leads.length} Subscribers</span>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-700">
                                <tr>
                                    <th class="pb-3">Email Address</th>
                                    <th class="pb-3">Niche/Topic</th>
                                    <th class="pb-3 text-right">Captured At</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leads.length === 0 ? '<tr><td colspan="3" class="py-10 text-center text-slate-700 italic">No leads yet.</td></tr>' : leads.map(l => `
                                    <tr class="border-b border-slate-800 last:border-0">
                                        <td class="py-4 font-medium text-white">${l.email}</td>
                                        <td class="py-4 text-slate-400">${l.topic}</td>
                                        <td class="py-4 text-right text-slate-600">${new Date(l.timestamp).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`🌟 AI Growth OS Dashboard is LIVE!`);
    console.log(`➡️  Open your browser to: http://localhost:${port}`);
    console.log(`=================================================\n`);
});
