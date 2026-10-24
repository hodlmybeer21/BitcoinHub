import { Link } from "wouter";
import { LegalPage } from "./LegalPage";

// Plain-language terms for what the site actually is (UX review #45): free, read-only,
// educational, no accounts, no advice.
const Terms = () => (
  <LegalPage title="Terms of use" updated="October 24, 2026">
    <section>
      <h2>What BitcoinHub is</h2>
      <p>
        A free, educational website about the Bitcoin cycle, macro data and monetary history. There are no accounts,
        no paid features and nothing to buy here.
      </p>
    </section>

    <section>
      <h2>Not financial advice</h2>
      <p>
        Nothing on this site is financial, investment, tax or legal advice, or a recommendation to buy or sell
        anything. Cycle readings, scores, backtests and simulations describe the past or are hypothetical; past
        cycles do not guarantee future results. Make your own decisions and, if you need advice, talk to a qualified
        professional.
      </p>
    </section>

    <section>
      <h2>Data and accuracy</h2>
      <p>
        Figures come from public sources listed on <Link href="/sources">Sources</Link>. They can be delayed, revised
        or wrong, and a source can go offline. We try to label stale or missing data, but the site is provided "as is",
        without warranties, and we are not liable for losses from using it.
      </p>
    </section>

    <section>
      <h2>Using the site</h2>
      <p>
        You're welcome to read, share and link to anything here. Please don't overload the site's API or scrape it
        aggressively; requests are rate-limited. Quotes from the Bitcoin white paper are public domain; third-party
        data belongs to its owners.
      </p>
    </section>

    <section>
      <h2>Newsletter and other sites</h2>
      <p>
        The newsletter is run on Substack under Substack's terms. Links to other sites are for reference; we don't
        control them.
      </p>
    </section>

    <section>
      <h2>Changes</h2>
      <p>
        We may update these terms; the date above shows the latest version. See also <Link href="/privacy">Privacy</Link>.
      </p>
    </section>
  </LegalPage>
);

export default Terms;
