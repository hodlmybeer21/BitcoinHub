'use client';
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RotateCcw } from 'lucide-react';

interface Level {
  id: number;
  title: string;
  story: string;
  data: { title: string; stats: { label: string; value: string; note: string }[] };
  quiz: { question: string; options: string[]; correct: number; explanation: string; points: number };
}

const LEVELS: Level[] = [
  {
    id: 1,
    title: "The Stagnation Trap – Wages vs. The System",
    story: "As a Millennial in 2025, you earn $65K but your Boomer boss started at $50K in 1985 (~$140K in today's dollars). Despite being more educated and productive, you're paid 46 cents less per dollar than your Boomer counterparts were at your age. The system isn't broken — it was designed this way.",
    data: {
      title: "The Millennial Wage Gap",
      stats: [
        { label: "Boomer Wage at Age 25", value: "$140K (2025$)", note: "vs your $65K actual" },
        { label: "Productivity Gap", value: "+43%", note: "You produce 43% more than Boomers did" },
        { label: "Wage Penalty", value: "46¢ per dollar", note: "What Boomers earned vs Millennials" }
      ]
    },
    quiz: {
      question: "Why are Millennial wages suppressed despite higher productivity?",
      options: [
        "A) Millennials are less educated",
        "B) Institutional structures that suppress wages while protecting asset prices",
        "C) Younger workers are lazier",
        "D) Unions are too strong"
      ],
      correct: 1,
      explanation: "Correct! The system is designed to suppress wages (labor costs) while inflating asset prices — benefiting those who already own assets (Boomers). This is a feature, not a bug, for those at the top.",
      points: 10
    }
  },
  {
    id: 2,
    title: "The Housing Prison – Priced Out of the Dream",
    story: "Your Boomer parents bought their first home for $82K in 1985 (~$200K today). You rent a 1BR for $1,800/month while saving for a down payment that keeps getting further away. Home prices have tripled relative to wages since you entered the workforce.",
    data: {
      title: "The Housing Affordability Crisis",
      stats: [
        { label: "Boomer First Home Price", value: "$82K (1985)", note: "~$200K in 2025 dollars" },
        { label: "Median Home Today", value: "$420K", note: "11x median income ratio" },
        { label: "Rent Burden", value: "40%+ of income", note: "Spent on housing vs 20% in 1985" }
      ]
    },
    quiz: {
      question: "What economic policy most contributed to housing becoming unaffordable for Millennials?",
      options: [
        "A) Too many homes being built",
        "B) Low interest rates and quantitative easing that inflated asset prices",
        "C) Millennials not working hard enough",
        "D) Immigration driving up housing demand"
      ],
      correct: 1,
      explanation: "Exactly! Artificially low interest rates (Fed policy) and QE made borrowing cheap, bidding up home prices while keeping wages suppressed. This transferred wealth from Millennials (who need to buy) to Boomers (who already own).",
      points: 10
    }
  },
  {
    id: 3,
    title: "The Career Debt Prison – $1.8T in Chains",
    story: "You took on $40K in student loans to get a degree your Boomer parents didn't need. But degrees are now the baseline requirement for jobs that paid well without them in 1985. Meanwhile, your Boomer neighbor climbed the same career ladder debt-free, with a pension waiting at the end.",
    data: {
      title: "The Student Debt Trap",
      stats: [
        { label: "Total U.S. Student Debt", value: "$1.8 trillion", note: "Held by 45M borrowers" },
        { label: "Avg. Debt per Borrower", value: "$28K", note: "Delaying major purchases by 5-7 years" },
        { label: "Boomer College Cost", value: "$0-$5K/year", note: "vs $30K+/year today" }
      ]
    },
    quiz: {
      question: "How did the student debt crisis specifically impact Millennial wealth building?",
      options: [
        "A) Increased homeownership rates through credentialing",
        "B) Delayed homeownership, retirement savings, and family formation by 5-7 years on average",
        "C) No real impact on long-term wealth",
        "D) Made all Millennials financially independent faster"
      ],
      correct: 1,
      explanation: "Right! Student debt delayed homeownership (the primary Boomer wealth builder), stunted retirement savings during compound growth years, and pushed family formation later. Each year of delay costs $50K-$100K+ in lifetime wealth.",
      points: 10
    }
  },
  {
    id: 4,
    title: "The Exit Plan – Breaking Free",
    story: "You've analyzed the trap. Now the question is: what's your escape plan? With $110K Bitcoin, 5% allocation, and skills in emerging tech, you can build a path out. Your Boomer parents didn't need one — the system was open. You're building your own exit.",
    data: {
      title: "The Millennial Escape Routes",
      stats: [
        { label: "Boomer Wealth Median", value: "$190K", note: "vs Millennial $43K" },
        { label: "Bitcoin 5% Allocation", value: "$5,500", note: "Hedge against dollar debasement" },
        { label: "Tech Skills Premium", value: "40%+", note: "vs non-tech同龄人" }
      ]
    },
    quiz: {
      question: "What's the most effective Millennial wealth-building strategy in 2025?",
      options: [
        "A) Keep cash in savings accounts at 0.5% APY",
        "B) Invest in Bitcoin + high-income skills + diversified real assets",
        "C) Wait for student loan forgiveness",
        "D) Work harder at a single job for 40 years"
      ],
      correct: 1,
      explanation: "Perfect escape plan! High-income skills (40%+ premium) provide cash flow, Bitcoin (up 18% YTD) provides inflation protection, and real assets (REITs, fractional ownership) provide diversification. Multiple streams, multiple exits.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);

function shareScore(score: number) {
  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const text = encodeURIComponent(`I just escaped the Millennial Financial Trap on @BitcoinHub 📈⚡\n\nScore: ${score}/${TOTAL_POSSIBLE} (${pct}%)\n\nBreaking free from wage suppression, housing unaffordability, and student debt.\n\n👉 Try it free: hub.goodbotai.tech\n\n#MillennialFinance #Bitcoin #WealthBuilding #EscapeFiat`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-emerald-400/70 mb-1.5 font-medium">
        <span>Level {current} of {total}</span><span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-7">
        <div className="text-6xl mb-4">📈🔓</div>
        <h2 className="text-3xl font-black text-white mb-3">Millennial Escape Route</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          4 chapters through the economic trap that hit your generation hardest — and how to build your way out.
        </p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll escape:</h3>
        <ul className="space-y-2.5">
          {[
            "The wage suppression designed into the system",
            "Housing priced beyond reach by asset inflation",
            "The $1.8T student debt chains",
            "Your personal exit plan to build real wealth"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>{item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ v: "4", l: "Chapters" }, { v: "$190K", l: "Boomer vs $43K" }, { v: "1.8T", l: "Student Debt" }].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-emerald-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]">
        Find Your Exit Route →
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
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 text-xs font-bold tracking-wider mb-3">
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
                <span className="text-emerald-400 font-bold text-sm">{s.value}</span>
                <span className="text-gray-600 text-xs ml-2">— {s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onComplete} className="w-full py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm transition-all duration-150">
        Continue to Quiz →
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
        <div className="text-xs text-gray-600 font-semibold mb-1.5">QUESTION</div>
        <h4 className="text-white font-bold text-base leading-snug">{quiz.question}</h4>
      </div>
      <div className="space-y-2.5 mb-5">
        {quiz.options.map((opt, i) => {
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-emerald-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-emerald-900/50 border-emerald-500 text-emerald-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-emerald-900/40 border-emerald-500/70 text-emerald-200';
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
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-emerald-200' : 'text-red-200'}`}>{quiz.explanation}</p>
              <div className="mt-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-emerald-700/50 text-emerald-300' : 'bg-red-700/50 text-red-300'}`}>
                  {isCorrect ? `+${quiz.points} points` : '0 points'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameCompleteScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 80); }, []);
  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const passed = score >= TOTAL_POSSIBLE * 0.6;
  let badge = '📈', title = 'Keep Climbing', message = "You've mapped the trap. Now you know where to focus your escape efforts.";
  if (pct >= 80) { badge = '🏆'; title = 'Escape Master!'; message = "You understand the Millennial wealth trap inside and out — and have the tools to break free. Time to build."; }
  else if (pct >= 60) { badge = '⚡'; title = 'Route Found!'; message = "You've identified the key barriers. Now it's about executing your personal escape plan."; }
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="text-4xl font-black text-emerald-400 mb-1">{score}</div>
        <div className="text-gray-500 text-sm mb-3">{TOTAL_POSSIBLE} points possible</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-gray-500">{pct}% — {passed ? 'Escaped!' : 'Keep planning!'}</div>
      </div>
      <button onClick={() => shareScore(score)} className="w-full py-4 rounded-2xl bg-[#1DA1F2] hover:bg-[#1a9bd9] active:bg-[#1589c4] text-white font-black text-base transition-all duration-150 flex items-center justify-center gap-2.5 mb-3 shadow-lg">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share Your Escape on X
      </button>
      <button onClick={onRestart} className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-all duration-150">
        Play Again
      </button>
    </div>
  );
}

export function MillennialEscapeGame() {
  const [phase, setPhase] = useState<'intro' | 'story' | 'quiz' | 'gameComplete'>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const level = LEVELS[currentLevel];

  const handleStart = useCallback(() => setPhase('story'), []);
  const handleStoryComplete = useCallback(() => { setPhase('quiz'); setSelectedAnswer(null); setAnswered(false); }, []);
  const handleSelect = useCallback((i: number) => {
    if (answered) return;
    setSelectedAnswer(i); setAnswered(true);
    if (i === level.quiz.correct) setScore(s => s + level.quiz.points);
  }, [answered, level]);
  const handleContinue = useCallback(() => {
    if (currentLevel + 1 >= LEVELS.length) setPhase('gameComplete');
    else { setCurrentLevel(c => c + 1); setPhase('story'); setSelectedAnswer(null); setAnswered(false); }
  }, [currentLevel]);
  const handleRestart = useCallback(() => { setPhase('intro'); setCurrentLevel(0); setScore(0); setSelectedAnswer(null); setAnswered(false); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📈🔓</span>
            <span className="font-black text-sm text-white tracking-tight">Millennial Escape Route</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="text-emerald-400 font-black text-sm">{score} pts</div>
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
                {currentLevel + 1 >= LEVELS.length ? 'See Final Results →' : `Next: Chapter ${currentLevel + 2} →`}
              </button>
            </div>
          )}
        </>}
        {phase === 'gameComplete' && <GameCompleteScreen score={score} onRestart={handleRestart} />}
      </div>
    </div>
  );
}

export default MillennialEscapeGame;
