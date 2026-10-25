import { timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_OWNER = process.env.REPO_OWNER || 'rhmt-ofc';
const REPO_NAME = process.env.REPO_NAME || 'My-portofolio';
const REPO_BRANCH = process.env.REPO_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'rahmat2026';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = createHash('sha256').update(a).digest();
  const bufB = createHash('sha256').update(b).digest();
  return timingSafeEqual(bufA, bufB);
}

function getProvidedKey(req) {
  const headerKey = req.headers?.['x-admin-key'] || req.headers?.['x-admin-pin'];
  if (headerKey) return String(headerKey).trim();
  const auth = req.headers?.['authorization'];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  if (req.body && typeof req.body === 'object' && req.body.secretKey) {
    return String(req.body.secretKey).trim();
  }
  return '';
}

async function fetchFromGitHub(filePath) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${REPO_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'R-HMT-Admin-Dashboard'
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub GET ${filePath} gagal (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { sha: data.sha, json: JSON.parse(content) };
}

async function commitToGitHub(filePath, updatedJson, commitMsg) {
  // 1. Get latest SHA
  const current = await fetchFromGitHub(filePath);
  const formatted = JSON.stringify(updatedJson, null, 2) + '\n';
  const base64Content = Buffer.from(formatted, 'utf-8').toString('base64');

  const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'R-HMT-Admin-Dashboard'
    },
    body: JSON.stringify({
      message: commitMsg,
      content: base64Content,
      sha: current.sha,
      branch: REPO_BRANCH
    })
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub PUT ${filePath} gagal (${putRes.status}): ${errText}`);
  }

  const putData = await putRes.json();

  // Try updating local file if running on filesystem / VPS
  try {
    const localPath = path.resolve(process.cwd(), filePath);
    await fs.writeFile(localPath, formatted, 'utf-8');
  } catch {
    // Read-only serverless environment is fine
  }

  return putData;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Verify Admin Key
  const providedKey = getProvidedKey(req);
  if (!safeCompare(providedKey, ADMIN_SECRET)) {
    return res.status(401).json({
      error: 'Akses ditolak: PIN / Secret Key admin salah.',
      authenticated: false
    });
  }

  // Handle GET - Return current projects & profile data
  if (req.method === 'GET') {
    try {
      let contentData = null;
      let profileData = null;

      try {
        const ghContent = await fetchFromGitHub('shared/content.json');
        contentData = ghContent.json;
      } catch (e) {
        // Fallback to local file if GitHub API fails
        const raw = await fs.readFile(path.resolve(process.cwd(), 'shared/content.json'), 'utf-8');
        contentData = JSON.parse(raw);
      }

      try {
        const ghProfile = await fetchFromGitHub('shared/profile.json');
        profileData = ghProfile.json;
      } catch (e) {
        const raw = await fs.readFile(path.resolve(process.cwd(), 'shared/profile.json'), 'utf-8');
        profileData = JSON.parse(raw);
      }

      return res.status(200).json({
        success: true,
        authenticated: true,
        repo: `${REPO_OWNER}/${REPO_NAME}`,
        branch: REPO_BRANCH,
        projects: contentData.PROJECTS || [],
        profile: profileData,
        categories: [...new Set((contentData.PROJECTS || []).map(p => p.category))].filter(Boolean)
      });
    } catch (err) {
      return res.status(500).json({ error: 'Gagal memuat data dari repositori: ' + err.message });
    }
  }

  // Handle POST - Actions (save_project, delete_project, update_profile)
  if (req.method === 'POST') {
    const { action, project, id, profile: profileUpdate } = req.body || {};

    try {
      if (action === 'save_project') {
        if (!project || !project.name) {
          return res.status(400).json({ error: 'Data project tidak lengkap. Kolom "Nama Project" wajib diisi.' });
        }

        // Fetch current content.json from GitHub
        const { json: contentData } = await fetchFromGitHub('shared/content.json');
        if (!Array.isArray(contentData.PROJECTS)) {
          contentData.PROJECTS = [];
        }

        const projectId = (project.id || project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'project-' + Date.now();
        
        // Parse ecosystem (tech stack)
        let ecosystem = [];
        if (Array.isArray(project.ecosystem)) {
          ecosystem = project.ecosystem.map(t => String(t).trim()).filter(Boolean);
        } else if (typeof project.ecosystem === 'string') {
          ecosystem = project.ecosystem.split(/[,·|]/).map(t => t.trim()).filter(Boolean);
        }

        const cleanProject = {
          id: projectId,
          name: String(project.name).trim(),
          category: String(project.category || 'Utilities').trim(),
          url: String(project.url || '').trim(),
          description: String(project.description || '').trim(),
          problem: String(project.problem || 'Eksplorasi pembuatan aplikasi yang fungsional dan relevan.').trim(),
          exploration: String(project.exploration || 'Pengembangan fitur dan alur kerja menggunakan teknologi modern.').trim(),
          outcome: String(project.outcome || 'Tercatat sebagai bagian dari portofolio karya mandiri.').trim(),
          ecosystem: ecosystem.length ? ecosystem : ['Web'],
          summary: String(project.summary || project.description || '').trim().slice(0, 100),
          status: String(project.status || 'ONLINE_UNVERIFIED').trim(),
          type: String(project.type || 'work').trim(),
          visualType: String(project.visualType || 'illustrative').trim()
        };

        const existingIdx = contentData.PROJECTS.findIndex(p => p.id === projectId);
        let actionLabel = 'add';
        if (existingIdx >= 0) {
          contentData.PROJECTS[existingIdx] = { ...contentData.PROJECTS[existingIdx], ...cleanProject };
          actionLabel = 'update';
        } else {
          // Add to beginning of projects
          contentData.PROJECTS.unshift(cleanProject);
        }

        const commitResult = await commitToGitHub(
          'shared/content.json',
          contentData,
          `feat(projects): ${actionLabel} "${cleanProject.name}" via admin dashboard`
        );

        return res.status(200).json({
          success: true,
          action: actionLabel,
          project: cleanProject,
          commit: commitResult.commit?.html_url || commitResult.commit?.sha
        });
      }

      if (action === 'delete_project') {
        if (!id) {
          return res.status(400).json({ error: 'ID project yang akan dihapus tidak ditentukan.' });
        }

        const { json: contentData } = await fetchFromGitHub('shared/content.json');
        const prevCount = (contentData.PROJECTS || []).length;
        const target = (contentData.PROJECTS || []).find(p => p.id === id);
        contentData.PROJECTS = (contentData.PROJECTS || []).filter(p => p.id !== id);

        if (contentData.PROJECTS.length === prevCount) {
          return res.status(404).json({ error: `Project dengan ID "${id}" tidak ditemukan.` });
        }

        const commitResult = await commitToGitHub(
          'shared/content.json',
          contentData,
          `feat(projects): remove project "${target?.name || id}" via admin dashboard`
        );

        return res.status(200).json({
          success: true,
          deletedId: id,
          deletedName: target?.name || id,
          commit: commitResult.commit?.html_url || commitResult.commit?.sha
        });
      }

      if (action === 'update_profile') {
        if (!profileUpdate || typeof profileUpdate !== 'object') {
          return res.status(400).json({ error: 'Data profil tidak valid.' });
        }

        const { json: currentProfile } = await fetchFromGitHub('shared/profile.json');
        
        // Merge allowed profile fields
        if (profileUpdate.role !== undefined) currentProfile.role = String(profileUpdate.role).trim();
        if (profileUpdate.about !== undefined) currentProfile.about = String(profileUpdate.about).trim();
        if (profileUpdate.approach !== undefined) currentProfile.approach = String(profileUpdate.approach).trim();
        if (profileUpdate.ethos !== undefined) currentProfile.ethos = String(profileUpdate.ethos).trim();
        if (profileUpdate.motivation !== undefined) currentProfile.motivation = String(profileUpdate.motivation).trim();
        if (profileUpdate.avatarUrl !== undefined && profileUpdate.avatarUrl.trim()) {
          // If custom avatar URL is provided
          currentProfile.avatar = String(profileUpdate.avatarUrl).trim();
        }

        const commitResult = await commitToGitHub(
          'shared/profile.json',
          currentProfile,
          `feat(profile): update bio & details via admin dashboard`
        );

        return res.status(200).json({
          success: true,
          profile: currentProfile,
          commit: commitResult.commit?.html_url || commitResult.commit?.sha
        });
      }

      return res.status(400).json({ error: `Aksi "${action}" tidak dikenali.` });
    } catch (err) {
      return res.status(500).json({ error: 'Operasi gagal: ' + err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
