require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ELEVENLABS_API_KEY;
// We will dynamically fetch the first available voice ID from the user's account
let defaultVoiceId = null;

const OUTPUT_DIR = path.join(__dirname, '..', 'scratch', 'voiceovers');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const scripts = [
  { id: 'scene1', text: "Idonneous proudly presents RetailEdge Pro, empowering learning and driving performance." },
  { id: 'scene2', text: "Secure role-based access provides every stakeholder with a personalized learning experience." },
  { id: 'scene3', text: "Leadership teams gain enterprise-wide visibility into performance and business impact." },
  { id: 'scene4', text: "Operational leaders monitor execution excellence and workforce productivity." },
  { id: 'scene5', text: "Regional performance and compliance insights are available in real time." },
  { id: 'scene6', text: "Manage projects, trainers, schedules, and reporting from a unified interface." },
  { id: 'scene7', text: "Deliver engaging content and drive learner success." },
  { id: 'scene8', text: "Track attendance, readiness, and team development." },
  { id: 'scene9', text: "Access learning anytime and anywhere to build capability continuously." },
  { id: 'scene10', text: "RetailEdge Pro transforms workforce data into actionable insights." },
  { id: 'scene11', text: "Interactive learning experiences improve engagement and knowledge retention." },
  { id: 'scene12', text: "Artificial intelligence enables proactive workforce development." },
  { id: 'scene13', text: "RetailEdge Pro delivers learning wherever work happens." },
  { id: 'scene14', text: "Organizations achieve measurable improvements in productivity and performance." },
  { id: 'scene15', text: "RetailEdge Pro is more than a learning platform. It is a complete workforce enablement ecosystem." }
];

const https = require('https');

async function generateAudio(id, text) {
  const outputFile = path.join(OUTPUT_DIR, `${id}.mp3`);
  
  if (fs.existsSync(outputFile)) {
    console.log(`Audio for ${id} already exists. Skipping...`);
    return outputFile;
  }

  if (!API_KEY) {
    console.warn(`[WARNING] No ELEVENLABS_API_KEY found in .env. Creating blank dummy audio for ${id}.`);
    fs.writeFileSync(outputFile, '');
    return outputFile;
  }

  console.log(`Generating audio for ${id}...`);
  try {
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${defaultVoiceId}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          let errorData = '';
          res.on('data', chunk => errorData += chunk);
          res.on('end', () => reject(new Error(`HTTP Error: ${res.statusCode} - ${errorData}`)));
          return;
        }

        const file = fs.createWriteStream(outputFile);
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Saved ${outputFile}`);
          resolve();
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error(`❌ Error generating ${id}:`, err.message);
  }
}

async function fetchFirstVoice() {
  if (!API_KEY) return null;
  console.log('Fetching available voices...');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/voices',
      method: 'GET',
      headers: { 'xi-api-key': API_KEY }
    };
    https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.voices && parsed.voices.length > 0) {
            // Find Sarah or use the first available voice that isn't Adam
            const voice = parsed.voices.find(v => v.name === 'Sarah') || parsed.voices.find(v => v.voice_id !== 'pNInz6obpgDQGcFmaJcg') || parsed.voices[0];
            console.log(`Using voice: ${voice.name} (${voice.voice_id})`);
            resolve(voice.voice_id);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null)).end();
  });
}

async function run() {
  console.log('Starting ElevenLabs Voiceover Generation...');
  defaultVoiceId = await fetchFirstVoice();
  if (!defaultVoiceId) {
    console.error('❌ Could not find a valid Voice ID for this account. Exiting.');
    return;
  }
  for (const script of scripts) {
    await generateAudio(script.id, script.text);
    // Slight delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Voiceover generation complete!');
}

run();
