<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Monetary Shift: Sound Money vs. Fiat</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #0a0a14;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    position: relative;
  }

  /* Background grid */
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(30, 80, 200, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30, 80, 200, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .slide {
    width: 1280px;
    height: 720px;
    background: linear-gradient(160deg, #080810 0%, #0a0a1a 50%, #08080f 100%);
    position: relative;
    overflow: hidden;
  }

  /* Glowing orbs */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .orb-blue {
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(30, 100, 255, 0.15), transparent 70%);
    top: -100px; left: -100px;
  }
  .orb-green {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(0, 220, 100, 0.08), transparent 70%);
    bottom: 0; right: 50px;
  }
  .orb-red {
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(255, 50, 50, 0.08), transparent 70%);
    top: 100px; right: 0;
  }

  /* Header */
  .header {
    position: absolute;
    top: 0; left: 0; right: 0;
    padding: 20px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
  }

  .header-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 3px;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }

  .header-logo {
    font-size: 11px;
    font-weight: 800;
    color: rgba(255,255,255,0.4);
    letter-spacing: 1px;
  }

  /* Main title */
  .main-title {
    position: absolute;
    top: 28px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 10;
  }

  .main-title h1 {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 4px;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .main-title-bar {
    background: linear-gradient(90deg, #0066ff, #00d4ff, #0066ff);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
    padding: 8px 28px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .main-title-bar span {
    font-size: 15px;
    font-weight: 900;
    color: white;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  @keyframes shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  /* Grid */
  .grid {
    position: absolute;
    top: 110px;
    left: 32px;
    right: 32px;
    bottom: 80px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 16px;
  }

  /* Cards */
  .card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    border-radius: 16px 16px 0 0;
  }

  .card.green::before { background: linear-gradient(90deg, #00d466, #00ff88); }
  .card.red::before { background: linear-gradient(90deg, #ff3355, #ff6b35); }
  .card.blue::before { background: linear-gradient(90deg, #0066ff, #00d4ff); }
  .card.amber::before { background: linear-gradient(90deg, #ffb800, #ff8c00); }

  .card-num {
    position: absolute;
    top: 16px;
    right: 18px;
    font-size: 10px;
    font-weight: 800;
    color: rgba(255,255,255,0.1);
    letter-spacing: 1px;
  }

  .card-icon {
    font-size: 32px;
    margin-bottom: 10px;
    line-height: 1;
  }

  .card.green .card-icon { filter: drop-shadow(0 0 12px rgba(0, 212, 102, 0.5)); }
  .card.red .card-icon { filter: drop-shadow(0 0 12px rgba(255, 51, 85, 0.5)); }
  .card.blue .card-icon { filter: drop-shadow(0 0 12px rgba(0, 102, 255, 0.5)); }
  .card.amber .card-icon { filter: drop-shadow(0 0 12px rgba(255, 184, 0, 0.5)); }

  .card-title {
    font-size: 15px;
    font-weight: 800;
    color: white;
    margin-bottom: 8px;
    letter-spacing: 0.3px;
    line-height: 1.2;
  }

  .card-tagline {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .card.green .card-tagline { color: #00d466; }
  .card.red .card-tagline { color: #ff3355; }
  .card.blue .card-tagline { color: #0088ff; }
  .card.amber .card-tagline { color: #ffb800; }

  .card-body {
    font-size: 11.5px;
    color: rgba(255,255,255,0.5);
    line-height: 1.55;
    flex: 1;
  }

  .card-stats {
    display: flex;
    gap: 10px;
    margin-top: auto;
    padding-top: 12px;
  }

  .stat {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 7px 10px;
    flex: 1;
    text-align: center;
  }

  .stat-value {
    font-size: 14px;
    font-weight: 900;
    color: white;
    line-height: 1;
    margin-bottom: 3px;
  }

  .stat.green .stat-value { color: #00d466; }
  .stat.red .stat-value { color: #ff3355; }
  .stat.blue .stat-value { color: #0088ff; }
  .stat.amber .stat-value { color: #ffb800; }

  .stat-label {
    font-size: 9px;
    font-weight: 600;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Central connector bar */
  .connector {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 110px;
    bottom: 80px;
    width: 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 5;
    pointer-events: none;
  }

  .connector-line {
    width: 2px;
    flex: 1;
    background: linear-gradient(180deg, rgba(0, 102, 255, 0.4), rgba(0, 212, 102, 0.4));
    box-shadow: 0 0 12px rgba(0, 102, 255, 0.3);
  }

  .connector-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #0088ff;
    box-shadow: 0 0 20px rgba(0, 136, 255, 0.8);
    margin: 4px 0;
  }

  /* Bottom thesis bar */
  .thesis-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 68px;
    background: linear-gradient(90deg, #001133, #002244, #001133);
    border-top: 1px solid rgba(0, 102, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 0 40px;
  }

  .thesis-text {
    font-size: 13px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.5px;
  }

  .thesis-highlight {
    color: #00d4ff;
    font-weight: 900;
  }

  .thesis-divider {
    width: 1px;
    height: 24px;
    background: rgba(255,255,255,0.1);
  }

  .thesis-sub {
    font-size: 10px;
    font-weight: 500;
    color: rgba(255,255,255,0.3);
    letter-spacing: 1px;
  }

  /* Bitcoin symbol watermark */
  .btc-watermark {
    position: absolute;
    bottom: 80px;
    right: 20px;
    font-size: 80px;
    font-weight: 900;
    color: rgba(255, 160, 0, 0.04);
    pointer-events: none;
    line-height: 1;
  }
</style>
</head>
<body>
<div class="slide">
  <!-- Background orbs -->
  <div class="orb orb-blue"></div>
  <div class="orb orb-green"></div>
  <div class="orb orb-red"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-label">BitcoinHub — Educational Series</div>
    <div class="header-logo">₿itcoinHub</div>
  </div>

  <!-- Main title -->
  <div class="main-title">
    <h1>What's Really At Stake</h1>
    <div class="main-title-bar">
      <span>Sound Money vs. The Printing Press</span>
    </div>
  </div>

  <!-- Central connector -->
  <div class="connector">
    <div class="connector-dot"></div>
    <div class="connector-line"></div>
    <div class="connector-dot"></div>
  </div>

  <!-- Grid -->
  <div class="grid">

    <!-- Card 1: Bitcoin Wins -->
    <div class="card green">
      <div class="card-num">01</div>
      <div class="card-icon">₿</div>
      <div class="card-title">Bitcoin Wins</div>
      <div class="card-tagline">Programmable Scarcity</div>
      <div class="card-body">
        21 million coins. Forever. No exceptions, no amendments, no central authority that can change the rules. The most transparent, auditable monetary system ever created. No single person, bank, or government controls the rules.
      </div>
      <div class="card-stats">
        <div class="stat green">
          <div class="stat-value">21M</div>
          <div class="stat-label">Max Supply</div>
        </div>
        <div class="stat blue">
          <div class="stat-value">4 yrs</div>
          <div class="stat-label">Next Halving</div>
        </div>
        <div class="stat amber">
          <div class="stat-value">$0</div>
          <div class="stat-label">Inflation / Year</div>
        </div>
      </div>
    </div>

    <!-- Card 2: Fiat's Flaw -->
    <div class="card red">
      <div class="card-num">02</div>
      <div class="card-icon">💸</div>
      <div class="card-title">Fiat's Fatal Flaw</div>
      <div class="card-tagline">Unlimited Printing</div>
      <div class="card-body">
        Every dollar ever printed dilutes existing holders. The Fed can create trillions with keystrokes — no oversight, no limit. Since 1971, the dollar lost 85% of its value. Every year, your savings buy less. The system rewards borrowing, penalizes saving.
      </div>
      <div class="card-stats">
        <div class="stat red">
          <div class="stat-value">85%</div>
          <div class="stat-label">Dollar Lost (1971→)</div>
        </div>
        <div class="stat amber">
          <div class="stat-value">$37T</div>
          <div class="stat-label">U.S. Debt</div>
        </div>
        <div class="stat red">
          <div class="stat-value">3%</div>
          <div class="stat-label">Annual Theft</div>
        </div>
      </div>
    </div>

    <!-- Card 3: Cantillon Effect -->
    <div class="card blue">
      <div class="card-num">03</div>
      <div class="card-icon">⚖️</div>
      <div class="card-title">The Cantillon Effect</div>
      <div class="card-tagline">Who Gets Hurt First</div>
      <div class="card-body">
        New money doesn't enter the economy equally — banks and the government get it first, buying real assets before prices rise. By the time it reaches you (paycheck, savings), prices are already higher. It's a hidden tax on the middle class and poor. The rich get richer; everyone else gets poorer.
      </div>
      <div class="card-stats">
        <div class="stat blue">
          <div class="stat-value">0%</div>
          <div class="stat-label">New Money Reaches You</div>
        </div>
        <div class="stat amber">
          <div class="stat-value">+30%</div>
          <div class="stat-label">Asset Prices (Pre-tax)</div>
        </div>
        <div class="stat blue">
          <div class="stat-value">10%</div>
          <div class="stat-label">Top 1% Share</div>
        </div>
      </div>
    </div>

    <!-- Card 4: Generational Theft -->
    <div class="card amber">
      <div class="card-num">04</div>
      <div class="card-icon">🏠</div>
      <div class="card-title">The Generational Divide</div>
      <div class="card-tagline">Your Kids Can't Afford Your Life</div>
      <div class="card-body">
        Boomers bought homes at $82K (~$200K today). Millennials face $420K median prices on stagnant wages. Boomers' Medicare and pensions are funded by printing — every dollar of future debt is a claim on your children's productivity. The system transfers wealth forward by borrowing from the future.
      </div>
      <div class="card-stats">
        <div class="stat amber">
          <div class="stat-value">5x</div>
          <div class="stat-label">Home Price Multiplier</div>
        </div>
        <div class="stat red">
          <div class="stat-value">42%</div>
          <div class="stat-label">Millennial Ownership</div>
        </div>
        <div class="stat amber">
          <div class="stat-value">$1.8T</div>
          <div class="stat-label">Student Debt</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Bitcoin watermark -->
  <div class="btc-watermark">₿</div>

  <!-- Bottom thesis bar -->
  <div class="thesis-bar">
    <div class="thesis-text">
      Sound money isn't a <span class="thesis-highlight">luxury</span> — it's
      <span class="thesis-highlight"> financial infrastructure.</span>
    </div>
    <div class="thesis-divider"></div>
    <div class="thesis-sub">LEARN MORE AT HUB.GOODBOTAI.TECH</div>
  </div>
</div>
</body>
</html>
