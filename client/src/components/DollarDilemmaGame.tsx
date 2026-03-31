'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  points: number;
}

interface LevelData {
  title: string;
  stats: { label: string; value: string; note: string }[];
}

interface Level {
  id: number;
  title: string;
  story: string;
  data: LevelData;
  quiz: QuizQuestion;
}

const LEVELS: Level[] = [
  {
    id: 1,
    title: "The Fiat Foundation – Post-WWII Promises Turn Sour",
    story: "As a young Boomer in the 1950s, you grew up in a U.S.-dominated world where the dollar became the global reserve after WWII. But in 1971, ending the gold standard allowed unlimited money printing, leading to inflation and debt that eroded middle-class savings. Your generation witnessed this transformation firsthand.",
    data: {
      title: "The 1971 Monetary Shift Impact",
      stats: [
        { label: "Pre-1971 Inflation", value: "~2% avg", note: "Stable gold-backed dollar" },
        { label: "Post-1971 Inflation", value: "~4% avg", note: "Peaked at 13.5% in 1980" },
        { label: "Dollar Value Lost", value: "85%", note: "Since 1971 to 2025" }
      ]
    },
    quiz: {
      question: "What key 1971 event enabled endless fiat printing?",
      options: ["A) WWII end", "B) Gold standard abandonment", "C) Internet invention", "D) Stock market boom"],
      correct: 1,
      explanation: "Exactly right! Nixon's decision to end the gold standard broke the 'sound money' link, allowing unlimited dollar printing that has devalued savings for generations.",
      points: 10
    }
  },
  {
    id: 2,
    title: "The Inequality Engine – How Fiat Widens the Gap",
    story: "In your prime working years (1980s-2000s), you watched as fiat policies favored the wealthy: Easy money inflated assets like stocks and homes, but wages stagnated. Now your children face a world where the top 1% capture most gains, making financial independence much harder to achieve.",
    data: {
      title: "Growing Wealth Inequality Since 1971",
      stats: [
        { label: "Wealth Gap (Gini)", value: "0.35 → 0.41", note: "1971 to 2025 increase" },
        { label: "Top 1% Share", value: "10% → 30%", note: "Tripled since 1970s" },
        { label: "Real Wage Growth", value: "0.3%/year", note: "vs CEO pay up 1,000%" }
      ]
    },
    quiz: {
      question: "How does fiat printing exacerbate inequality?",
      options: ["A) By devaluing savings for the poor/middle class", "B) By evenly benefiting all classes", "C) By reducing taxes equally", "D) It has no impact on inequality"],
      correct: 0,
      explanation: "Perfect understanding! The 'Cantillon effect' means new money reaches elites first, inflating their assets while devaluing everyone else's savings and wages.",
      points: 10
    }
  },
  {
    id: 3,
    title: "Hollowing the Middle – Your Generation's Peak vs. Decline",
    story: "As a mid-career Boomer in the 1980s-90s, you benefit from stable jobs and affordable homes. But the system erodes the middle class: Wages stagnate while productivity rises, due to offshoring and imports. Your kids enter a world where 'good jobs' are scarcer.",
    data: {
      title: "Middle Class Decline (Post-1971)",
      stats: [
        { label: "Middle Class (1971)", value: "61% of adults", note: "Down to 51% by 2023" },
        { label: "Wage vs Productivity Gap", value: "Productivity +61%", note: "Wages only +17% (1979-2021)" },
        { label: "Inequality Index", value: "0.35 (1970)", note: "Rose to 0.41 by 2022" }
      ]
    },
    quiz: {
      question: "How did trade deficits contribute to middle-class decline?",
      options: ["A) By increasing inflation", "B) Through job losses in manufacturing", "C) No impact", "D) By boosting wages"],
      correct: 1,
      explanation: "Deindustrialization hit hard! Manufacturing job losses decimated middle-class employment.",
      points: 10
    }
  },
  {
    id: 4,
    title: "Foreign Profits Loop Back – Inflating U.S. Assets",
    story: "Now retired, you watch foreign countries (holding U.S. dollars from trade surpluses) reinvest in America. They buy stocks and real estate, driving up prices. This boosts your retirement portfolio but prices out your kids.",
    data: {
      title: "Foreign Investment & Wealth Gap",
      stats: [
        { label: "Foreign U.S. Holdings (2023)", value: "$26.9 trillion", note: "Up $2T from 2022" },
        { label: "Foreign Real Estate Investment", value: ">$1.2 trillion", note: "Last 15 years" },
        { label: "Top 1% Wealth Share", value: "30%+ (2023)", note: "Was 10% in 1980" }
      ]
    },
    quiz: {
      question: "Why does foreign reinvestment widen U.S. inequality?",
      options: ["A) It inflates asset prices, benefiting owners", "B) It lowers taxes", "C) It creates jobs evenly", "D) No effect"],
      correct: 0,
      explanation: "Assets boom for the wealthy! Foreign money inflates stocks and real estate, benefiting those who already own assets.",
      points: 10
    }
  },
  {
    id: 5,
    title: "Generational Crunch – Why Your Kids Need Help",
    story: "Your Millennial child can't buy a home like you did at their age. Boomers bought houses for ~$150K (adjusted); now $400K+. They rely on you for down payments amid high costs.",
    data: {
      title: "Generational Housing Crisis",
      stats: [
        { label: "Boomer Homeownership (Age 30)", value: "55%", note: "vs 42% for Millennials" },
        { label: "Median Home Price (Boomers)", value: "$150K (adjusted)", note: "vs $400K+ for Gen Z" },
        { label: "Parental Help Required", value: "80% of Millennials", note: "Say housing unaffordable" }
      ]
    },
    quiz: {
      question: "Why do Millennials depend more on parental help?",
      options: ["A) Laziness", "B) Stagnant wages + inflated housing from asset bubbles", "C) Too much avocado toast", "D) Better jobs now"],
      correct: 1,
      explanation: "Systemic issues! Wages stagnated while asset bubbles inflated housing costs beyond reach.",
      points: 10
    }
  },
  {
    id: 6,
    title: "Bitcoin as a Fix – Breaking the Fiat Cycle",
    story: "You've seen how fiat money (unlimited printing post-1971) fuels inflation, deficits, and inequality. Bitcoin offers an alternative: decentralized, fixed supply (21 million coins max), no central bank manipulation. It acts as 'sound money' like gold, protecting savings from erosion and reducing wealth transfers to the elite.",
    data: {
      title: "Bitcoin vs Fiat Money",
      stats: [
        { label: "Bitcoin Supply", value: "21 million max", note: "Fixed, unchangeable limit" },
        { label: "Fiat Inflation Average", value: "2-3% yearly", note: "Erodes purchasing power" },
        { label: "Potential Impact", value: "Lower inequality", note: "No money printing benefits" }
      ]
    },
    quiz: {
      question: "How could Bitcoin help solve these issues?",
      options: ["A) By allowing unlimited printing", "B) As a fixed-supply asset that fights inflation and asset bubbles", "C) By increasing trade deficits", "D) No way"],
      correct: 1,
      explanation: "Sound money for all! Bitcoin's fixed supply prevents the money printing that creates asset bubbles and inequality.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);
const PASSING_SCORE = Math.round(TOTAL_POSSIBLE * 0.6);

// ─── Share helper ─────────────────────────────────────────────────────────────
function shareScore(score: number, total: number, gameName: string) {
  const pct = Math.round((score / total) * 100);
  const text = encodeURIComponent(
    `I just completed "${gameName}" on @BitcoinHub 🦇⚡\n\n` +
    `Score: ${score}/${total} (${pct}%)\n\n` +
    `Learning how fiat money shapes economic inequality — and why Bitcoin matters.\n\n` +
    `👉 Try it free: hub.goodbotai.tech\n\n` +
    `#Bitcoin #SoundMoney #FiatFree`
  );
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
        <span className="text-green-400">Level {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Points Pop Animation ──────────────────────────────────────────────────────
function PointsPop({ points, visible }: { points: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-bounce-in text-4xl font-black text-yellow-400 drop-shadow-lg">
        +{points} pts! 🎯
      </div>
    </div>
  );
}

// ─── INTRO ───────────────────────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  return (
    <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-7">
        <div className="text-6xl mb-4">🦇⚡</div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">The Dollar Dilemma</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          6 chapters through 80 years of economic history. See how the dollar lost 85% of its value — and why Bitcoin is the counter.
        </p>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll walk away knowing:</h3>
        <ul className="space-y-2.5">
          {[
            "Why the dollar lost 85% of its value since 1971",
            "The 'Cantillon effect' — why printing money benefits the rich first",
            "Why your kids can't afford homes like you did",
            "How Bitcoin's 21M cap fixes what fiat broke"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-green-400 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { v: "6", l: "Chapters" },
          { v: "85%", l: "Dollar Lost" },
          { v: "21M", l: "BTC Max" }
        ].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-green-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-green-900/30 hover:shadow-green-700/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        Begin the Journey →
      </button>
    </div>
  );
}

// ─── STORY ────────────────────────────────────────────────────────────────────
function StoryScreen({ level, onComplete }: { level: Level; onComplete: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  return (
    <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-5">
        <div className="inline-block px-3 py-1 rounded-full bg-green-900/30 border border-green-700/50 text-green-400 text-xs font-bold tracking-wider mb-3">
          CHAPTER {level.id} OF {LEVELS.length}
        </div>
        <h3 className="text-xl font-black text-white leading-tight">{level.title}</h3>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-5 mb-4">
        <p className="text-gray-300 text-sm leading-relaxed">{level.story}</p>
      </div>

      <div className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-4 mb-5">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">{level.data.title}</div>
        <div className="space-y-3">
          {level.data.stats.map((s, i) => (
            <div key={i} className="flex justify-between items-baseline gap-3">
              <span className="text-gray-400 text-xs shrink-0">{s.label}</span>
              <div className="text-right">
                <span className="text-green-400 font-bold text-sm">{s.value}</span>
                <span className="text-gray-600 text-xs ml-2">— {s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm transition-all duration-150"
      >
        Continue to Quiz →
      </button>
    </div>
  );
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
function QuizScreen({
  level,
  selectedAnswer,
  answered,
  onSelect
}: {
  level: Level;
  selectedAnswer: number | null;
  answered: boolean;
  onSelect: (i: number) => void;
}) {
  const quiz = level.quiz;
  const isCorrect = selectedAnswer === quiz.correct;

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs text-gray-600 font-semibold mb-1.5">QUESTION</div>
        <h4 className="text-white font-bold text-base leading-snug">{quiz.question}</h4>
      </div>

      <div className="space-y-2.5 mb-5">
        {quiz.options.map((opt, i) => {
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-green-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-green-900/50 border-green-500 text-green-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-green-900/40 border-green-500/70 text-green-200';
          }
          return (
            <button
              key={i}
              onClick={() => !answered && onSelect(i)}
              disabled={answered}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 text-sm font-medium ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-green-200' : 'text-red-200'}`}>
                {quiz.explanation}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-green-700/50 text-green-300' : 'bg-red-700/50 text-red-300'}`}>
                  {isCorrect ? `+${quiz.points} points` : '0 points'}
                </span>
                {!isCorrect && (
                  <span className="text-xs text-gray-500">The correct answer was: {quiz.options[quiz.correct]}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEVEL COMPLETE ───────────────────────────────────────────────────────────
function LevelCompleteScreen({
  level,
  score,
  correct,
  onContinue,
  onShare
}: {
  level: Level;
  score: number;
  correct: boolean;
  onContinue: () => void;
  onShare: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  return (
    <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-5">
        <div className="text-5xl mb-3">{correct ? '🎯' : '📚'}</div>
        <h3 className="text-2xl font-black text-white mb-1">
          {correct ? 'Chapter Complete!' : 'Chapter Reviewed'}
        </h3>
        <p className="text-gray-400 text-sm">{level.title}</p>
      </div>

      {correct && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5 mb-5 text-center">
          <div className="text-3xl font-black text-yellow-400 mb-0.5">+{level.quiz.points}</div>
          <div className="text-gray-400 text-xs">points earned</div>
        </div>
      )}

      {!correct && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 mb-5 text-center">
          <div className="text-gray-400 text-sm mb-1">Keep studying!</div>
          <div className="text-gray-500 text-xs">Review the explanation above and continue.</div>
        </div>
      )}

      {/* Share after each level */}
      <div className="mb-4">
        <button
          onClick={onShare}
          className="w-full py-3 rounded-xl bg-[#1DA1F2]/15 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/40 text-[#1DA1F2] font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Share This Chapter
        </button>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-400 text-white font-bold text-sm transition-all duration-150"
      >
        {level.id < LEVELS.length ? `Next: Chapter ${level.id + 1} →` : 'See Final Results →'}
      </button>
    </div>
  );
}

// ─── GAME COMPLETE ────────────────────────────────────────────────────────────
function GameCompleteScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const passed = score >= PASSING_SCORE;

  let badge = '📖';
  let title = 'Keep Learning';
  let message = "You've started to understand the Dollar Dilemma. History shapes your finances — now you see how.";

  if (pct >= 80) {
    badge = '🏆';
    title = 'Masterful!';
    message = "You deeply understand the Dollar Dilemma. You see how 1971 broke money — and why Bitcoin is the fix.";
  } else if (pct >= 60) {
    badge = '⚡';
    title = 'Well Done!';
    message = "You understand the core problem: unlimited fiat printing transfers wealth upward. Bitcoin's fixed supply is the counter.";
  }

  return (
    <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="text-4xl font-black text-green-400 mb-1">{score}</div>
        <div className="text-gray-500 text-sm mb-3">{TOTAL_POSSIBLE} points possible</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">{pct}% — {passed ? 'Passed!' : 'Review and try again!'}</div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-5 mb-5">
        <h4 className="text-white font-bold mb-3 text-sm">💡 What You Now Know</h4>
        <ul className="space-y-2">
          {[
            "Fiat money enables infinite printing — eroding savings over time",
            "The Cantillon effect: new money benefits the already-wealthy first",
            "Asset inflation from easy money prices out the next generation",
            "Bitcoin's 21M cap is the mathematically sound alternative"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-xs">
              <span className="text-green-400 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Main share button */}
      <button
        onClick={() => shareScore(score, TOTAL_POSSIBLE, 'The Dollar Dilemma')}
        className="w-full py-4 rounded-2xl bg-[#1DA1F2] hover:bg-[#1a9bd9] active:bg-[#1589c4] text-white font-black text-base transition-all duration-150 flex items-center justify-center gap-2.5 mb-3 shadow-lg"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        Share Your Score on X
      </button>

      <button
        onClick={onRestart}
        className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-all duration-150"
      >
        Play Again
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function DollarDilemmaGame() {
  return <DollarDilemmaGameInner />;
}

function DollarDilemmaGameInner() {
  const [phase, setPhase] = useState<'intro' | 'story' | 'quiz' | 'levelComplete' | 'gameComplete'>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showPoints, setShowPoints] = useState(false);

  const level = LEVELS[currentLevel];

  const handleStart = useCallback(() => setPhase('story'), []);

  const handleStoryComplete = useCallback(() => {
    setPhase('quiz');
    setSelectedAnswer(null);
    setAnswered(false);
  }, []);

  const handleSelect = useCallback((i: number) => {
    if (answered) return;
    const isCorrectAnswer = i === level.quiz.correct;
    setSelectedAnswer(i);
    setAnswered(true);
    setCorrect(isCorrectAnswer);
    if (isCorrectAnswer) {
      setScore(s => s + level.quiz.points);
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1800);
    }
  }, [answered, level]);

  const handleContinue = useCallback(() => {
    if (currentLevel + 1 >= LEVELS.length) {
      setPhase('gameComplete');
    } else {
      setCurrentLevel(c => c + 1);
      setPhase('story');
      setSelectedAnswer(null);
      setAnswered(false);
    }
  }, [currentLevel]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setCurrentLevel(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setCorrect(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦇⚡</span>
            <span className="font-black text-sm text-white tracking-tight">The Dollar Dilemma</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-green-400 font-black text-sm">{score} pts</div>
                <div className="text-gray-600 text-xs">Lv {currentLevel + 1}/{LEVELS.length}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {phase !== 'intro' && phase !== 'gameComplete' && (
          <ProgressBar current={currentLevel + 1} total={LEVELS.length} />
        )}

        {phase === 'intro' && <IntroScreen onStart={handleStart} />}

        {phase === 'story' && <StoryScreen level={level} onComplete={handleStoryComplete} />}

        {phase === 'quiz' && (
          <>
            <QuizScreen
              level={level}
              selectedAnswer={selectedAnswer}
              answered={answered}
              onSelect={handleSelect}
            />
            {answered && (
              <div className="mt-4">
                <button
                  onClick={handleContinue}
                  className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-400 text-white font-bold text-sm transition-all duration-150"
                >
                  {currentLevel + 1 >= LEVELS.length ? 'See Final Results →' : `Next: Chapter ${currentLevel + 2} →`}
                </button>
              </div>
            )}
          </>
        )}

        {phase === 'levelComplete' && (
          <LevelCompleteScreen
            level={level}
            score={score}
            correct={correct}
            onContinue={handleContinue}
            onShare={() => shareScore(score, TOTAL_POSSIBLE, 'The Dollar Dilemma')}
          />
        )}

        {phase === 'gameComplete' && (
          <GameCompleteScreen score={score} onRestart={handleRestart} />
        )}
      </div>

      {/* Points pop animation */}
      <PointsPop points={level?.quiz.points ?? 10} visible={showPoints} />
    </div>
  );
}

export default DollarDilemmaGame;
