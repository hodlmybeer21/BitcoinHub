// BitcoinHub — /about
// One paragraph (UX review #41): who, what, sourcing policy, newsletter, not financial advice.
// No personal details (job, town, family). Methodology lives on /sources.

import { Link } from 'wouter';
import { NEWSLETTER_NAME, SUBSTACK_BASE } from '@/lib/newsletter';

export default function About() {
  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground">About BitcoinHub</h1>
      <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed" data-testid="about-paragraph">
        BitcoinHub is a free, calm read on where Bitcoin is in its four-year cycle, with the macro data and monetary
        history around it. It's made by{' '}
        <a href="https://x.com/hodlmybeer21" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          @HODLMyBeer21
        </a>
        , who also writes the{' '}
        <a href={SUBSTACK_BASE} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {NEWSLETTER_NAME}
        </a>{' '}
        newsletter on Substack. Every number on the site comes from a public source listed on{' '}
        <Link href="/sources" className="text-primary underline">Sources</Link>; when a source is late or down we
        say so instead of filling the gap, and opinion (like the Cycle Pulse) is labeled as editorial. There are no
        accounts, ads or trackers (see <Link href="/privacy" className="text-primary underline">Privacy</Link>).
        Everything here is education, not financial advice, and past cycles don't guarantee future ones.
      </p>
    </div>
  );
}
