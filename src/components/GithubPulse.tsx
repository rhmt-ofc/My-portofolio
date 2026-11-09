import React, { useEffect, useState } from 'react';
import { GitCommit, GitBranch, Sparkles } from 'lucide-react';

interface RepoPulseData {
  repoName: string;
  repoUrl: string;
  message: string;
  date: string;
  status: 'live' | 'idle';
}

export default function GithubPulse() {
  const [pulse, setPulse] = useState<RepoPulseData>({
    repoName: 'Auto-repo (RepoFlow)',
    repoUrl: 'https://github.com/rhteaster-ui/Auto-repo',
    message: 'feat(branding): update banner and icon assets, declutter repo cards with kebab menu',
    date: 'Hari ini',
    status: 'live',
  });

  useEffect(() => {
    let mounted = true;
    const fetchLatestCommit = async () => {
      try {
        const res = await fetch('https://api.github.com/users/rhmt-ofc/events/public?per_page=5');
        if (!res.ok) return;
        const events = await res.json();
        const pushEv = events.find((e: any) => e.type === 'PushEvent');
        if (pushEv && mounted) {
          const rawRepo = pushEv.repo?.name || 'My-portofolio';
          const shortName = rawRepo.split('/')[1] || rawRepo;
          const commitMsg = pushEv.payload?.commits?.[0]?.message || 'Update repository codebase';
          const commitDate = new Date(pushEv.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          });
          setPulse({
            repoName: shortName,
            repoUrl: `https://github.com/${rawRepo}`,
            message: commitMsg.split('\n')[0],
            date: commitDate,
            status: 'live',
          });
        }
      } catch {}
    };
    fetchLatestCommit();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="github-pulse-badge" role="status" aria-label="Aktivitas GitHub Terkini">
      <div className="pulse-indicator">
        <span className="pulse-dot" />
        <span className="pulse-ring" />
      </div>
      <div className="pulse-content">
        <div className="pulse-header">
          <GitCommit size={11} className="text-cyan-400" />
          <span className="pulse-label">LATEST COMMIT ON GITHUB</span>
          <span className="pulse-date">{pulse.date}</span>
        </div>
        <a
          href={pulse.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pulse-link"
          title={`Buka commit di GitHub: ${pulse.message}`}
        >
          <span className="pulse-repo">@{pulse.repoName}:</span>
          <span className="pulse-msg truncate">{pulse.message}</span>
        </a>
      </div>
    </div>
  );
}
