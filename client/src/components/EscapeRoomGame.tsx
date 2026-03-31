'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, RotateCcw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Level {
  id: number;
  title: string;
  story: string;
  data: { title: string; stats: { label: string; value: string; note: string }[] };
  quiz: { question: string; options: string[]; correct: number; explanation: string; points: number };
}

// ─── Game Data (4 levels) ────────────────────────────────────────────────────
const LEVELS: Level[] = [
  {
    id: 1,
    title: "The Inflation Lock – Decode the Devaluation",
    story: "You're locked in the Fiat Prison where inflation at 2.7% (July 2025) is slowly eroding your $50K savings by $1,350 yearly. The first lock requires you to find the right hedge against this silent wealth theft.",
    data: {
      title: "The Inflation Trap",
      stats: [
        { label: "Current Inflation Rate", value: "2.7%", note: "July 2025 — eroding savings power" },
        { label: "Your Annual Loss", value: "$1,350", note: "On $50K cash savings" },
        { label: "Dollar Decline Since 2020", value: "23%", note: "vs Bitcoin up 3,112% historically" }
      ]
    },
    quiz: {
      question: "What's your best defense against inflation eroding your savings?",
      options: [
        "A) Keep everything in cash",
        "B) Buy Bitcoin with fixed supply",
        "C) Government bonds at 2%",
        "D) Luxury spending sprees"
      ],
      correct: 1,
      explanation: "Correct! Bitcoin's scarcity (21 million cap) has historically outpaced inflation, protecting purchasing power when fiat currencies lose value through printing.",
      points: 10
    }
  },
  {
    id: 2,
    title: "The Debt Chain – Break Student Loan Bonds",
    story: "Heavy chains of student debt weigh you down — part of the $1.7T crushing your generation. Your average $40K burden keeps you trapped. The key to breaking these chains lies in combining side hustles with smart crypto investments.",
    data: {
      title: "The Student Debt Crisis",
      stats: [
        { label: "Total Student Debt", value: "$1.7 trillion", note: "Crushing Millennial wealth building" },
        { label: "Average Individual Debt", value: "$40,000", note: "Delaying homeownership and families" },
        { label: "Millennials in Crypto", value: "50%+", note: "Using new tools for financial freedom" }
      ]
    },
    quiz: {
      question: "What's the fastest path to escape crushing student debt?",
      options: [
        "A) Take out more loans for expenses",
        "B) Combine crypto investments with side hustles",
        "C) Ignore the debt and hope for forgiveness",
        "D) Put everything in high-fee savings accounts"
      ],
      correct: 1,
      explanation: "Smart choice! Side hustles ($500-$1K/month) plus strategic crypto allocation create multiple income streams to accelerate debt payoff and build wealth simultaneously.",
      points: 10
    }
  },
  {
    id: 3,
    title: "The Community Door – Build a Support Network",
    story: "The prison's community door is locked, but you can pick it by building connections. Starting a Discord for Millennials to share Bitcoin tips and strategies multiplies everyone's knowledge. In 2025, 72% of young adults are taking action against rising costs.",
    data: {
      title: "The Power of Financial Communities",
      stats: [
        { label: "Young Adults Taking Action", value: "72%", note: "Against rising costs in 2025" },
        { label: "DAO Growth Rate", value: "30%", note: "Annual growth in decentralized communities" },
        { label: "Community Learning Multiplier", value: "5x faster", note: "Shared knowledge vs solo learning" }
      ]
    },
    quiz: {
      question: "Why is building a financial community crucial for Millennials?",
      options: [
        "A) Faster learning and shared strategies",
        "B) Higher fees and costs",
        "C) No real benefit",
        "D) Isolation works better"
      ],
      correct: 0,
      explanation: "Absolutely! Communities multiply your learning speed, share successful strategies, and provide support during market volatility. Together you're stronger than the system.",
      points: 10
    }
  },
  {
    id: 4,
    title: "The Wealth Exit – Craft Your Freedom Plan",
    story: "You've reached the final exit! Use your Freedom Keys to unlock your escape plan. With Bitcoin up 18% YTD and REITs up 5%, smart diversification is key to permanent escape from the Fiat Prison.",
    data: {
      title: "Your 2025 Wealth Building Options",
      stats: [
        { label: "Bitcoin YTD Performance", value: "+18%", note: "Strong 2025 performance" },
        { label: "REIT Performance", value: "+5%", note: "Inflation-protected real estate" },
        { label: "AI Skills Premium", value: "40%+ salary", note: "Tech skills command premium pay" }
      ]
    },
    quiz: {
      question: "What's the best 2025 strategy for Millennial wealth building?",
      options: [
        "A) Hoard cash and hope for the best",
        "B) Diversified hedges: crypto, real estate, skills",
        "C) Take on more debt for consumption",
        "D) Do nothing and complain online"
      ],
      correct: 1,
      explanation: "Perfect escape plan! Diversification across Bitcoin (inflation hedge), REITs (real assets), and high-value skills creates multiple wealth streams that can't be easily devalued.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);

// ─── Share ────────────────────────────────────────────────────────────────────
function shareScore(score: number, maxScore: number) {
  const pct = Math.round((score / maxScore) * 100);
  const text = encodeURIComponent(
    `I just escaped the "Fiat Prison" on @BitcoinHub 🔐⚡\n\n` +
    `Freedom Keys: ${score}/${maxScore} (${pct}%)\n\n` +
    `Breaking free from inflation, debt, and the system that traps wealth.\n\n` +
    `👉 Try it free: hub.goodbotai.tech\n\n` +
    `#MillennialFinance #Bitcoin #EscapeFiat`
  );
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-indigo-400/70 mb-1.5 font-medium">
        <span>Level {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PointsPop({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-bounce text-3xl font-black text-indigo-400 drop-shadow-lg">🔑 +10 Freedom Keys!</div>
    </div>
  );
}

// ─── Screen Components ────────────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-7">
        <div className="text-6xl mb-4">🔐⚡</div>
        <h2 className="text-3xl font-black text-white mb-3">Crypto Escape Room</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          Break free from the Fiat Prison! 4 puzzles, 4 Freedom Keys. Solve economic riddles to escape and build real wealth.
        </p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll escape from:</h3>
        <ul className="space-y-2.5">
          {[
            "The inflation lock silently stealing your savings",
            "The debt chain weighing down your future",
            "The isolation that makes financial freedom harder",
            "The exit plan to permanent wealth freedom"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-indigo-400 mt-0.5 shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ v: "4", l: "Puzzles" }, { v: "40", l: "Max Keys" }, { v: "🔑", l: "Freedom" }].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-indigo-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-indigo-900/30 hover:scale-[1.02] active:scale-[0.98]">
        Start Escape 🔐
      </button>
    </div>
  );
}

function StoryScreen({ level, onComplete }: { level: Level; onComplete: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-5">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-700/50 text-indigo-400 text-xs font-bold tracking-wider mb-3">
          PUZZLE {level.id} OF {LEVELS.length} — THE INFLATION LOCK
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
                <span className="text-indigo-400 font-bold text-sm">{s.value}</span>
                <span className="text-gray-600 text-xs ml-2">— {s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onComplete} className="w-full py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm transition-all duration-150">
        Continue to Puzzle →
      </button>
    </div>
  );
}

function QuizScreen({ level, selectedAnswer, answered, onSelect }: {
  level: Level; selectedAnswer: number | null; answered: boolean; onSelect: (i: number) => void;
}) {
  const quiz = level.quiz;
  const isCorrect = selectedAnswer === quiz.correct;
  return (
    <div>
      <div className="mb-4">
        <div className="text-xs text-gray-600 font-semibold mb-1.5">PUZZLE</div>
        <h4 className="text-white font-bold text-base leading-snug">{quiz.question}</h4>
      </div>
      <div className="space-y-2.5 mb-5">
        {quiz.options.map((opt, i) => {
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-indigo-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-indigo-900/50 border-indigo-500 text-indigo-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-indigo-900/40 border-indigo-500/70 text-indigo-200';
          }
          return (
            <button key={i} onClick={() => !answered && onSelect(i)} disabled={answered}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 text-sm font-medium ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-indigo-200' : 'text-red-200'}`}>{quiz.explanation}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-indigo-700/50 text-indigo-300' : 'bg-red-700/50 text-red-300'}`}>
                  {isCorrect ? `+${quiz.points} Freedom Keys 🔑` : '0 Keys'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelCompleteScreen({ level, score, correct, onContinue, onShare }: {
  level: Level; score: number; correct: boolean; onContinue: () => void; onShare: () => void;
}) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-5">
        <div className="text-5xl mb-3">{correct ? '🔓' : '🔒'}</div>
        <h3 className="text-2xl font-black text-white mb-1">{correct ? 'Lock Cracked!' : 'Puzzle Reviewed'}</h3>
        <p className="text-gray-400 text-sm">{level.title}</p>
      </div>
      {correct && (
        <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-2xl p-5 mb-5 text-center">
          <div className="text-3xl font-black text-indigo-400 mb-0.5 flex items-center justify-center gap-2">
            <Key className="w-5 h-5" />+{level.quiz.points}
          </div>
          <div className="text-gray-400 text-xs">Freedom Keys earned</div>
        </div>
      )}
      <div className="mb-4">
        <button onClick={onShare} className="w-full py-3 rounded-xl bg-[#1DA1F2]/15 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/40 text-[#1DA1F2] font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Share This Puzzle
        </button>
      </div>
      <button onClick={onContinue} className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-400 text-white font-bold text-sm transition-all duration-150">
        {level.id < LEVELS.length ? `Next Puzzle ${level.id + 1} →` : 'See Final Results →'}
      </button>
    </div>
  );
}

function GameCompleteScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const passed = score >= TOTAL_POSSIBLE * 0.6;
  let badge = '🔐', title = 'Keep Escaping', message = "You've started your escape from the Fiat Prison. Each puzzle you solve brings you closer to freedom.";
  if (pct >= 80) { badge = '🏆'; title = 'Freedom Master!'; message = "You've cracked every lock and escaped! You have the knowledge to build lasting wealth."; }
  else if (pct >= 60) { badge = '🔓'; title = 'On Your Way!'; message = "Good progress! You understand the keys to financial freedom. Keep building."; }

  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="flex items-center justify-center gap-2 text-4xl font-black text-indigo-400 mb-1">
          <Key className="w-8 h-8" />{score}
        </div>
        <div className="text-gray-500 text-sm mb-3">of {TOTAL_POSSIBLE} Freedom Keys</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-indigo-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-gray-500">{pct}% — {passed ? 'Escaped!' : 'Keep trying!'}</div>
      </div>
      <button onClick={() => shareScore(score, TOTAL_POSSIBLE)} className="w-full py-4 rounded-2xl bg-[#1DA1F2] hover:bg-[#1a9bd9] active:bg-[#1589c4] text-white font-black text-base transition-all duration-150 flex items-center justify-center gap-2.5 mb-3 shadow-lg">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share Your Escape on X
      </button>
      <button onClick={onRestart} className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-all duration-150">
        Play Again
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function EscapeRoomGame() {
  const [phase, setPhase] = useState<'intro' | 'story' | 'quiz' | 'levelComplete' | 'gameComplete'>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const level = LEVELS[currentLevel];

  const handleStart = useCallback(() => setPhase('story'), []);
  const handleStoryComplete = useCallback(() => { setPhase('quiz'); setSelectedAnswer(null); setAnswered(false); }, []);
  const handleSelect = useCallback((i: number) => {
    if (answered) return;
    const isCorrectAnswer = i === level.quiz.correct;
    setSelectedAnswer(i); setAnswered(true); setCorrect(isCorrectAnswer);
    if (isCorrectAnswer) { setScore(s => s + level.quiz.points); setShowPoints(true); setTimeout(() => setShowPoints(false), 1800); }
  }, [answered, level]);
  const handleContinue = useCallback(() => {
    if (currentLevel + 1 >= LEVELS.length) setPhase('gameComplete');
    else { setCurrentLevel(c => c + 1); setPhase('story'); setSelectedAnswer(null); setAnswered(false); }
  }, [currentLevel]);
  const handleRestart = useCallback(() => { setPhase('intro'); setCurrentLevel(0); setScore(0); setSelectedAnswer(null); setAnswered(false); setCorrect(false); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐⚡</span>
            <span className="font-black text-sm text-white tracking-tight">Crypto Escape Room</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-indigo-400 font-black text-sm"><Key className="w-3.5 h-3.5" />{score}</div>
              <div className="text-gray-600 text-xs">Lv {currentLevel + 1}/{LEVELS.length}</div>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {phase !== 'intro' && phase !== 'gameComplete' && <ProgressBar current={currentLevel + 1} total={LEVELS.length} />}
        {phase === 'intro' && <IntroScreen onStart={handleStart} />}
        {phase === 'story' && <StoryScreen level={level} onComplete={handleStoryComplete} />}
        {phase === 'quiz' && <>
          <QuizScreen level={level} selectedAnswer={selectedAnswer} answered={answered} onSelect={handleSelect} />
          {answered && (
            <div className="mt-4">
              <button onClick={handleContinue} className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-400 text-white font-bold text-sm transition-all duration-150">
                {currentLevel + 1 >= LEVELS.length ? 'See Final Results →' : `Next Puzzle ${currentLevel + 2} →`}
              </button>
            </div>
          )}
        </>}
        {phase === 'levelComplete' && <LevelCompleteScreen level={level} score={score} correct={correct} onContinue={handleContinue} onShare={() => shareScore(score, TOTAL_POSSIBLE)} />}
        {phase === 'gameComplete' && <GameCompleteScreen score={score} onRestart={handleRestart} />}
      </div>
      <PointsPop visible={showPoints} />
    </div>
  );
}

export default EscapeRoomGame;
