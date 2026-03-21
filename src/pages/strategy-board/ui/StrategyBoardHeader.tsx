import styles from '../StrategyBoardPage.module.css';

export interface StrategyBoardHeaderProps {
  onSearchKeywordChange: (nextKeyword: string) => void;
  searchKeyword: string;
}

export function StrategyBoardHeader({
  onSearchKeywordChange,
  searchKeyword,
}: StrategyBoardHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerCopy}>
        <p className={styles.eyebrow}>Wei Shu Protocol Strategy Board</p>
        <h1 className={styles.title}>卫戍协议助手</h1>
        <p className={styles.description}>卫？卫！卫？卫！卫？卫！</p>
      </div>

      <div className={styles.headerTools}>
        <label className={styles.searchBox}>
          <span className={styles.searchLabel}>描述搜索</span>
          <input
            aria-label="描述搜索"
            className={styles.searchInput}
            type="text"
            value={searchKeyword}
            placeholder="支持空格分词，例如：获得 层数"
            onChange={(event) => onSearchKeywordChange(event.target.value)}
          />
        </label>
      </div>
    </header>
  );
}
