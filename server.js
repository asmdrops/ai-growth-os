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
    <body class="bg-slate-950 text-slate-200 min-h-screen p-4 md:p-10 font-sans selection:bg-indigo-500/30">
        <!-- Animated Background -->
        <div class="fixed inset-0 -z-10 overflow-hidden">
            <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
            <div class="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-blue-600/10 blur-[100px] animate-bounce" style="animation-duration: 10s"></div>
            <div class="absolute -bottom-[10%] left-[20%] w-[50%] h-[30%] rounded-full bg-purple-600/20 blur-[120px]"></div>
        </div>

        <div class="w-full mx-auto space-y-8">
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-8">
                <div>
                    <h1 class="text-5xl font-black tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-500">
                        GROWTH<span class="text-indigo-500">ENGINE</span>.OS
                    </h1>
                    <div class="flex items-center gap-3">
                        <span class="relative flex h-3 w-3">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <p class="text-slate-400 text-sm font-medium tracking-wide uppercase">System Status: <span class="text-emerald-400">Autonomous & Online</span></p>
                    </div>
                </div>
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-6">
                    <div class="text-center">
                        <span class="block text-xs text-slate-500 font-bold uppercase mb-1">Last Cycle</span>
                        <span class="text-sm font-mono text-indigo-400">${new Date(data.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="h-8 w-px bg-white/10"></div>
                    <div class="text-center">
                        <span class="block text-xs text-slate-500 font-bold uppercase mb-1">Total Leads</span>
                        <span class="text-sm font-mono text-emerald-400">${leads.length}</span>
                    </div>
                </div>
            </header>
            
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <!-- Left Column: Strategy & Content -->
                <div class="xl:col-span-4 space-y-8">
                    <!-- Trend Card -->
                    <section class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg class="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
                        </div>
                        <h2 class="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span class="w-4 h-px bg-indigo-500"></span> Current Trend
                        </h2>
                        <p class="text-2xl font-bold text-white leading-tight mb-4">${data.trend.title}</p>
                        <div class="flex items-center gap-4">
                            <span class="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 uppercase">${data.trend.source}</span>
                            <a href="${data.trend.link}" target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Research Source &rarr;</a>
                        </div>

                        <div class="mt-10 space-y-6">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <span class="block text-[10px] text-slate-500 font-bold uppercase mb-2">Commercial Intent</span>
                                    <div class="flex items-end gap-1">
                                        <span class="text-3xl font-black text-white">${data.score.commercial_intent}</span>
                                        <span class="text-xs text-slate-500 mb-1">/10</span>
                                    </div>
                                </div>
                                <div class="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <span class="block text-[10px] text-slate-500 font-bold uppercase mb-2">Productability</span>
                                    <div class="flex items-end gap-1">
                                        <span class="text-3xl font-black text-purple-400">${data.score.productizability}</span>
                                        <span class="text-xs text-slate-500 mb-1">/10</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl">
                                <h3 class="text-xs font-bold text-indigo-300 uppercase mb-3 flex items-center gap-2">
                                    ✨ Autonomous Strategy
                                </h3>
                                <p class="text-sm text-indigo-100 font-medium leading-relaxed italic">"${data.score.reason}"</p>
                            </div>
                        </div>
                    </section>

                    <!-- Content Strategy -->
                    <section class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                        <h2 class="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span class="w-4 h-px bg-emerald-500"></span> Marketing Engine
                        </h2>
                        <div class="space-y-6">
                            <div class="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                <span class="block text-[10px] text-slate-500 font-bold uppercase mb-3">Twitter Thread</span>
                                <p class="text-xs text-slate-300 leading-relaxed">${data.content.twitter[0]}</p>
                            </div>
                            <div class="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                <span class="block text-[10px] text-slate-500 font-bold uppercase mb-3">LinkedIn Authority Post</span>
                                <div class="text-xs text-slate-300 leading-relaxed h-32 overflow-y-auto custom-scrollbar">
                                    ${data.content.linkedin}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Middle Column: Preview -->
                <div class="xl:col-span-5 flex flex-col gap-8">
                    <section class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex-1 flex flex-col overflow-hidden">
                        <div class="p-6 border-b border-white/5 flex items-center justify-between">
                             <h2 class="text-xs font-black text-pink-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span class="w-4 h-px bg-pink-500"></span> Live Deployment Preview
                            </h2>
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase">Live</span>
                            </div>
                        </div>
                        <div class="flex-1 p-4 bg-slate-950/50">
                            <iframe src="/preview/index.html" class="w-full h-full rounded-xl border border-white/10" title="Landing Page"></iframe>
                        </div>
                        <div class="p-6 bg-white/5 flex items-center justify-between">
                            <code class="text-[10px] text-slate-500">${data.liveUrl || 'local://preview'}</code>
                            <a href="${data.liveUrl || '/preview/index.html'}" target="_blank" class="bg-white text-slate-950 px-6 py-2 rounded-full text-xs font-black hover:bg-indigo-500 hover:text-white transition-all">VISIT SITE</a>
                        </div>
                    </section>
                </div>

                <!-- Right Column: Sales & CRM -->
                <div class="xl:col-span-3 space-y-8">
                    <!-- Outbound Sales -->
                    <section class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                        <h2 class="text-xs font-black text-orange-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span class="w-4 h-px bg-orange-500"></span> Sales Agent
                        </h2>
                        ${!data.sales ? '<p class="text-xs text-slate-500 italic">Thinking...</p>' : `
                        <div class="space-y-6">
                            <div>
                                <span class="block text-[10px] text-slate-500 font-bold uppercase mb-3">Target Personas</span>
                                <div class="flex flex-wrap gap-2">
                                    ${data.sales.target_personas.map(p => `<span class="bg-orange-500/10 text-orange-400 text-[10px] px-2 py-1 rounded-full border border-orange-500/20 font-bold">${p}</span>`).join('')}
                                </div>
                            </div>
                            <div class="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                <span class="block text-[10px] text-slate-500 font-bold uppercase mb-3">Email Outreach Draft</span>
                                <p class="text-[10px] font-black text-orange-300 mb-2">${data.sales.outreach_emails[0].subject}</p>
                                <p class="text-[11px] text-slate-400 leading-relaxed line-clamp-6 italic">"${data.sales.outreach_emails[0].body}"</p>
                            </div>
                        </div>
                        `}
                    </section>

                    <!-- Leads CRM -->
                    <section class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl flex-1 overflow-hidden">
                        <div class="flex items-center justify-between mb-8">
                            <h2 class="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span class="w-4 h-px bg-blue-500"></span> CRM Leads
                            </h2>
                            <span class="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg shadow-blue-500/20">${leads.length}</span>
                        </div>
                        <div class="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                            ${leads.length === 0 ? '<p class="text-xs text-slate-600 italic">Waiting for traffic...</p>' : leads.map(l => `
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                                    <p class="text-sm font-bold text-white mb-1 truncate">${l.email}</p>
                                    <div class="flex items-center justify-between">
                                        <span class="text-[9px] text-slate-500 uppercase font-black">${new Date(l.timestamp).toLocaleDateString()}</span>
                                        <span class="text-[9px] text-emerald-400 font-black uppercase tracking-tighter">Verified</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            </div>
        </div>

        <style>
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        </style>
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
