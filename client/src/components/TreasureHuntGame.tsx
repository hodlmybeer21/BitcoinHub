'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Coins } from 'lucide-react';

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

// ─── Game Data (4 levels) ────────────────────────────────────────────────────
const LEVELS: Level[] = [
  {
    id: 1,
    title: "The Gold Standard Clue – 1971 Shift",
    story: "You're a seasoned treasure hunter in 2025, exploring a map of economic history. Your first clue leads to the spot where the dollar lost its gold anchor. In 1971, Nixon ended convertibility, sparking the inflation that now runs at 2.7%. Find this treasure while avoiding the Fiat Trap of hoarding cash.",
    data: {
      title: "The 1971 Economic Shift",
      stats: [
        { label: "Dollar Value Lost", value: "85%", note: "Since 1971 to 2025" },
        { label: "Bitcoin Price (Aug 2025)", value: "$110,000", note: "Fixed supply alternative" },
        { label: "Cash Devaluation", value: "2-3%/year", note: "Through inflation erosion" }
      ]
    },
    quiz: {
      question: "What caused the start of persistent inflation in 1971?",
      options: [
        "A) Gold standard abandonment",
        "B) War costs alone",
        "C) Tax cuts",
        "D) Technology boom"
      ],
      correct: 0,
      explanation: "Correct! Nixon's move to end gold convertibility removed the anchor that kept money printing in check, starting the inflationary cycle.",
      points: 10
    }
  },
  {
    id: 2,
    title: "The Inflation Cave – 2008 Bailout Pitfall",
    story: "Your treasure map leads to a dangerous cave filled with the remnants of the $700B TARP bailout. Government debt jumped $2T, inflating assets to levels your Millennial children can't afford. Navigate carefully to avoid supporting more bailouts.",
    data: {
      title: "The 2008 Bailout Impact",
      stats: [
        { label: "Current Home Prices", value: "$417K", note: "2025 average, up from $82K in 1985" },
        { label: "Millennial Homeownership", value: "42%", note: "vs Boomers' 55% at same age" },
        { label: "Asset Inflation Impact", value: "3x higher", note: "Housing costs vs wages since 2008" }
      ]
    },
    quiz: {
      question: "How did the 2008 bailouts primarily hurt your children's generation?",
      options: [
        "A) Through asset price inflation",
        "B) By creating more jobs",
        "C) By lowering taxes",
        "D) It had no effect"
      ],
      correct: 0,
      explanation: "Exactly! Asset inflation from money printing made homes, stocks, and wealth-building assets expensive just as your children entered their earning years.",
      points: 10
    }
  },
  {
    id: 3,
    title: "The Bitcoin Vault – 2025 Opportunity",
    story: "You've discovered Bitcoin's vault! Its mathematical 21 million coin cap resists the printing that has devalued everything else. Bitcoin is up 18% year-to-date to $110K, and 6-10% of Boomers use it as a retirement hedge. A small 0.1 BTC gift could grow to $11K+ for grandchildren.",
    data: {
      title: "Bitcoin as Legacy Protection",
      stats: [
        { label: "Boomer Crypto Adoption", value: "6-10%", note: "Growing for retirement hedges" },
        { label: "Bitcoin YTD Performance", value: "+18%", note: "Strong 2025 to $110K" },
        { label: "0.1 BTC Gift Value", value: "$11,000+", note: "Current value for grandchildren" }
      ]
    },
    quiz: {
      question: "What gives Bitcoin its edge as a legacy preservation tool?",
      options: [
        "A) Unlimited supply growth",
        "B) Fixed 21 million cap",
        "C) Government control",
        "D) High transaction fees"
      ],
      correct: 1,
      explanation: "Perfect! Bitcoin's mathematical scarcity (only 21 million will ever exist) protects against the money printing that has eroded purchasing power.",
      points: 10
    }
  },
  {
    id: 4,
    title: "Legacy Treasure Chest – Action Time",
    story: "You've reached the treasure chest! Now use your Bitcoin Gold Coins to build a real legacy. 60% of young people want Boomer guidance on crypto. Your options: educate your family about sound money, invest 5% in BTC, or start a family Bitcoin wallet.",
    data: {
      title: "Building Your Bitcoin Legacy",
      stats: [
        { label: "Youth Seeking Guidance", value: "60%", note: "Want financial education from Boomers" },
        { label: "Recommended Allocation", value: "5-10%", note: "Conservative Bitcoin position" },
        { label: "Education Impact", value: "High", note: "Financial literacy multiplies preservation" }
      ]
    },
    quiz: {
      question: "What's the most effective legacy move for a Boomer in 2025?",
      options: [
        "A) Large cash gifts that inflate away",
        "B) Crypto education and small BTC gifts",
        "C) Taking on more debt for family",
        "D) Ignoring new financial tools"
      ],
      correct: 1,
      explanation: "Excellent! Education creates lasting wealth-building skills, while small Bitcoin gifts introduce your family to sound money that preserves value across generations.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);
const PASSING_COINS = Math.round(TOTAL_POSSIBLE * 0.6);

// ─── Share ────────────────────────────────────────────────────────────────────
function shareScore(coins: number, maxCoins: number) {
  const pct = Math.round((coins / maxCoins) * 100);
  const text = encodeURIComponent(
    `I just completed "Bitcoin Treasure Hunt" on @BitcoinHub 🦇⚡\n\n` +
    `Score: ${coins}/${maxCoins} Bitcoin Gold Coins (${pct}%)\n\n` +
    `Navigating economic history to build a Bitcoin legacy for my family.\n\n` +
    `👉 Try it free: hub.goodbotai.tech\n\n` +
    `#Bitcoin #LegacyWealth #SoundMoney`
  );
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-amber-400/70 mb-1.5 font-medium">
        <span>Level {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Points Pop ───────────────────────────────────────────────────────────────
function PointsPop({ points, visible }: { points: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-bounce text-3xl font-black text-yellow-400 drop-shadow-lg">
        +{points} coins! 🪙
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
        <div className="text-6xl mb-4">🏴‍☠️💎</div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Bitcoin Treasure Hunt</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          Navigate 4 chapters of economic history as a treasure hunter uncovering Bitcoin's value as a legacy tool.
        </p>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll discover:</h3>
        <ul className="space-y-2.5">
          {[
            "Why the 1971 gold standard end started inflation",
            "How 2008 bailouts inflated assets beyond reach",
            "Why Bitcoin's 21M cap protects generational wealth",
            "How to build a real Bitcoin legacy for your family"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { v: "4", l: "Chapters" },
          { v: "$110K", l: "BTC Price" },
          { v: "21M", l: "BTC Max" }
        ].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-amber-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]"
      >
        Begin the Hunt 🏴‍☠️
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
        <div className="inline-block px-3 py-1 rounded-full bg-amber-900/30 border border-amber-700/50 text-amber-400 text-xs font-bold tracking-wider mb-3">
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
                <span className="text-amber-400 font-bold text-sm">{s.value}</span>
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
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-amber-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-amber-900/50 border-amber-500 text-amber-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-amber-900/40 border-amber-500/70 text-amber-200';
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
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-amber-900/30 border-amber-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-amber-200' : 'text-red-200'}`}>
                {quiz.explanation}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-amber-700/50 text-amber-300' : 'bg-red-700/50 text-red-300'}`}>
                  {isCorrect ? `+${quiz.points} coins` : 'Fiat Trap: -5 coins'}
                </span>
                {!isCorrect && (
                  <span className="text-xs text-gray-500">Correct: {quiz.options[quiz.correct]}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEVEL COMPLETE ─────────────────────────────────────────────────────────
function LevelCompleteScreen({
  level,
  coins,
  correct,
  onContinue,
  onShare
}: {
  level: Level;
  coins: number;
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
          {correct ? 'Treasure Found!' : 'Chapter Reviewed'}
        </h3>
        <p className="text-gray-400 text-sm">{level.title}</p>
      </div>

      {correct && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5 mb-5 text-center">
          <div className="text-3xl font-black text-yellow-400 mb-0.5 flex items-center justify-center gap-2">
            <Coins className="w-6 h-6" />+{level.quiz.points}
          </div>
          <div className="text-gray-400 text-xs">Bitcoin Gold Coins earned</div>
        </div>
      )}

      {!correct && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 mb-5 text-center">
          <div className="text-gray-400 text-sm mb-1">Fiat Trap! -5 coins lost</div>
          <div className="text-gray-500 text-xs">Review the explanation and continue.</div>
        </div>
      )}

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
        className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-400 text-white font-bold text-sm transition-all duration-150"
      >
        {level.id < LEVELS.length ? `Next: Chapter ${level.id + 1} →` : 'See Your Results →'}
      </button>
    </div>
  );
}

// ─── GAME COMPLETE ───────────────────────────────────────────────────────────
function GameCompleteScreen({ coins, onRestart }: { coins: number; onRestart: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const pct = Math.round((coins / TOTAL_POSSIBLE) * 100);
  const passed = coins >= PASSING_COINS;

  let badge = '📖';
  let title = 'Keep Exploring';
  let message = "You've begun your treasure hunting journey. Understanding Bitcoin's legacy potential is the first step.";

  if (pct >= 80) {
    badge = '🏆';
    title = 'Treasure Master!';
    message = "You've secured an excellent Bitcoin legacy plan! You can protect your family's wealth for generations.";
  } else if (pct >= 60) {
    badge = '🎯';
    title = 'Skilled Hunter!';
    message = "Good progress! You understand Bitcoin's potential as a legacy tool, but there's more treasure to find.";
  }

  return (
    <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="flex items-center justify-center gap-2 text-4xl font-black text-amber-400 mb-1">
          <Coins className="w-8 h-8" />{coins}
        </div>
        <div className="text-gray-500 text-sm mb-3">of {TOTAL_POSSIBLE} Bitcoin Gold Coins</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-amber-500' : 'bg-yellow-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">{pct}% — {passed ? 'Passed!' : 'Keep hunting!'}</div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-5 mb-5">
        <h4 className="text-white font-bold mb-3 text-sm">💡 Your Legacy Action Plan</h4>
        <ul className="space-y-2">
          {[
            "Start with a 5% Bitcoin allocation as a hedge",
            "Open a family Bitcoin wallet and gift small amounts",
            "Educate your family about sound money principles",
            "Consider Bitcoin as a retirement hedge (6-10% of portfolio)"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-xs">
              <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => shareScore(coins, TOTAL_POSSIBLE)}
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
export function TreasureHuntGame() {
  const [phase, setPhase] = useState<'intro' | 'story' | 'quiz' | 'levelComplete' | 'gameComplete'>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [coins, setCoins] = useState(0);
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
      setCoins(c => c + level.quiz.points);
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1800);
    } else {
      setCoins(c => Math.max(0, c - 5));
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
    setCoins(0);
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
            <span className="text-lg">🏴‍☠️💎</span>
            <span className="font-black text-sm text-white tracking-tight">Bitcoin Treasure Hunt</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
                <Coins className="w-3.5 h-3.5" />
                {coins}
              </div>
              <div className="text-gray-600 text-xs">Lv {currentLevel + 1}/{LEVELS.length}</div>
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
            coins={coins}
            correct={correct}
            onContinue={handleContinue}
            onShare={() => shareScore(coins, TOTAL_POSSIBLE)}
          />
        )}

        {phase === 'gameComplete' && (
          <GameCompleteScreen coins={coins} onRestart={handleRestart} />
        )}
      </div>

      <PointsPop points={level?.quiz.points ?? 10} visible={showPoints} />
    </div>
  );
}

export default TreasureHuntGame;
