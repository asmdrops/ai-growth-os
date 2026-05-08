const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
// Serve the generated landing pages directly
app.use('/preview', express.static(path.join(__dirname, 'output')));

app.get('/', (req, res) => {
    let data = null;
    try {
        const raw = fs.readFileSync(path.join(__dirname, 'output', 'data.json'));
        data = JSON.parse(raw);
    } catch (e) {
        // No data yet
    }

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
    <body class="bg-slate-900 text-white min-h-screen p-8 font-sans">
        <div class="max-w-6xl mx-auto space-y-6">
            <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                🚀 AI Growth Engine OS
            </h1>
            <p class="text-slate-400">Last updated: ${new Date(data.timestamp).toLocaleString()}</p>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Trend Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 class="text-xl font-semibold mb-4 text-blue-400">🔍 Trend Detected</h2>
                    <p class="font-medium text-lg">${data.trend.title}</p>
                    <a href="${data.trend.link}" target="_blank" class="text-sm text-indigo-400 hover:underline mt-2 inline-block">Source Link &rarr;</a>
                    
                    <div class="mt-6 pt-6 border-t border-slate-700">
                        <h2 class="text-xl font-semibold mb-4 text-yellow-400">🧠 AI Evaluation</h2>
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-3xl font-bold">${data.score.potential}/10</span>
                            <span class="text-sm text-slate-400 uppercase tracking-wide">Money Potential</span>
                        </div>
                        <p class="text-slate-300 text-sm italic mb-4">"${data.score.reason}"</p>
                        <div class="bg-indigo-900/50 p-3 rounded-lg border border-indigo-500/30">
                            <span class="block text-xs text-indigo-300 uppercase font-bold mb-1">Monetization Idea:</span>
                            <span class="text-indigo-100">${data.score.monetization_idea}</span>
                        </div>
                    </div>
                </div>

                <!-- Content Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 class="text-xl font-semibold mb-4 text-emerald-400">📝 Generated Content</h2>
                    
                    <h3 class="font-bold text-slate-300 mb-2">🐦 Twitter Thread</h3>
                    <div class="space-y-3 mb-6">
                        ${data.content.twitter.map(t => `<div class="bg-slate-700/50 p-3 rounded border border-slate-600 text-sm">${t}</div>`).join('')}
                    </div>

                    <h3 class="font-bold text-slate-300 mb-2">💼 LinkedIn Post</h3>
                    <div class="bg-slate-700/50 p-3 rounded border border-slate-600 text-sm whitespace-pre-wrap">${data.content.linkedin}</div>
                </div>

                <!-- Preview Panel -->
                <div class="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:col-span-1 h-[600px] flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold text-pink-400">🏗️ Landing Page</h2>
                        <a href="/preview/index.html" target="_blank" class="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition">Open Fullscreen</a>
                    </div>
                    <iframe src="/preview/index.html" class="flex-1 w-full bg-white rounded border-2 border-slate-600" title="Landing Page Preview"></iframe>
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
