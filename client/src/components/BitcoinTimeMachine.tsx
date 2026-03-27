import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Trophy, Target, Clock, AlertCircle, CheckCircle, XCircle, Zap, Share2, Twitter, Copy, Check } from "lucide-react";

interface GameLevel {
  id: number;
  title: string;
  story: string;
  data: {
    title: string;
    stats: Array<{
      label: string;
      value: string;
      note: string;
    }>;
  };
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    points: number;
  };
}

interface GameData {
  levels: GameLevel[];
}

interface BitcoinTimeMachineProps {
  gameData: GameData;
  onBack: () => void;
  onComplete?: () => void;
}

const timelineYears = ["2008", "2009", "2010", "2017", "2021", "2024"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
  exit: { opacity: 0, y: -20 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } }
};

export function BitcoinTimeMachine({ gameData, onBack, onComplete }: BitcoinTimeMachineProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [knowledgeScore, setKnowledgeScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (gameCompleted && onComplete) {
      onComplete();
    }
  }, [gameCompleted, onComplete]);

  const level = gameData.levels[currentLevel];
  const totalLevels = gameData.levels.length;
  const progressPercentage = ((currentLevel + 1) / totalLevels) * 100;
  const maxScore = totalLevels * 10;
  const currentYear = timelineYears[currentLevel];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === level.quiz.correct;
    setShowResult(true);
    if (isCorrect && !answeredQuestions.has(currentLevel)) {
      setKnowledgeScore(prev => prev + level.quiz.points);
      setAnsweredQuestions(prev => new Set(prev).add(currentLevel));
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < totalLevels - 1) {
      setCurrentLevel(currentLevel + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameCompleted(true);
      setShowConfetti(true);
    }
  };

  const handlePreviousLevel = () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const resetGame = () => {
    setCurrentLevel(0);
    setKnowledgeScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameCompleted(false);
    setAnsweredQuestions(new Set());
    setShowConfetti(false);
  };

  const shareText = `🕰️ I just completed the Bitcoin Time Machine and scored ${knowledgeScore}/${maxScore}! Journeyed through Bitcoin's evolution from 2008 to 2024. 🚀 #Bitcoin`;

  const handleShare = (platform: 'twitter' | 'copy') => {
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── COMPLETION SCREEN ──────────────────────────────────────
  if (gameCompleted) {
    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Paths
          </Button>
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <Card className="bg-gradient-to-br from-purple-950 via-gray-900 to-orange-950 border-purple-500/50 overflow-hidden relative">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-orange-500/10 animate-pulse" />
            
            <CardHeader className="text-center relative z-10">
              <motion.div
                className="mx-auto mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center mx-auto">
                    <Clock className="h-12 w-12 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                  >
                    <Zap className="h-8 w-8 text-yellow-400 drop-shadow-lg" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                  Time Travel Complete!
                </CardTitle>
              </motion.div>
              <motion.p
                className="text-gray-400 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                You journeyed through Bitcoin's incredible 16-year evolution
              </motion.p>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              <motion.div
                className="flex flex-wrap justify-center gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <Badge className="text-lg px-6 py-3 bg-purple-500/20 border-purple-500/50 text-purple-300">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-400" />
                    {knowledgeScore}/{maxScore} pts
                  </Badge>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Badge className="text-lg px-6 py-3 bg-orange-500/20 border-orange-500/50 text-orange-300">
                    <Target className="mr-2 h-5 w-5 text-orange-400" />
                    {Math.round((knowledgeScore / maxScore) * 100)}% Mastery
                  </Badge>
                </motion.div>
              </motion.div>

              <motion.div
                className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20"
                variants={itemVariants}
              >
                <h3 className="font-semibold mb-4 text-purple-300 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Bitcoin Journey Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { year: "2008", desc: "Satoshi's whitepaper during financial crisis" },
                    { year: "2009", desc: "Genesis Block with embedded bank bailout message" },
                    { year: "2010", desc: "First real-world transaction — Pizza Day" },
                    { year: "2017", desc: "Mainstream adoption and price mania" },
                    { year: "2021", desc: "Institutional embrace and digital gold narrative" },
                    { year: "2024", desc: "Bitcoin's maturation and future potential" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.year}
                      className="flex items-start gap-3 text-sm"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                    >
                      <span className="font-bold text-purple-400 min-w-[3rem]">{item.year}:</span>
                      <span className="text-gray-300">{item.desc}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl p-4 border border-orange-500/30"
                variants={itemVariants}
              >
                <h4 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Key Insight
                </h4>
                <p className="text-sm text-gray-300">
                  Bitcoin evolved from a response to financial crisis into digital property that offers scarcity,
                  security, and sovereignty in an age of unlimited money printing. Its 16-year track record proves
                  resilience against skeptics, regulations, and market cycles.
                </p>
              </motion.div>

              {/* Social Sharing */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
                variants={itemVariants}
              >
                <span className="text-sm text-gray-400">Share your achievement:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white"
                  >
                    <Twitter className="h-4 w-4 mr-1" />
                    Tweet
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare('copy')}
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
                variants={itemVariants}
              >
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Travel Again
                </Button>
                <Button onClick={onBack} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Explore More Learning
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // ─── GAME SCREEN ──────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="outline" onClick={onBack} className="text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learning Paths
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="border-purple-500/50 bg-purple-500/10 text-purple-400">
            <Trophy className="mr-1.5 h-3.5 w-3.5 text-yellow-400" />
            {knowledgeScore}/{maxScore}
          </Badge>
          <Badge className="border-orange-500/50 bg-orange-500/10 text-orange-400">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            {currentYear}
          </Badge>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gray-900/80 border-purple-500/30 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                The Bitcoin Time Machine
              </CardTitle>
              <span className="text-xs text-gray-500">{Math.round(progressPercentage)}% complete</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Timeline dots */}
            <div className="relative">
              <div className="flex items-center justify-between mb-3 relative z-10">
                {timelineYears.map((year, index) => (
                  <motion.button
                    key={year}
                    className="flex flex-col items-center group"
                    onClick={() => {
                      setCurrentLevel(index);
                      setSelectedAnswer(null);
                      setShowResult(false);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                        index <= currentLevel
                          ? 'bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/50'
                          : 'bg-gray-700 border-gray-600 group-hover:border-purple-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] mt-1.5 font-medium transition-colors ${
                        index === currentLevel
                          ? 'text-purple-400'
                          : 'text-gray-500 group-hover:text-gray-400'
                      }`}
                    >
                      {year}
                    </span>
                  </motion.button>
                ))}
              </div>
              {/* Progress line */}
              <div className="absolute top-[22px] left-[10%] right-[10%] h-0.5 bg-gray-700 -z-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Level Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <Card className="bg-gray-900/80 border-purple-500/30 backdrop-blur overflow-hidden">
            {/* Era header banner */}
            <div className="bg-gradient-to-r from-purple-900/50 to-orange-900/30 px-6 py-3 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentYear}
                </div>
                <div>
                  <span className="text-xs text-purple-400 uppercase tracking-wider">Era {currentLevel + 1}</span>
                  <p className="font-semibold text-white">{level.title}</p>
                </div>
              </div>
            </div>

            <CardContent className="space-y-5 p-5">
              {/* Story */}
              <motion.div
                className="bg-gray-800/60 rounded-xl p-4 border border-purple-500/20"
                variants={itemVariants}
              >
                <p className="text-gray-300 leading-relaxed text-sm">{level.story}</p>
              </motion.div>

              {/* Stats */}
              <motion.div variants={itemVariants}>
                <h4 className="font-semibold text-orange-400 mb-3 flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  {level.data.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {level.data.stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 rounded-xl p-4 border border-orange-500/20 text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(249, 115, 22, 0.5)' }}
                    >
                      <div className="font-bold text-lg text-orange-400">{stat.value}</div>
                      <div className="text-sm font-medium text-gray-300">{stat.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{stat.note}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Quiz */}
              <motion.div className="space-y-4" variants={itemVariants}>
                <h4 className="font-semibold text-purple-400 flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {level.quiz.question}
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {level.quiz.options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={`p-3.5 rounded-xl border-2 text-left text-sm transition-all ${
                        selectedAnswer === index
                          ? showResult
                            ? index === level.quiz.correct
                              ? 'border-green-500 bg-green-500/20 text-green-300'
                              : 'border-red-500 bg-red-500/20 text-red-300'
                            : 'border-purple-500 bg-purple-500/20 text-purple-200'
                          : showResult && index === level.quiz.correct
                          ? 'border-green-500 bg-green-500/20 text-green-300'
                          : 'border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/5 text-gray-300'
                      }`}
                      whileHover={!showResult ? { scale: 1.01 } : {}}
                      whileTap={!showResult ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-center gap-2.5">
                        {showResult && (
                          <span className="flex-shrink-0">
                            {index === level.quiz.correct ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : selectedAnswer === index ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </span>
                        )}
                        <span className="flex-1">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-800/80 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 mt-0.5">
                            {selectedAnswer === level.quiz.correct ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-400" />
                            )}
                          </span>
                          <div>
                            <p className="font-medium text-gray-200">
                              {selectedAnswer === level.quiz.correct
                                ? "Correct! Time travel mastery!"
                                : "Not quite right, but you're learning!"}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">{level.quiz.explanation}</p>
                            {selectedAnswer === level.quiz.correct && !answeredQuestions.has(currentLevel) && (
                              <Badge className="mt-2 bg-purple-500/20 border-purple-500/50 text-purple-300">
                                <Zap className="mr-1 h-3 w-3 text-yellow-400" />
                                +{level.quiz.points} Knowledge Points
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Navigation */}
              <motion.div className="flex justify-between pt-2" variants={itemVariants}>
                <Button
                  variant="outline"
                  onClick={handlePreviousLevel}
                  disabled={currentLevel === 0}
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous Era
                </Button>

                {!showResult ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextLevel}
                    className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 text-white"
                  >
                    {currentLevel < totalLevels - 1 ? (
                      <>
                        Next Era
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Complete Journey
                        <Trophy className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </motion.div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Level {currentLevel + 1} of {totalLevels}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress
                  value={progressPercentage}
                  className="h-1.5 bg-gray-800"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
