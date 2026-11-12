import { timingSafeEqual, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_OWNER = process.env.REPO_OWNER || 'rhmt-ofc';
const REPO_NAME = process.env.REPO_NAME || 'My-portofolio';
const REPO_BRANCH = process.env.REPO_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || '';
const REDIS_PREFIX = 'rhmt:{ratings}:v23:';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const strA = a.trim();
  const strB = b.trim();
  const bufA = createHash('sha256').update(strA).digest();
  const bufB = createHash('sha256').update(strB).digest();
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

function verifyAdmin(req) {
  const providedKey = getProvidedKey(req);
  if (!providedKey) return false;
  const adminSecret = (process.env.ADMIN_SECRET_KEY || '').trim();
  if (!adminSecret) return false;
  return safeCompare(providedKey, adminSecret);
}

async function redisCommand(command, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command, ...args])
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('Redis command failed:', err.message);
    return null;
  }
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify Admin Key
  if (!verifyAdmin(req)) {
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
          icon: String(project.icon || '').trim(),
          banner: String(project.banner || '').trim(),
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

      if (action === 'move_to_front') {
        if (!id) {
          return res.status(400).json({ error: 'ID project yang akan dipindahkan tidak ditentukan.' });
        }

        const { json: contentData } = await fetchFromGitHub('shared/content.json');
        if (!Array.isArray(contentData.PROJECTS)) {
          return res.status(400).json({ error: 'Daftar project tidak ditemukan.' });
        }

        const index = contentData.PROJECTS.findIndex(p => p.id === id);
        if (index === -1) {
          return res.status(404).json({ error: `Project dengan ID "${id}" tidak ditemukan.` });
        }

        const [target] = contentData.PROJECTS.splice(index, 1);
        contentData.PROJECTS.unshift(target);

        const commitResult = await commitToGitHub(
          'shared/content.json',
          contentData,
          `feat(projects): rotate "${target.name}" to front via admin dashboard`
        );

        return res.status(200).json({
          success: true,
          movedId: id,
          movedName: target.name,
          projects: contentData.PROJECTS,
          commit: commitResult.commit?.html_url || commitResult.commit?.sha
        });
      }

      if (action === 'move_step') {
        const { direction } = req.body || {};
        if (!id || !['up', 'down'].includes(direction)) {
          return res.status(400).json({ error: 'Parameter id dan direction ("up" / "down") diperlukan.' });
        }

        const { json: contentData } = await fetchFromGitHub('shared/content.json');
        const index = (contentData.PROJECTS || []).findIndex(p => p.id === id);
        if (index === -1) {
          return res.status(404).json({ error: `Project dengan ID "${id}" tidak ditemukan.` });
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < contentData.PROJECTS.length) {
          const temp = contentData.PROJECTS[index];
          contentData.PROJECTS[index] = contentData.PROJECTS[targetIndex];
          contentData.PROJECTS[targetIndex] = temp;

          const commitResult = await commitToGitHub(
            'shared/content.json',
            contentData,
            `feat(projects): reorder "${temp.name}" ${direction} via admin dashboard`
          );

          return res.status(200).json({
            success: true,
            movedId: id,
            projects: contentData.PROJECTS,
            commit: commitResult.commit?.html_url || commitResult.commit?.sha
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Posisi tidak berubah.',
          projects: contentData.PROJECTS
        });
      }

      if (action === 'detect_icon') {
        const { url: targetUrl } = req.body || {};
        if (!targetUrl) {
          return res.status(400).json({ error: 'URL website tidak ditentukan.' });
        }

        try {
          const fetched = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(4000)
          });
          const html = await fetched.text();
          
          // Match icon links in head
          const head = html.slice(0, 20000);
          const iconMatch = head.match(/<link[^>]+rel=["']?(?:shortcut )?icon|apple-touch-icon["']?[^>]*>/i);
          let foundIcon = '';
          if (iconMatch) {
            const hrefMatch = iconMatch[0].match(/href=["']?([^\s"'>]+)/i);
            if (hrefMatch) {
              foundIcon = new URL(hrefMatch[1], targetUrl).href;
            }
          }

          if (!foundIcon) {
            // Check default /favicon.ico
            try {
              const icoUrl = new URL('/favicon.ico', targetUrl).href;
              const icoRes = await fetch(icoUrl, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
              if (icoRes.ok && !icoRes.headers.get('content-type')?.includes('text/html')) {
                foundIcon = icoUrl;
              }
            } catch {}
          }

          return res.status(200).json({
            success: true,
            iconUrl: foundIcon || null,
            message: foundIcon ? 'Favicon resmi ditemukan!' : 'Website ini tidak memiliki tag icon/favicon resmi.'
          });
        } catch (err) {
          return res.status(200).json({
            success: false,
            iconUrl: null,
            message: 'Gagal mendeteksi icon: ' + err.message
          });
        }
      }

      if (action === 'detect_banner' || action === 'detect_og') {
        const { url: targetUrl } = req.body || {};
        if (!targetUrl) {
          return res.status(400).json({ error: 'URL website tidak ditentukan.' });
        }

        try {
          const fetched = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(6000)
          });
          const html = await fetched.text();
          const head = html.slice(0, 35000);

          let foundBanner = '';

          // 1. Regex check for og:image, twitter:image, og:image:secure_url
          const patterns = [
            /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["']/i
          ];

          for (const pattern of patterns) {
            const m = head.match(pattern);
            if (m && m[1]) {
              const rawImg = m[1].trim();
              try {
                foundBanner = new URL(rawImg, targetUrl).href;
                break;
              } catch {}
            }
          }

          // 2. Validate found banner or check target domain fallback
          if (foundBanner) {
            try {
              const checkRes = await fetch(foundBanner, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
              if (!checkRes.ok) {
                const pathOnly = new URL(foundBanner).pathname;
                const altUrl = new URL(pathOnly, targetUrl).href;
                const altCheck = await fetch(altUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                if (altCheck.ok) {
                  foundBanner = altUrl;
                }
              }
            } catch {}
          }

          // 3. If no banner meta found, probe common banner paths
          if (!foundBanner) {
            const probePaths = ['/banner.png', '/banner.jpg', '/og.png', '/og-image.png'];
            for (const p of probePaths) {
              try {
                const probeUrl = new URL(p, targetUrl).href;
                const probeRes = await fetch(probeUrl, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
                if (probeRes.ok && probeRes.headers.get('content-type')?.includes('image')) {
                  foundBanner = probeUrl;
                  break;
                }
              } catch {}
            }
          }

          return res.status(200).json({
            success: true,
            bannerUrl: foundBanner || null,
            message: foundBanner
              ? 'Demo banner / Open Graph (OG) image berhasil ditemukan!'
              : 'Website ini tidak memiliki tag meta og:image atau file banner standar.'
          });
        } catch (err) {
          return res.status(200).json({
            success: false,
            bannerUrl: null,
            message: 'Gagal mendeteksi Open Graph banner: ' + err.message
          });
        }
      }

      if (action === 'verify') {
        return res.status(200).json({
          success: true,
          authenticated: true,
          message: 'PIN admin terverifikasi.'
        });
      }

      if (action === 'reply_rating') {
        const { ratingId, replyText, author } = req.body;
        if (!ratingId || !replyText || !replyText.trim()) {
          return res.status(400).json({ error: 'ratingId dan replyText wajib diisi.' });
        }

        const replyObj = {
          author: author && author.trim() ? author.trim() : 'R_HMT',
          reply: replyText.trim(),
          date: new Date().toISOString().split('T')[0]
        };

        // 1. Instantly save to Upstash Redis if available
        await redisCommand('HSET', `${REDIS_PREFIX}replies`, ratingId, JSON.stringify(replyObj));

        // 2. Also persist to GitHub shared/content.json
        let commitResult = null;
        try {
          const { json: currentContent } = await fetchFromGitHub('shared/content.json');
          if (!currentContent.RATING_REPLIES) currentContent.RATING_REPLIES = {};
          currentContent.RATING_REPLIES[ratingId] = replyObj;

          commitResult = await commitToGitHub(
            'shared/content.json',
            currentContent,
            `feat(ratings): add owner reply to review ${ratingId}`
          );
        } catch (err) {
          console.warn('GitHub sync failed for reply (Redis saved):', err.message);
        }

        return res.status(200).json({
          success: true,
          message: 'Tanggapan berhasil disimpan!',
          reply: replyObj,
          commit: commitResult?.commit?.html_url || commitResult?.commit?.sha || null
        });
      }

      if (action === 'delete_rating') {
        const { ratingId } = req.body;
        if (!ratingId) {
          return res.status(400).json({ error: 'ratingId wajib diisi.' });
        }

        // 1. Remove from Upstash Redis
        try {
          const rawReviews = await redisCommand('LRANGE', `${REDIS_PREFIX}reviews`, 0, -1);
          if (Array.isArray(rawReviews)) {
            for (const item of rawReviews) {
              try {
                const parsed = JSON.parse(item);
                if (parsed.id === ratingId) {
                  await redisCommand('LREM', `${REDIS_PREFIX}reviews`, 1, item);
                  await redisCommand('HINCRBY', `${REDIS_PREFIX}summary`, 'count', -1);
                  if (parsed.stars) {
                    await redisCommand('HINCRBY', `${REDIS_PREFIX}summary`, 'sum', -parsed.stars);
                  }
                  break;
                }
              } catch {}
            }
          }
          await redisCommand('HDEL', `${REDIS_PREFIX}replies`, ratingId);
        } catch (err) {
          console.warn('Redis delete failed:', err.message);
        }

        // 2. Remove from GitHub shared/content.json & real-ratings.json
        try {
          const { json: currentContent } = await fetchFromGitHub('shared/content.json');
          if (currentContent.RATING_REPLIES && currentContent.RATING_REPLIES[ratingId]) {
            delete currentContent.RATING_REPLIES[ratingId];
            await commitToGitHub('shared/content.json', currentContent, `feat(ratings): delete reply for ${ratingId}`);
          }
        } catch {}

        try {
          const { json: realRatings } = await fetchFromGitHub('shared/real-ratings.json');
          if (Array.isArray(realRatings.reviews)) {
            const beforeCount = realRatings.reviews.length;
            realRatings.reviews = realRatings.reviews.filter(r => r.id !== ratingId);
            if (realRatings.reviews.length !== beforeCount) {
              realRatings.count = realRatings.reviews.length;
              realRatings.average = realRatings.count ? Math.round(realRatings.reviews.reduce((a, b) => a + (b.stars || 0), 0) / realRatings.count * 10) / 10 : 5;
              await commitToGitHub('shared/real-ratings.json', realRatings, `feat(ratings): delete review ${ratingId}`);
            }
          }
        } catch {}

        return res.status(200).json({
          success: true,
          message: 'Komentar berhasil dihapus!',
          deletedId: ratingId
        });
      }

      if (action === 'delete_reply') {
        const { ratingId } = req.body;
        if (!ratingId) {
          return res.status(400).json({ error: 'ratingId wajib diisi.' });
        }

        // 1. Remove from Upstash Redis
        try {
          await redisCommand('HDEL', `${REDIS_PREFIX}replies`, ratingId);
        } catch (err) {
          console.warn('Redis delete reply failed:', err.message);
        }

        // 2. Remove from GitHub shared/content.json
        try {
          const { json: currentContent } = await fetchFromGitHub('shared/content.json');
          if (currentContent.RATING_REPLIES && currentContent.RATING_REPLIES[ratingId]) {
            delete currentContent.RATING_REPLIES[ratingId];
            await commitToGitHub('shared/content.json', currentContent, `feat(ratings): delete owner reply for ${ratingId}`);
          }
        } catch {}

        return res.status(200).json({
          success: true,
          message: 'Tanggapan berhasil dihapus!',
          deletedReplyId: ratingId
        });
      }

      if (action === 'edit_rating') {
        const { ratingId, name, comment, stars } = req.body;
        if (!ratingId) {
          return res.status(400).json({ error: 'ratingId wajib diisi.' });
        }

        let updatedReview = null;

        // 1. Update in Upstash Redis
        try {
          const rawReviews = await redisCommand('LRANGE', `${REDIS_PREFIX}reviews`, 0, -1);
          if (Array.isArray(rawReviews)) {
            for (let idx = 0; idx < rawReviews.length; idx++) {
              try {
                const parsed = JSON.parse(rawReviews[idx]);
                if (parsed.id === ratingId) {
                  const starDiff = (stars !== undefined ? Number(stars) : parsed.stars) - (parsed.stars || 0);
                  updatedReview = {
                    ...parsed,
                    ...(name !== undefined ? { name: String(name).trim() } : {}),
                    ...(comment !== undefined ? { comment: String(comment).trim() } : {}),
                    ...(stars !== undefined ? { stars: Number(stars) } : {})
                  };
                  await redisCommand('LSET', `${REDIS_PREFIX}reviews`, idx, JSON.stringify(updatedReview));
                  if (starDiff !== 0) {
                    await redisCommand('HINCRBY', `${REDIS_PREFIX}summary`, 'sum', starDiff);
                  }
                  break;
                }
              } catch {}
            }
          }
        } catch (err) {
          console.warn('Redis edit failed:', err.message);
        }

        // 2. Update on GitHub real-ratings.json
        try {
          const { json: realRatings } = await fetchFromGitHub('shared/real-ratings.json');
          if (Array.isArray(realRatings.reviews)) {
            const idx = realRatings.reviews.findIndex(r => r.id === ratingId);
            if (idx >= 0) {
              realRatings.reviews[idx] = {
                ...realRatings.reviews[idx],
                ...(name !== undefined ? { name: String(name).trim() } : {}),
                ...(comment !== undefined ? { comment: String(comment).trim() } : {}),
                ...(stars !== undefined ? { stars: Number(stars) } : {})
              };
              if (!updatedReview) updatedReview = realRatings.reviews[idx];
              realRatings.average = realRatings.count ? Math.round(realRatings.reviews.reduce((a, b) => a + (b.stars || 0), 0) / realRatings.count * 10) / 10 : 5;
              await commitToGitHub('shared/real-ratings.json', realRatings, `feat(ratings): edit review ${ratingId}`);
            }
          }
        } catch {}

        return res.status(200).json({
          success: true,
          message: 'Komentar berhasil diperbarui!',
          review: updatedReview || { id: ratingId, name, comment, stars }
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
