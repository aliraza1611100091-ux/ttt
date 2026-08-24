// PixelGmi - Pure Node.js Express Backend with ClipDrop Auto-Rotation Multi-Key Manager
// Run with: node server.js

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

// Persistent Key Storage file
const KEYS_FILE = path.join(__dirname, 'clipdrop_keys.json');

let clipdropKeys = [];

function loadKeysFromFile() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf-8');
      clipdropKeys = JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not read clipdrop_keys.json, initializing empty queue:', err);
    clipdropKeys = [];
  }
}

function saveKeysToFile() {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(clipdropKeys, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write to clipdrop_keys.json:', err);
  }
}

loadKeysFromFile();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    totalKeys: clipdropKeys.length,
    activeKeyUsed: clipdropKeys.length > 0 ? clipdropKeys[0].usedCount : 0,
  });
});

// Admin Passcode Verify
app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body;
  const validPasscodes = ['admin123', 'pixelgmi', process.env.ADMIN_KEY].filter(Boolean);

  if (passcode && validPasscodes.includes(passcode.trim())) {
    res.json({
      success: true,
      token: 'admin_auth_' + Date.now(),
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid Admin passcode. Default: admin123',
    });
  }
});

// Admin: Get Keys Queue Status
app.get('/api/admin/keys', (req, res) => {
  const maskedList = clipdropKeys.map((item, index) => ({
    id: item.id,
    maskedKey: item.key.length > 10 ? `${item.key.slice(0, 6)}...${item.key.slice(-4)}` : '••••••••',
    usedCount: item.usedCount,
    maxUses: item.maxUses || 100,
    remainingUses: Math.max(0, (item.maxUses || 100) - item.usedCount),
    isActive: index === 0,
    addedAt: item.addedAt,
  }));

  res.json({
    success: true,
    totalKeys: clipdropKeys.length,
    keys: maskedList,
  });
});

// Admin: Add API Key(s)
app.post('/api/admin/keys/add', (req, res) => {
  const { apiKey, apiKeys } = req.body;
  const keysToAdd = [];

  if (typeof apiKey === 'string' && apiKey.trim()) {
    keysToAdd.push(apiKey.trim());
  }

  if (Array.isArray(apiKeys)) {
    apiKeys.forEach((k) => {
      if (typeof k === 'string' && k.trim()) keysToAdd.push(k.trim());
    });
  } else if (typeof apiKeys === 'string') {
    apiKeys.split(/[\n,]+/).forEach((k) => {
      if (k.trim()) keysToAdd.push(k.trim());
    });
  }

  if (keysToAdd.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide a valid ClipDrop API key' });
  }

  let addedCount = 0;
  for (const rawKey of keysToAdd) {
    const trimmed = rawKey.trim();
    if (!trimmed) continue;
    const exists = clipdropKeys.some(item => item.key === trimmed);
    if (!exists) {
      clipdropKeys.push({
        id: 'cdk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        key: trimmed,
        usedCount: 0,
        maxUses: 100,
        addedAt: Date.now(),
      });
      addedCount++;
    }
  }

  saveKeysToFile();

  res.json({
    success: true,
    addedCount,
    totalKeys: clipdropKeys.length,
    message: `Successfully added ${addedCount} ClipDrop API key(s). Each key will generate up to 100 images before automatic deletion.`,
  });
});

// Admin: Delete a Key
app.delete('/api/admin/keys/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = clipdropKeys.length;
  clipdropKeys = clipdropKeys.filter(k => k.id !== id);
  saveKeysToFile();

  res.json({
    success: true,
    deleted: initialLen > clipdropKeys.length,
    totalKeys: clipdropKeys.length,
  });
});

// Admin: Test Active Key with ClipDrop API
app.post('/api/admin/keys/test', async (req, res) => {
  if (clipdropKeys.length === 0) {
    return res.status(400).json({ success: false, message: 'No ClipDrop API keys available in queue to test.' });
  }

  const activeKeyItem = clipdropKeys[0];
  try {
    const formData = new FormData();
    formData.append('prompt', 'test minimal circle');

    const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
      method: 'POST',
      headers: {
        'x-api-key': activeKeyItem.key,
      },
      body: formData,
    });

    if (response.ok) {
      res.json({
        success: true,
        message: `ClipDrop API Key is VALID and ACTIVE! (Key: ${activeKeyItem.key.slice(0, 6)}...${activeKeyItem.key.slice(-4)})`,
        keyId: activeKeyItem.id,
        status: response.status,
      });
    } else {
      const errText = await response.text();
      res.status(response.status).json({
        success: false,
        message: `ClipDrop API returned error ${response.status}: ${errText}`,
        keyId: activeKeyItem.id,
        status: response.status,
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Connection error to ClipDrop API: ${err.message}`,
    });
  }
});

// Generate Image Endpoint using ClipDrop text-to-image API
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const cleanPrompt = prompt.trim();
    let generatedImageUrl = '';
    let usedClipDrop = false;
    let clipDropError = null;
    let keyInfo = null;

    console.log(`[Generate Request] Total ClipDrop Keys in Queue: ${clipdropKeys.length}`);

    // Loop through ClipDrop keys queue if available
    while (clipdropKeys.length > 0) {
      const activeKeyItem = clipdropKeys[0];
      console.log(`[ClipDrop Request] Using Key ID: ${activeKeyItem.id}, Current Count: ${activeKeyItem.usedCount}/${activeKeyItem.maxUses}`);
      
      try {
        const formData = new FormData();
        formData.append('prompt', cleanPrompt);

        // Correct ClipDrop official endpoint: https://clipdrop-api.co/text-to-image/v1
        const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
          method: 'POST',
          headers: {
            'x-api-key': activeKeyItem.key,
          },
          body: formData,
        });

        console.log(`[ClipDrop Response Status] ${response.status} ${response.statusText}`);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = response.headers.get('content-type') || 'image/png';
          generatedImageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
          usedClipDrop = true;

          // Increment count for this key
          activeKeyItem.usedCount += 1;
          const currentCount = activeKeyItem.usedCount;
          const maxCount = activeKeyItem.maxUses || 100;

          // Check if 100 images limit is reached
          if (currentCount >= maxCount) {
            console.log(`[ClipDrop Key 100 Finished] Key ${activeKeyItem.id} reached 100 images. Deleting from backend.`);
            clipdropKeys.shift(); // Remove completed key from queue
          }

          saveKeysToFile();

          keyInfo = {
            activeKeyMasked: activeKeyItem.key.length > 10 ? `${activeKeyItem.key.slice(0, 6)}...${activeKeyItem.key.slice(-4)}` : '••••••••',
            activeKeyUsedCount: currentCount,
            activeKeyMax: maxCount,
            remainingKeyUses: Math.max(0, maxCount - currentCount),
            totalKeysRemaining: clipdropKeys.length,
          };

          break; // Successfully generated with ClipDrop!
        } else {
          const errText = await response.text();
          console.warn(`[ClipDrop Error] Status ${response.status} with Key ${activeKeyItem.id}:`, errText);
          clipDropError = `ClipDrop API error (${response.status}): ${errText}`;

          if (response.status === 401 || response.status === 402 || response.status === 403 || response.status === 429) {
            console.log(`[ClipDrop Key Exhausted/Invalid ${response.status}] Removing key ${activeKeyItem.id} from queue and trying next key.`);
            clipdropKeys.shift();
            saveKeysToFile();
            continue; // Try next key in queue
          } else {
            break;
          }
        }
      } catch (keyErr) {
        console.error('[ClipDrop Exception]:', keyErr);
        clipDropError = keyErr.message;
        break;
      }
    }

    // High quality fallback if no keys configured or external failure
    if (!generatedImageUrl) {
      let width = 1024;
      let height = 1024;
      if (aspectRatio === '16:9') { width = 1344; height = 768; }
      else if (aspectRatio === '9:16') { width = 768; height = 1344; }
      else if (aspectRatio === '4:3') { width = 1152; height = 864; }

      const seed = Math.floor(Math.random() * 999999);
      const encodedPrompt = encodeURIComponent(cleanPrompt.slice(0, 450));
      generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;
    }

    const id = 'gen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    res.json({
      success: true,
      id,
      imageUrl: generatedImageUrl,
      prompt: cleanPrompt,
      aspectRatio,
      usedClipDrop,
      clipDropError,
      keyInfo,
    });
  } catch (err) {
    console.error('Error in /api/generate-image:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate image',
    });
  }
});

// Fallback index.html route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PixelGmi Server listening on http://0.0.0.0:${PORT}`);
});
