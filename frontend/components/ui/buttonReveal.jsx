
import Link from 'next/link';

export default function RevealButton({ text = "", link }) {
  const characters = text.split('');

  const content = (
    <span className="relative block overflow-hidden whitespace-nowrap">
      {/* Invisible text to maintain width/height */}
      <span className="invisible block">{text}</span>

      {/* Default text - slides up on hover with stagger */}
      <span className="absolute inset-0 flex items-center justify-center">
        {characters.map((char, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
            style={{ transitionDelay: `${i * 0.01}s` }}
          >
            {char}
          </span>
        ))}
      </span>

      {/* Hover text - slides up from bottom with stagger */}
      <span className="absolute inset-0 flex translate-y-full items-center justify-center">
        {characters.map((char, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
            style={{ transitionDelay: `${i * 0.01}s` }}
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  );

  const styles = "group relative inline-flex items-center justify-center border border-white/60 bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-900";

  if (link) {
    return (
      <Link href={link} className={styles}>
        {content}
      </Link>
    );
  }

  return (
    <button className={styles} type="button">
      {content}
    </button>
  );
}
