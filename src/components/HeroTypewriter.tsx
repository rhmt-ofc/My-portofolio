import { useEffect, useState } from 'react';

const PHRASES = [
  'in Progress.',
  'by Building.',
  'with AI Relay.',
  'Every Single Day.',
  'Never Stopping.'
];

export default function HeroTypewriter({ still = false }: { still?: boolean }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(PHRASES[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (still) return;

    let timeout: ReturnType<typeof setTimeout>;
    const currentFullText = PHRASES[phraseIndex];

    if (!isDeleting) {
      if (displayedText.length < currentFullText.length) {
        // Typing forward
        timeout = setTimeout(() => {
          setDisplayedText(currentFullText.slice(0, displayedText.length + 1));
        }, 90);
      } else {
        // Pause at full word before deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 3000);
      }
    } else {
      if (displayedText.length > 0) {
        // Deleting backward
        timeout = setTimeout(() => {
          setDisplayedText(currentFullText.slice(0, displayedText.length - 1));
        }, 50);
      } else {
        // Switch to next phrase
        setIsDeleting(false);
        setPhraseIndex(prev => (prev + 1) % PHRASES.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, phraseIndex, still]);

  return (
    <span className="hero-typewriter-wrap">
      <em className="hero-typewriter-text">{displayedText || '\u00A0'}</em>
      <span className="hero-typewriter-cursor" aria-hidden="true" />
    </span>
  );
}
