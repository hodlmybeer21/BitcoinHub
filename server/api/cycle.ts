const CYCLE_SCORE = { score: 6.4, label: 'TEST' };
const CYCLE_STATE = { source: 'test', score: CYCLE_SCORE };

export async function getCycleScore() {
  return CYCLE_SCORE;
}

export async function getCycleState() {
  return CYCLE_STATE;
}
