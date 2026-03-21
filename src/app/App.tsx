import { Analytics } from '@vercel/analytics/react';
import { StrategyBoardPage } from '@/pages/strategy-board/StrategyBoardPage';

export function App() {
  return (
    <>
      <StrategyBoardPage />
      <Analytics />
    </>
  );
}

