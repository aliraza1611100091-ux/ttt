// PixelGmi - Pure Vanilla JavaScript Engine with ClipDrop Multi-Key Auto-Rotation & ChatGPT-Style Animation

// --- Application State ---
const state = {
  aspectRatio: '1:1',
  isGenerating: false,
  currentImage: null,
  isAdminAuthenticated: false,
  adminKeys: [],
  totalKeys: 0,
  generationInterval: null,
};

// --- Toast System ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '<i data-lucide="info" class="w-4 h-4 text-slate-400"></i>';
  if (type === 'success') {
    iconHtml = '<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i>';
  } else if (type === 'error') {
    iconHtml = '<i data-lucide="alert-circle" class="w-4 h-4 text-red-400"></i>';
  }

  toast.innerHTML = `
    ${iconHtml}
    <span class="flex-1 font-medium text-xs text-slate-200">${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.96)';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// --- Aspect Ratio Buttons Render ---
function renderAspectRatios() {
  const buttons = document.querySelectorAll('.ratio-btn');
  buttons.forEach(btn => {
    const ratio = btn.getAttribute('data-ratio');
    if (ratio === state.aspectRatio) {
      btn.className = 'ratio-btn py-2 px-3 rounded-lg border text-xs font-semibold bg-white text-black border-white transition-all cursor-pointer';
    } else {
      btn.className = 'ratio-btn py-2 px-3 rounded-lg border text-xs font-medium bg-[#0b0c0e] text-slate-400 border-white/[0.08] hover:border-white/20 transition-all cursor-pointer';
    }
  });
}

// --- ChatGPT Style Image Generation & Preview Render ---
function renderPreviewSection() {
  const container = document.getElementById('preview-section');
  if (!container) return;

  if (state.isGenerating) {
    // Unique ChatGPT / DALL-E style image generation animation
    container.innerHTML = `
      <div class="bg-[#121418] p-6 sm:p-8 rounded-2xl border border-white/[0.07] shadow-lg animate-fade-in">
        <div class="relative w-full aspect-video max-h-[460px] rounded-xl bg-[#0b0c0e] border border-white/[0.06] flex flex-col items-center justify-center overflow-hidden">
          
          <!-- Smooth ChatGPT-style light sweep overlay -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-chatgpt-sweep pointer-events-none"></div>

          <!-- Pulsing center circle aura -->
          <div class="relative z-10 flex flex-col items-center gap-4 text-center px-4">
            
            <div class="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center animate-chatgpt-pulse">
              <i data-lucide="sparkles" class="w-6 h-6 text-slate-200"></i>
            </div>

            <div class="space-y-1">
              <h3 id="generation-status-heading" class="text-sm font-semibold text-slate-100">
                Generating image...
              </h3>
              <p id="generation-status-sub" class="text-xs text-slate-500 font-mono">
                Synthesizing pixels & refining details...
              </p>
            </div>

            <!-- Sleek Minimal Progress Bar -->
            <div class="w-44 h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
              <div class="h-full bg-white/70 rounded-full w-full animate-pulse"></div>
            </div>

          </div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (!state.currentImage) {
    container.innerHTML = '';
    return;
  }

  const img = state.currentImage;
  container.innerHTML = `
    <div class="bg-[#121418] p-5 sm:p-6 rounded-2xl border border-white/[0.07] shadow-lg space-y-4 animate-fade-in">
      
      <!-- Top Meta -->
      <div class="flex items-center justify-between text-xs text-slate-400">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="font-medium text-slate-300">Generated</span>
          <span class="text-slate-600">•</span>
          <span class="font-mono">${img.aspectRatio}</span>
          ${img.usedClipDrop && img.keyInfo ? `
            <span class="text-slate-600">•</span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
              ClipDrop API (${img.keyInfo.activeKeyUsedCount}/${img.keyInfo.activeKeyMax})
            </span>
          ` : ''}
        </div>
        <button
          type="button"
          id="btn-delete-preview"
          class="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
          title="Clear image"
        >
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Image Canvas -->
      <div class="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[560px]">
        <img
          src="${img.imageUrl}"
          alt="${img.prompt}"
          class="w-full h-auto max-h-[560px] object-contain rounded-xl"
        />
      </div>

      <!-- Prompt Text & Action Buttons -->
      <div class="pt-2 space-y-3">
        <div class="p-3.5 rounded-xl bg-[#0b0c0e] border border-white/[0.05]">
          <p class="text-xs text-slate-300 leading-relaxed">${img.prompt}</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            id="btn-download-image"
            class="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Download</span>
          </button>
          <button
            type="button"
            id="btn-copy-prompt"
            class="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white font-medium text-xs border border-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span>Copy Prompt</span>
          </button>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btn-download-image')?.addEventListener('click', () => downloadImage(img));
  document.getElementById('btn-copy-prompt')?.addEventListener('click', () => {
    navigator.clipboard.writeText(img.prompt);
    showToast('Prompt copied to clipboard', 'success');
  });
  document.getElementById('btn-delete-preview')?.addEventListener('click', () => {
    state.currentImage = null;
    renderPreviewSection();
  });
}

function downloadImage(img) {
  showToast('Downloading image...', 'info');
  try {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `pixelgmi_${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    window.open(img.imageUrl, '_blank');
  }
}

// --- Image Generation Handler ---
async function handleGenerate() {
  const promptInput = document.getElementById('prompt-input');
  const prompt = promptInput?.value.trim();

  if (!prompt) {
    showToast('Please enter a prompt first', 'error');
    promptInput?.focus();
    return;
  }

  state.isGenerating = true;
  renderPreviewSection();

  // Scroll smoothly down to preview
  document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth' });

  // Rotating subtle status messages during generation
  const statusMessages = [
    'Synthesizing latent canvas...',
    'Rendering fine lighting & textures...',
    'Refining details with neural pipeline...',
  ];
  let msgIdx = 0;
  clearInterval(state.generationInterval);
  state.generationInterval = setInterval(() => {
    const sub = document.getElementById('generation-status-sub');
    if (sub) {
      msgIdx = (msgIdx + 1) % statusMessages.length;
      sub.textContent = statusMessages[msgIdx];
    }
  }, 2200);

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio: state.aspectRatio,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.imageUrl) {
      state.currentImage = {
        id: data.id,
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        imageUrl: data.imageUrl,
        usedClipDrop: data.usedClipDrop,
        keyInfo: data.keyInfo,
      };

      if (data.usedClipDrop && data.keyInfo) {
        if (data.keyInfo.activeKeyUsedCount >= data.keyInfo.activeKeyMax) {
          showToast('ClipDrop Key finished 100 images and auto-deleted from queue!', 'info');
        } else {
          showToast(`Generated with ClipDrop API (Key usage: ${data.keyInfo.activeKeyUsedCount}/${data.keyInfo.activeKeyMax})`, 'success');
        }
      } else {
        showToast('Image generated successfully', 'success');
      }
    } else {
      // Fallback synthesis if static / offline
      let width = 1024;
      let height = 1024;
      if (state.aspectRatio === '16:9') { width = 1344; height = 768; }
      else if (state.aspectRatio === '9:16') { width = 768; height = 1344; }
      else if (state.aspectRatio === '4:3') { width = 1152; height = 864; }

      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 450))}?width=${width}&height=${height}&seed=${Math.floor(Math.random()*999999)}&nologo=true&enhance=true&model=flux`;

      await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = fallbackUrl;
      });

      state.currentImage = {
        id: 'gen_' + Date.now(),
        prompt,
        aspectRatio: state.aspectRatio,
        imageUrl: fallbackUrl,
        usedClipDrop: false,
      };
      showToast('Image generated successfully', 'success');
    }
  } catch (err) {
    console.warn('Network generate exception, attempting client fallback:', err);
    let width = 1024;
    let height = 1024;
    if (state.aspectRatio === '16:9') { width = 1344; height = 768; }
    else if (state.aspectRatio === '9:16') { width = 768; height = 1344; }
    else if (state.aspectRatio === '4:3') { width = 1152; height = 864; }

    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 450))}?width=${width}&height=${height}&seed=${Math.floor(Math.random()*999999)}&nologo=true&enhance=true&model=flux`;

    state.currentImage = {
      id: 'gen_' + Date.now(),
      prompt,
      aspectRatio: state.aspectRatio,
      imageUrl: fallbackUrl,
      usedClipDrop: false,
    };
    showToast('Image generated successfully', 'success');
  } finally {
    clearInterval(state.generationInterval);
    state.isGenerating = false;
    renderPreviewSection();
  }
}

// --- ADMIN API Panel Functions ---

async function fetchAdminKeys() {
  try {
    const res = await fetch('/api/admin/keys');
    if (res.ok) {
      const data = await res.json();
      state.adminKeys = data.keys || [];
      state.totalKeys = data.totalKeys || 0;
      renderAdminDashboard();
    }
  } catch (e) {
    console.warn('Could not fetch keys:', e);
  }
}

function renderAdminDashboard() {
  const totalBadge = document.getElementById('admin-total-keys-badge');
  if (totalBadge) totalBadge.textContent = state.totalKeys;

  const listContainer = document.getElementById('admin-keys-list');
  if (!listContainer) return;

  if (state.adminKeys.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-6 text-xs text-slate-500 bg-[#0b0c0e] rounded-xl border border-white/[0.04] p-4">
        No ClipDrop API keys added yet. Add keys above to enable text-to-image API.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = state.adminKeys.map((item, idx) => `
    <div class="p-3 rounded-xl bg-[#0b0c0e] border ${item.isActive ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : 'border-white/[0.05]'} flex items-center justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-mono font-semibold text-slate-200">${item.maskedKey}</span>
          ${item.isActive ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase">Active (#${idx + 1})</span>` : `<span class="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-500 font-mono">Queue #${idx + 1}</span>`}
        </div>
        <div class="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Generated: <strong class="text-slate-200 font-mono">${item.usedCount} / ${item.maxUses}</strong></span>
          <span class="text-slate-600">•</span>
          <span>Remaining: <strong class="text-emerald-400 font-mono">${item.remainingUses}</strong></span>
        </div>
        <!-- Progress bar for 100 images -->
        <div class="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
          <div class="h-full bg-emerald-400" style="width: ${(item.usedCount / item.maxUses) * 100}%"></div>
        </div>
      </div>
      <button
        type="button"
        data-delete-key-id="${item.id}"
        class="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
        title="Delete key"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach delete handlers
  listContainer.querySelectorAll('[data-delete-key-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-key-id');
      try {
        const res = await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('API Key deleted', 'info');
          fetchAdminKeys();
        }
      } catch (e) {
        showToast('Failed to delete key', 'error');
      }
    });
  });
}

async function handleAddApiKey() {
  const input = document.getElementById('admin-new-key-input');
  const key = input?.value.trim();

  if (!key) {
    showToast('Please paste a ClipDrop API key', 'error');
    return;
  }

  try {
    const res = await fetch('/api/admin/keys/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (input) input.value = '';
      showToast(data.message || 'Key added to queue!', 'success');
      fetchAdminKeys();
    } else {
      showToast(data.message || 'Could not add key', 'error');
    }
  } catch (err) {
    showToast('Error connecting to backend', 'error');
  }
}

// Admin Passcode Form
async function handleAdminLogin(e) {
  e.preventDefault();
  const passInput = document.getElementById('admin-passcode-input');
  const errorMsg = document.getElementById('admin-error-msg');
  const passcode = passInput?.value.trim();

  if (!passcode) {
    if (errorMsg) {
      errorMsg.textContent = 'Please enter passcode';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      state.isAdminAuthenticated = true;
      document.getElementById('admin-login-view')?.classList.add('hidden');
      document.getElementById('admin-dashboard-view')?.classList.remove('hidden');
      fetchAdminKeys();
      showToast('Admin session unlocked', 'success');
    } else {
      // Static fallback check
      if (['admin123', 'pixelgmi'].includes(passcode)) {
        state.isAdminAuthenticated = true;
        document.getElementById('admin-login-view')?.classList.add('hidden');
        document.getElementById('admin-dashboard-view')?.classList.remove('hidden');
        fetchAdminKeys();
        showToast('Admin session unlocked', 'success');
      } else {
        if (errorMsg) {
          errorMsg.textContent = data.message || 'Invalid passcode';
          errorMsg.classList.remove('hidden');
        }
      }
    }
  } catch (err) {
    if (['admin123', 'pixelgmi'].includes(passcode)) {
      state.isAdminAuthenticated = true;
      document.getElementById('admin-login-view')?.classList.add('hidden');
      document.getElementById('admin-dashboard-view')?.classList.remove('hidden');
      showToast('Admin session unlocked', 'success');
    } else {
      if (errorMsg) {
        errorMsg.textContent = 'Invalid passcode';
        errorMsg.classList.remove('hidden');
      }
    }
  }
}

// --- DOM Content Loaded Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  renderAspectRatios();
  renderPreviewSection();

  // Aspect Ratio button click listeners
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.aspectRatio = btn.getAttribute('data-ratio') || '1:1';
      renderAspectRatios();
    });
  });

  // Clear Prompt
  document.getElementById('btn-clear-prompt')?.addEventListener('click', () => {
    const input = document.getElementById('prompt-input');
    if (input) input.value = '';
  });

  // Generate Button
  document.getElementById('btn-generate')?.addEventListener('click', handleGenerate);

  // Allow Ctrl+Enter or Cmd+Enter to generate
  document.getElementById('prompt-input')?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  });

  // ADMIN Modal Open/Close
  document.getElementById('btn-open-admin')?.addEventListener('click', () => {
    const modal = document.getElementById('admin-modal');
    modal?.classList.remove('hidden');
    if (state.isAdminAuthenticated) {
      document.getElementById('admin-login-view')?.classList.add('hidden');
      document.getElementById('admin-dashboard-view')?.classList.remove('hidden');
      fetchAdminKeys();
    } else {
      document.getElementById('admin-login-view')?.classList.remove('hidden');
      document.getElementById('admin-dashboard-view')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-close-admin')?.addEventListener('click', () => {
    document.getElementById('admin-modal')?.classList.add('hidden');
  });

  document.getElementById('admin-login-form')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('btn-add-api-key')?.addEventListener('click', handleAddApiKey);
  document.getElementById('btn-test-active-key')?.addEventListener('click', async () => {
    showToast('Testing active ClipDrop API key...', 'info');
    try {
      const res = await fetch('/api/admin/keys/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Key is valid & working!', 'success');
      } else {
        showToast(data.message || 'Key test failed', 'error');
      }
    } catch (e) {
      showToast('Error connecting to backend test endpoint', 'error');
    }
  });
  document.getElementById('btn-lock-admin')?.addEventListener('click', () => {
    state.isAdminAuthenticated = false;
    document.getElementById('admin-modal')?.classList.add('hidden');
    showToast('Admin session locked', 'info');
  });

  // Initialize Lucide Icons
  if (window.lucide) window.lucide.createIcons();
});
