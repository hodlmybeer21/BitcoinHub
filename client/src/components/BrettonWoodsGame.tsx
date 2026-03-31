'use client';
import { useState, useEffect, useCallback } from 'react';

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
    title: "The Fundamental Imbalance",
    story: "The Bretton Woods system of fixed exchange rates was built on a contradiction: the U.S. promised to exchange dollars for gold at $35/oz, but also financed Vietnam and Great Society programs without raising taxes. This 'exorbitant privilege' — paying for global leadership with depreciating dollars — was unsustainable.",
    data: {
      title: "The 1971 Crisis",
      stats: [
        { label: "U.S. Gold Reserves 1950", value: "20,000 tons", note: "Full backing for dollar" },
        { label: "U.S. Gold Reserves 1971", value: "<9,000 tons", note: "Depleted by deficits" },
        { label: "Dollar's Official Value", value: "$35/oz gold", note: "Had to be abandoned" }
      ]
    },
    quiz: {
      question: "What caused the fundamental imbalance that led to Bretton Woods' eventual collapse?",
      options: [
        "A) Foreign countries refused to use dollars",
        "B) The U.S. spent beyond its means while promising gold convertibility",
        "C) Gold became too valuable to exchange",
        "D) Trade surpluses drained U.S. reserves"
      ],
      correct: 1,
      explanation: "Exactly right! The U.S. had the 'exorbitant privilege' of importing real wealth by paying in dollars, while running deficits that depleted gold. Like a family spending freely while claiming to back every dollar with savings — eventually the bluff gets called.",
      points: 10
    }
  },
  {
    id: 2,
    title: "Tariffs and Capital Controls",
    story: "In the late 1960s, the U.S. tried to restrict capital flows to preserve gold — imposing the 'interest equalization tax' and other controls. But global capital found ways around them, just as modern traders bypass today's tariffs. Freedom of capital movement always wins eventually.",
    data: {
      title: "Capital Flight Dynamics",
      stats: [
        { label: "Interest Equalization Tax 1965", value: "15%", note: "U.S. tax on foreign bond purchases" },
        { label: "Result", value: "Capital flight", note: "Money escaped to avoid the tax" },
        { label: "Modern Parallel", value: "Tariff circumvention", note: "$200B+ in tariff evasion" }
      ]
    },
    quiz: {
      question: "How did tariffs and capital controls affect the Bretton Woods system in the late 1960s?",
      options: [
        "A) They strengthened the dollar and prevented capital flight",
        "B) They created distortions that accelerated capital flight and gold losses",
        "C) They had no effect on the monetary system",
        "D) They increased U.S. gold reserves"
      ],
      correct: 1,
      explanation: "Right! Controls tried to stop what markets wanted to do anyway — move capital. Just like modern tariffs, they created black markets and arbitrage. Money finds a way around barriers, and when it does, the pressure builds until something breaks.",
      points: 10
    }
  },
  {
    id: 3,
    title: "The 1971 Collapse",
    story: "On August 15, 1971, Nixon ended gold convertibility. The 'Nixon Shock' created the modern fiat system overnight. Double-digit inflation followed, gas lines appeared, and the post-war prosperity bargain broke down.",
    data: {
      title: "The Nixon Shock Aftermath",
      stats: [
        { label: "Inflation Post-1971", value: "7%+ annual", note: "Peaked at 13.5% in 1980" },
        { label: "Dollar Devaluation", value: "-7% vs gold", note: "First devaluation in 1971" },
        { label: "Gas Lines 1973", value: "Oil embargo", note: "System stress visible" }
      ]
    },
    quiz: {
      question: "What was a key outcome of Bretton Woods' collapse in the 1970s?",
      options: [
        "A) Global financial stability and low inflation",
        "B) Double-digit inflation, oil crises, and the rise of fiat currencies",
        "C) A return to the gold standard immediately",
        "D) The dollar becoming stronger than ever"
      ],
      correct: 1,
      explanation: "Correct! Without gold's discipline, governments could print freely. The 1970s showed what happens: inflation spirals, oil shocks, and economic instability. The lesson? Without a hard money anchor, fiscal discipline is nearly impossible.",
      points: 10
    }
  },
  {
    id: 4,
    title: "Modern Parallels — 2025 Warning Signs",
    story: "Like the 1931 sterling crisis and 1971 dollar crisis, 2025 shows similar warning signs: $37.45T in debt, dollar down 10.2% YTD, 2.9% inflation, and consumer sentiment at 55.4. History doesn't repeat, but it rhymes.",
    data: {
      title: "2025 Economic Warning Signs",
      stats: [
        { label: "U.S. Debt", value: "$37.45T", note: "133% of GDP" },
        { label: "Dollar Index YTD", value: "-10.2%", note: "Worst year since 2022" },
        { label: "Consumer Sentiment", value: "55.4", note: "Near recession lows" }
      ]
    },
    quiz: {
      question: "How does fiscal indiscipline in Bretton Woods parallel today's economic challenges?",
      options: [
        "A) Today is completely different — no parallels exist",
        "B) Running deficits while maintaining a reserve currency creates structural fragility that can suddenly unravel",
        "C) Only gold-backed currencies face these issues",
        "D) Deficits don't matter when you control the world reserve currency"
      ],
      correct: 1,
      explanation: "Exactly! The dollar's reserve status lets the U.S. borrow cheaply, but debt compounds. Like Bretton Woods' end — where deficits depleted gold until the system broke — today debt servicing costs ($1.1T+/year) crowd out investment. The difference: no gold to run out of, just faith in the dollar.",
      points: 10
    }
  }
];

const TOTAL_POSSIBLE = LEVELS.reduce((sum, l) => sum + l.quiz.points, 0);

function shareScore(score: number) {
  const pct = Math.round((score / TOTAL_POSSIBLE) * 100);
  const text = encodeURIComponent(`I just studied the Bretton Woods Collapse on @BitcoinHub 🏦⚡\n\nScore: ${score}/${TOTAL_POSSIBLE} (${pct}%)\n\nUnderstanding how 1971 broke the monetary system — and why 2025 looks familiar.\n\n👉 Try it free: hub.goodbotai.tech\n\n#Bitcoin #BrettonWoods #Macro #EconomicHistory`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full mb-5">
      <div className="flex justify-between text-xs text-amber-400/70 mb-1.5 font-medium">
        <span>Level {current} of {total}</span><span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
        <div className="text-6xl mb-4">🏦💎</div>
        <h2 className="text-3xl font-black text-white mb-3">Bretton Woods Collapse</h2>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
          How the post-WWII monetary order collapsed in 1971 — and why 2025 looks eerily similar.
        </p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 mb-5">
        <h3 className="text-white font-semibold mb-3 text-sm">What you'll learn:</h3>
        <ul className="space-y-2.5">
          {[
            "Why Bretton Woods' fixed rates were doomed from the start",
            "How capital controls always fail eventually",
            "The Nixon Shock and its aftermath: stagflation",
            "Why 2025's debt and deficits rhyme with 1971"
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-300 text-sm">
              <span className="text-amber-400 mt-0.5 shrink-0">✓</span>{item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ v: "4", l: "Chapters" }, { v: "1971", l: "System Broke" }, { v: "13.5%", l: "Peak Inflation" }].map(({ v, l }) => (
          <div key={l} className="text-center p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <div className="text-lg font-black text-amber-400">{v}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white font-black text-lg transition-all duration-200 shadow-lg shadow-amber-900/30 hover:scale-[1.02] active:scale-[0.98]">
        Begin the Lesson →
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
          let cls = 'bg-gray-800/70 border-gray-700/70 text-gray-200 hover:border-amber-500/60 hover:bg-gray-800';
          if (answered) {
            if (i === quiz.correct) cls = 'bg-amber-900/50 border-amber-500 text-amber-200';
            else if (i === selectedAnswer && !isCorrect) cls = 'bg-red-900/40 border-red-500/50 text-red-200';
            else cls = 'bg-gray-800/30 border-gray-800/50 text-gray-600';
          } else if (selectedAnswer === i) {
            cls = 'bg-amber-900/40 border-amber-500/70 text-amber-200';
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
        <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-amber-900/30 border-amber-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-2xl shrink-0 mt-0.5">{isCorrect ? '✅' : '❌'}</span>
            <p className={`text-sm leading-relaxed font-medium ${isCorrect ? 'text-amber-200' : 'text-red-200'}`}>{quiz.explanation}</p>
          </div>
          <div className="mt-2 pl-8">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-amber-700/50 text-amber-300' : 'bg-red-700/50 text-red-300'}`}>
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
  let badge = '🏦', title = 'Keep Studying', message = "You've seen how Bretton Woods collapsed. History offers lessons for today.";
  if (pct >= 80) { badge = '🏆'; title = 'Monetary Historian!'; message = "You deeply understand the Bretton Woods system, its collapse, and modern parallels. You see the structural flaws in today's fiat system."; }
  else if (pct >= 60) { badge = '💡'; title = 'Well Done!'; message = "You grasp the key lesson: deficits without a hard money anchor eventually break the system."; }
  return (
    <div className={`transition-all duration-500 ${m ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">{badge}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-6 mb-5 text-center">
        <div className="text-4xl font-black text-amber-400 mb-1">{score}</div>
        <div className="text-gray-500 text-sm mb-3">{TOTAL_POSSIBLE} points possible</div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-amber-500' : 'bg-yellow-500'}`} style={{ width: `${pct}%` }} />
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

export function BrettonWoodsGame() {
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
            <span className="text-lg">🏦💎</span>
            <span className="font-black text-sm text-white tracking-tight">Bretton Woods Collapse</span>
          </div>
          {phase !== 'intro' && (
            <div className="flex items-center gap-3">
              <div className="text-amber-400 font-black text-sm">{score} pts</div>
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

export default BrettonWoodsGame;
