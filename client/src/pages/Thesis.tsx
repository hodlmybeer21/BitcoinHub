// BitcoinHub — /thesis
// The Bitcoin thesis, section by section, in Satoshi's own words.
// Each card quotes the paper and ties it back to the BitcoinHub page that teaches it.
//
// Quotes are from "Bitcoin: A Peer-to-Peer Electronic Cash System" by Satoshi
// Nakamoto (2008). The paper is in the public domain.

import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ThesisSection {
  n: string;
  title: string;
  paperQuote: string;
  bitcoinhubLink: string;
  bitcoinhubLabel: string;
  interpretation: string;
}

const SECTIONS: ThesisSection[] = [
  {
    n: '1',
    title: 'Introduction — peer-to-peer electronic cash',
    paperQuote:
      'A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution. Digital signatures provide part of the solution, but the main benefits are lost if a trusted third party is still required to prevent double-spending. We propose a solution to the double-spending problem using a peer-to-peer network.',
    bitcoinhubLink: '/learn',
    bitcoinhubLabel: 'Open the Learn page — 13 games, starting with the basics',
    interpretation:
      'Where we start. The whole reason BitcoinHub exists: a settlement network that doesn\'t need a trusted third party. Our 13 games begin with the basics — what money is, why double-spending matters, why the existing system needs trust, and how this paper replaces that with proof.',
  },
  {
    n: '2',
    title: 'Transactions — a chain of digital signatures',
    paperQuote:
      'We define an electronic coin as a chain of digital signatures. Each owner transfers the coin to the next by digitally signing a hash of the previous transaction and the public key of the next owner and adding these to the end of the coin. The problem of course is the payee can\'t verify that one of the owners did not double-spend the coin.',
    bitcoinhubLink: '/learn',
    bitcoinhubLabel: 'How ownership actually works →',
    interpretation:
      'What a "bitcoin" actually is. A chain of signatures. Lose the keys, lose the coin. No middleman to call.',
  },
  {
    n: '3',
    title: 'Timestamp server — the hash chain',
    paperQuote:
      'The solution we propose begins with a timestamp server. A timestamp server works by taking a hash of a block of items to be timestamped and widely publishing the hash… Each timestamp includes the previous timestamp in its hash, forming a chain, with each additional timestamp reinforcing the ones before it.',
    bitcoinhubLink: '/cycle',
    bitcoinhubLabel: 'See the cycle in real time →',
    interpretation:
      'How immutability works. Each block references the one before — to rewrite history you\'d have to redo all the work since. /cycle shows the actual halving-to-bottom phase in real time.',
  },
  {
    n: '4',
    title: 'Proof-of-Work — making history costly to forge',
    paperQuote:
      'To implement a distributed timestamp server on a peer-to-peer basis, we will need to use a proof-of-work system similar to Adam Back\'s Hashcash, rather than newspaper or Usenet posts. The proof-of-work involves scanning for a value that when hashed, such as with SHA-256, the hash begins with a number of zero bits. The average work required is exponential in the number of zero bits required and can be verified by executing a single hash.',
    bitcoinhubLink: '/risk',
    bitcoinhubLabel: 'Open the risk dashboard →',
    interpretation:
      'Why mining exists. The energy spent on proof-of-work is what makes the chain costly to forge — your real-world proof you\'re honest. The /risk dashboard shows where we sit on the cycle-position curve.',
  },
  {
    n: '5',
    title: 'Network — broadcast + longest-chain rule',
    paperQuote:
      'New transactions are broadcast to all nodes. Each node collects new transactions into a block. Each node works on finding a difficult proof-of-work for its block. When a node finds a proof-of-work, it broadcasts the block to all nodes. Nodes accept the block only if all transactions in it are valid and not already spent.',
    bitcoinhubLink: '/cycle',
    bitcoinhubLabel: 'Cycle position now →',
    interpretation:
      'How it actually runs. The longest-chain rule — pick the block with the most proof-of-work behind it — is what makes the network converge without central coordination.',
  },
  {
    n: '6',
    title: 'Incentive — block subsidy + fees',
    paperQuote:
      'By convention, the first transaction in a block is a special transaction that starts a new coin owned by the creator of the block. This adds an incentive for nodes to support the network, and provides a way to initially distribute coins into circulation, since there is no central authority to issue them. The steady addition of a constant of amount of new coins is analogous to gold miners expending resources to add gold to circulation. The incentive can also be funded with transaction fees.',
    bitcoinhubLink: '/cycle',
    bitcoinhubLabel: 'Halving + emissions in real time →',
    interpretation:
      'Where new BTC comes from — block subsidy + transaction fees. Same model from day one. /cycle shows the post-2024 halving schedule in real time.',
  },
  {
    n: '7',
    title: 'Reclaiming disk space — Merkle trees',
    paperQuote:
      'Once the latest transaction in a coin is buried under enough blocks, the spent transactions before it can be discarded to save disk space. To facilitate this without breaking the block\'s hash, transactions are hashed in a Merkle Tree, with only the root included in the block\'s hash. Old blocks can then be compacted by stubbing off branches of the tree. The interior hashes do not need to be stored.',
    bitcoinhubLink: '/workbench',
    bitcoinhubLabel: 'Build a custom indicator →',
    interpretation:
      'How the chain stays small. /workbench builds and traces custom indicator formulas over the same UTXO graph that powers this pruning.',
  },
  {
    n: '8',
    title: 'Simplified Payment Verification (SPV) — light clients',
    paperQuote:
      'It is possible to verify payments without running a full network node. A user only needs to keep a copy of the block headers of the longest proof-of-work chain, which he can get by querying network nodes until he\'s convinced he has the longest chain, and obtain the Merkle branch linking the transaction to the block it\'s timestamped in. He can\'t check the transaction for himself, but by linking it to a place in the chain, he can see that a network node has accepted it, and blocks added after it further confirm the network has accepted it.',
    bitcoinhubLink: '/cycle/compare',
    bitcoinhubLabel: 'See cross-cycle comparison →',
    interpretation:
      'Light clients. SPV wallets don\'t need the full chain — they check Merkle proofs. /cycle/compare uses the same idea to verify cross-cycle comparisons.',
  },
  {
    n: '9',
    title: 'Privacy — pseudonymous, not anonymous',
    paperQuote:
      'The traditional banking model achieves a level of privacy by limiting access to information to the parties involved and the trusted third party. The necessity to announce all transactions publicly precludes this method, but privacy can still be maintained by breaking the flow of information in another place: by keeping public keys anonymous. The public can see that someone is sending an amount to someone else, but without information linking the transaction to anyone. A new key pair should be used for each transaction to keep them from being linked to a common owner.',
    bitcoinhubLink: '/about#privacy',
    bitcoinhubLabel: 'Our privacy stance →',
    interpretation:
      'Bitcoin is pseudonymous, not anonymous. Addresses are public; identities are not. BitcoinHub itself uses no third-party trackers — analytics stays in Vercel + our own /api/* endpoints.',
  },
  {
    n: '10',
    title: 'Conclusion — without relying on trust',
    paperQuote:
      'We have proposed a system for electronic transactions without relying on trust. We started with the usual framework of coins made from digital signatures, which provides strong control of ownership, but is incomplete without a way to prevent double-spending. To solve this, we proposed a peer-to-peer network using proof-of-work to record a public history of transactions that quickly becomes computationally impractical for an attacker to change if honest nodes control a majority of CPU power.',
    bitcoinhubLink: '/learn',
    bitcoinhubLabel: 'Start learning →',
    interpretation:
      'The whole paper in one sentence. That\'s the thesis BitcoinHub is built around. The /learn page is the syllabus.',
  },
];

export default function Thesis() {
  return (
    <ErrorBoundary label="Thesis page">
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <header className="mb-10">
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              Bitcoin Thesis
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
              The Thesis — in Satoshi's own words.
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              Every claim on BitcoinHub traces back to one document:{' '}
              <a
                href="https://bitcoin.org/bitcoin.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:text-primary/80"
              >
                <em>Bitcoin: A Peer-to-Peer Electronic Cash System</em>
              </a>{' '}
              by Satoshi Nakamoto (2008). Here is that paper, one section at a time, paired with
              the BitcoinHub feature that teaches it.
            </p>
          </header>

          <div className="space-y-5">
            {SECTIONS.map((s) => (
              <Card key={s.n} className="bg-card border-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-mono font-bold text-primary">§{s.n}</span>
                    <CardTitle className="text-lg sm:text-xl leading-snug">
                      {s.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <blockquote className="border-l-2 border-primary/40 pl-4 italic text-sm text-muted-foreground leading-relaxed">
                    "{s.paperQuote}"
                    <footer className="text-[11px] not-italic mt-2 text-muted-foreground/70">
                      — Satoshi Nakamoto, <em>Bitcoin: A Peer-to-Peer Electronic Cash System</em>, 2008, §{s.n}
                    </footer>
                  </blockquote>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s.interpretation}
                  </p>
                  <Link href={s.bitcoinhubLink}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      {s.bitcoinhubLabel}
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <footer className="mt-12 pt-8 border-t border-muted/20 text-center text-sm text-muted-foreground/80 space-y-2">
            <p>
              <BookOpen className="inline w-4 h-4 mr-1" />
              Read the original:{' '}
              <a
                href="https://bitcoin.org/bitcoin.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:text-primary/80"
              >
                bitcoin.org/bitcoin.txt
              </a>{' '}
              · 9 pages · 2008 · public domain
            </p>
            <p className="text-xs">
              Last verified 2026-08-21. BitcoinHub cites the paper on every page and in every screenshot.
            </p>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
