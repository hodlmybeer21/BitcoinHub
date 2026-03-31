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
    title: "Britain's Imperial Burden",
    story: "Think back to the 1920s when Britain clung to the gold standard post-WWI, running deficits to maintain the pound's global role, leading to gold outflows and the 1931 sterling crisis that deepened the Great Depression. Just as families in the 1930s saw savings evaporate from currency devaluation, modern Americans face a dollar weakened by deficits needed to supply global demand for U.S. assets.",
    data: {
      title: "September 2025 Economic Reality",
      stats: [
        { label: "U.S. Gross National Debt", value: "$37.45T", note: "About 133% of GDP" },
        { label: "Dollar Index (DXY) YTD", value: "-10.2%", note: "Down to around 96.6" },
        { label: "Consumer Sentiment", value: "55.4", note: "Lowest since May 2025" }
      ]
    },
    quiz: {
      question: "What is the core conflict in Triffin's Dilemma that mirrors Britain's 1920s struggle?",
      options: [
        "A) The U.S. should hoard gold to strengthen the dollar",
        "B) Supplying dollars globally via deficits eventually erodes the currency's stability",
        "C) Foreign countries should stop demanding U.S. dollars for trade",
        "D) The Federal Reserve can print unlimited dollars without consequences"
      ],
      correct: 1,
      explanation: "Triffin's Dilemma exposed the Bretton Woods conflict: The U.S. had to export dollars through deficits to support global trade, but this created excess claims on finite gold, devaluing the dollar. In 2025's fiat version, $37.45 trillion in debt supplies Treasuries to foreigners, but it devalues the dollar (down 10.2% YTD), fueling 2.9% inflation that hits fixed-income retirees hardest.",
      points: 10
    }
  },
  {
    id: 2,
    title: "The Gold Drain Crisis",
    story: "Recall the late 1960s: U.S. gold reserves plummeted from 20,000 tons in 1950 to under 9,000 by 1971, drained by deficits from Vietnam War spending ($168 billion) and Great Society programs. This echoes the Roman Empire's debasement of silver coins to fund wars, leading to hyperinflation and collapse.",
    data: {
      title: "Current Debt Servicing Crisis",
      stats: [
        { label: "Annual Debt Servicing", value: "$1.1T+", note: "Exceeds Medicare spending" },
        { label: "Current Inflation Rate", value: "2.9%", note: "Core inflation at 3.1%" },
        { label: "Foreign Treasury Holdings", value: "$8T", note: "Demand requires U.S. supply" }
      ]
    },
    quiz: {
      question: "Why did the U.S. abandon the gold standard in 1971, and how does this relate to today's fiscal pressures?",
      options: [
        "A) The U.S. found new gold mines and no longer needed the standard",
        "B) Deficits from wars and social spending led to foreign gold redemptions, depleting reserves",
        "C) Europe banned U.S. dollars in international transactions",
        "D) The Fed overprinted gold-backed notes by mistake"
      ],
      correct: 1,
      explanation: "Persistent deficits flooded markets with dollars, prompting conversions (e.g., France's demands), much like Rome's coin clipping eroded trust. Nixon ended gold convertibility to avert crisis. Now, with debt at $37.45 trillion and servicing over $1.1 trillion yearly (more than Medicare), the 'New Triffin' relies on faith amid tariffs. This hits younger people hardest: shakier entitlements, $1.8 trillion student debt, and gig economy insecurity.",
      points: 10
    }
  },
  {
    id: 3,
    title: "Imperial Overstretch Pattern",
    story: "Consider the British pound's fall in the 1800s: Imperial deficits from wars and global trade dominance led to gold drains, culminating in WWI-era devaluation, similar to Spain's 'price revolution' from colonial silver. Like a family overspending on credit for status, the U.S. borrows to maintain dollar hegemony, but it squeezes household budgets via higher prices for everything from housing to healthcare.",
    data: {
      title: "Generational Impact Analysis",
      stats: [
        { label: "Homeownership Age", value: "26 (1980) → 33 (2025)", note: "Rising barriers for young" },
        { label: "Student Debt Burden", value: "$1.8T", note: "Crushing young adults" },
        { label: "Real Wage Stagnation", value: "50+ years", note: "Since gold standard end" }
      ]
    },
    quiz: {
      question: "What historical pattern connects Britain's imperial decline to America's current reserve currency challenges?",
      options: [
        "A) Both relied on infinite commodity supplies without deficits",
        "B) Global currency status requires deficits that erode confidence over time",
        "C) Britain fixed its issues by adopting the dollar early",
        "D) The U.S. avoided Britain's mistakes by eliminating deficits"
      ],
      correct: 1,
      explanation: "Britain's pound, like the dollar, demanded deficits for empire/trade, but overreach inflated values away. Today, U.S. deficits meet insatiable demand for safe assets, but the dollar's 10.2% YTD drop from fiscal strains echoes those falls. Older generations enjoyed pound/dollar peaks; younger ones inherit wealth gaps, with homeownership ages rising from 26 in 1980 to 33 in 2025.",
      points: 10
    }
  },
  {
    id: 4,
    title: "The Petrodollar Trap",
    story: "Post-1971, the dollar became fiat, backed by oil deals (petrodollars) like OPEC's 1970s agreements, but abrupt deficit cuts could spike rates globally, reminiscent of the 1931 British gold abandonment that halted trade and worsened Depression unemployment. Like a business slashing costs and losing customers, cutting spending cold turkey might lower taxes short-term but crash markets.",
    data: {
      title: "Global Dependency Metrics",
      stats: [
        { label: "Foreign Treasury Holdings", value: "$8T", note: "Require ongoing U.S. deficit spending" },
        { label: "Petrodollar Recycling", value: "~$600B/year", note: "Oil revenue reinvested in Treasuries" },
        { label: "Rate Spike Risk", value: "5-8%", note: "If foreign demand drops suddenly" }
      ]
    },
    quiz: {
      question: "In September 2025, why is Triffin's Dilemma intensifying, and who suffers most from its effects?",
      options: [
        "A) Deficits are shrinking; only foreign investors feel the impact",
        "B) Deficits and dollar devaluation intensify inequality — younger generations suffer most",
        "C) Triffin's Dilemma only affects older, fixed-income retirees",
        "D) The dilemma has been solved by modern monetary policy"
      ],
      correct: 1,
      explanation: "Like petrodollars recycling oil wealth into Treasuries, foreign holdings ($8 trillion) demand U.S. supply, but stopping risks rate spikes and recessions, as in 1931. In 2025, with 2.9% inflation and policies like tariffs, the cycle persists without Bretton Woods' anchor. Younger generations suffer most: Deficits crowd out education/infrastructure investments, fueling job insecurity in automated economies.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);

function shareScore(score: number) {
  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const text = encodeURIComponent(`I just completed "Triffin's Dilemma" on @BitcoinHub 🏦⚡\n\nScore: ${score}/${TOTAL_POSSIBLE} (${pct}%)\n\nUnderstanding the impossible tradeoff at the heart of the dollar's reserve currency status.\n\n👉 Try it free: hub.goodbotai.tech\n\n#Bitcoin #TriffinsDilemma #Dollar #Macro`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-slate-400/70 mb-1.5 font-medium">
        <span>Level {current} of {total}</span><span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-slate-500 to-gray-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
        <div className="text-6xl mb-4">🏦⚡</div>
        <h2 className="text-3xl font-black text-white mb-3">Triffin's Dilemma Quiz</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          The impossible tradeoff at the heart of the dollar's reserve currency status — and why it matters for every generation.
        </p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll discover:</h3>
        <ul className="space-y-2.5">
          {[
            "Why the dollar's global role requires the U.S. to run persistent deficits",
            "How this creates inflation that erodes everyone's purchasing power",
            "The historical pattern from Britain to Rome to modern America",
            "Why younger generations bear the greatest burden"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-slate-400 mt-0.5 shrink-0">✓</span>{item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ v: "4", l: "Chapters" }, { v: "$37.45T", l: "U.S. Debt" }, { v: "-10.2%", l: "DXY YTD" }].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-slate-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-500 hover:to-gray-500 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98]">
        Begin the Quiz →
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
        <div className="inline-block px-3 py-1 rounded-full bg-slate-900/40 border border-slate-700/50 text-slate-400 text-xs font-bold tracking-wider mb-3">
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
                <span className="text-slate-400 font-bold text-sm">{s.value}</span>
                <span className="text-gray-600 text-xs ml-2">— {s.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onComplete} className="w-full py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm transition-all duration-150">
        Continue to Question →
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
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-slate-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-slate-800/70 border-slate-500 text-slate-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-slate-800/50 border-slate-500/70 text-slate-200';
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
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-slate-900/40 border-slate-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-slate-200' : 'text-red-200'}`}>{quiz.explanation}</p>
          </div>
          <div className="mt-2 pl-8">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-slate-700/50 text-slate-300' : 'bg-red-700/50 text-red-300'}`}>
              {isCorrect ? `+${quiz.points} points` : '0 points'}
            </span>
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
  let badge = '📖', title = 'Keep Learning', message = "You've seen how the dollar's global role creates an inescapable dilemma. Understanding it is the first step.";
  if (pct >= 80) { badge = '🏆'; title = 'Masterful!'; message = "You deeply understand Triffin's Dilemma and its generational consequences. You see the structural flaw at the heart of the dollar system."; }
  else if (pct >= 60) { badge = '⚡'; title = 'Well Done!'; message = "You understand the core tension: supplying the world with dollars requires deficits that erode the dollar over time."; }
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="text-4xl font-black text-slate-400 mb-1">{score}</div>
        <div className="text-gray-500 text-sm mb-3">{TOTAL_POSSIBLE} points possible</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-slate-500' : 'bg-gray-600'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-gray-500">{pct}% — {passed ? 'Passed!' : 'Keep studying!'}</div>
      </div>
      <button onClick={() => shareScore(score)} className="w-full py-4 rounded-2xl bg-[#1DA1F2] hover:bg-[#1a9bd9] active:bg-[#1589c4] text-white font-black text-base transition-all duration-150 flex items-center justify-center gap-2.5 mb-3 shadow-lg">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share Your Score on X
      </button>
      <button onClick={onRestart} className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm transition-all duration-150">
        Play Again
      </button>
    </div>
  );
}

export function TriffinDilemmaGame() {
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
            <span className="text-lg">🏦⚡</span>
            <span className="font-black text-sm text-white tracking-tight">Triffin's Dilemma</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="text-slate-400 font-black text-sm">{score} pts</div>
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

export default TriffinDilemmaGame;
