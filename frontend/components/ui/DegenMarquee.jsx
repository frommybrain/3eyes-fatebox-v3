'use client';

const THREE_EYES_URL = 'https://pump.fun/coin/G63pAYWkZd71Jdy83bbdvs6HMQxaYVWy5jsS1hK3pump';

const ITEMS = [
  { text: 'Gambling brings the people together', link: null },
  { text: '$3EYES', link: THREE_EYES_URL },
  { text: 'fate is such a tease', link: null },
];

function MarqueeItem({ item }) {
  return (
    <span className="inline-flex items-center shrink-0">
      {item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 text-sm font-medium uppercase tracking-wider text-degen-black hover:text-degen-blue transition-colors"
        >
          {item.text}
        </a>
      ) : (
        <span className="px-6 text-sm font-medium uppercase tracking-wider text-degen-black">
          {item.text}
        </span>
      )}
      <span className="w-1.5 h-1.5 bg-degen-black rounded-full shrink-0" />
    </span>
  );
}

export default function DegenMarquee({ speed = 50, className = '' }) {
  // Calculate animation duration based on speed (higher speed = faster = shorter duration)
  const duration = Math.max(10, 100 / (speed / 50));

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        className="inline-flex animate-marquee"
        style={{
          animationDuration: `${duration}s`,
        }}
      >
        {/* Render items multiple times to ensure seamless loop */}
        {[...Array(4)].map((_, setIndex) => (
          <div key={setIndex} className="inline-flex items-center shrink-0">
            {ITEMS.map((item, index) => (
              <MarqueeItem key={`${setIndex}-${index}`} item={item} />
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
}
