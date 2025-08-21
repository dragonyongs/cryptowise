// src/components/features/testing/PaperTrading.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import TradingSettings from "./TradingSettings";
import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  SettingsIcon,
  TestTubeIcon,
  ActivityIcon,
  PieChartIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  MonitorIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  CoinsIcon,
  TargetIcon,
  LineChartIcon,
  XIcon,
  WifiIcon,
  WifiOffIcon,
  SearchIcon,
  PlusIcon,
  MinusIcon,
  StarIcon,
  TrendingUpIcon as TrendIcon,
  FilterIcon,
  SortAscIcon,
  // ClearIcon,
} from "lucide-react";

// 메인 렌더링 함수에서 탭 전환 로직
const renderContent = () => {
  switch (activeTab) {
    case "coins":
      return renderCoinsTab();
    case "overview":
      return renderOverviewTab();
    case "portfolio":
      return renderPortfolioTab(); // ✅ 추가된 포트폴리오 탭
    case "trades":
      return renderTradesTab();
    case "signals":
      return renderSignalsTab(); // ✅ 추가된 신호분석 탭
    case "logs":
      return (
        <ResponsiveLogViewer
          logs={logs}
          isCollapsed={isLogCollapsed}
          setIsCollapsed={setIsLogCollapsed}
        />
      );
    case "settings":
      return <TradingSettings />;
    default:
      return renderOverviewTab();
  }
};

// 🔥 탭 데이터 - 코인 선택 탭 추가
const TABS = [
  {
    id: "coins",
    name: "코인 선택",
    icon: CoinsIcon,
    description: "관심코인 및 상위코인 선택",
    color: "text-yellow-600 dark:text-yellow-400",
  },
  {
    id: "overview",
    name: "대시보드",
    icon: BarChart3Icon,
    description: "전체 현황 및 핵심 지표",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "portfolio",
    name: "포트폴리오",
    icon: PieChartIcon,
    description: "보유 자산 및 수익 현황",
    color: "text-green-600 dark:text-green-400",
  },
  {
    id: "trades",
    name: "거래내역",
    icon: ActivityIcon,
    description: "거래 기록 및 성과 분석",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "signals",
    name: "신호분석",
    icon: LineChartIcon,
    description: "매매 신호 및 시장 분석",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "logs",
    name: "실시간 로그",
    icon: MonitorIcon,
    description: "시스템 로그 및 거래 기록",
    color: "text-gray-600 dark:text-gray-400",
  },
  {
    id: "settings",
    name: "설정",
    icon: SettingsIcon,
    description: "거래 전략 및 설정 관리",
    color: "text-indigo-600 dark:text-indigo-400",
  },
];

// ✅ 상위 코인 데이터 (CoinGecko API 시뮬레이션)
const TOP_COINS = [
  {
    symbol: "BTC",
    name: "비트코인",
    marketCap: 1200000000000,
    price: 95000000,
    change24h: 2.5,
    volume: 25000000000,
    rank: 1,
  },
  {
    symbol: "ETH",
    name: "이더리움",
    marketCap: 400000000000,
    price: 3500000,
    change24h: 1.8,
    volume: 15000000000,
    rank: 2,
  },
  {
    symbol: "XRP",
    name: "리플",
    marketCap: 100000000000,
    price: 1800,
    change24h: -1.2,
    volume: 8000000000,
    rank: 3,
  },
  {
    symbol: "SOL",
    name: "솔라나",
    marketCap: 80000000000,
    price: 180000,
    change24h: 4.2,
    volume: 3000000000,
    rank: 4,
  },
  {
    symbol: "ADA",
    name: "카르다노",
    marketCap: 35000000000,
    price: 1000,
    change24h: -0.8,
    volume: 1500000000,
    rank: 5,
  },
  {
    symbol: "DOT",
    name: "폴카닷",
    marketCap: 12000000000,
    price: 8500,
    change24h: 2.1,
    volume: 800000000,
    rank: 6,
  },
  {
    symbol: "AVAX",
    name: "아발란체",
    marketCap: 18000000000,
    price: 45000,
    change24h: 3.5,
    volume: 1200000000,
    rank: 7,
  },
  {
    symbol: "MATIC",
    name: "폴리곤",
    marketCap: 10000000000,
    price: 1100,
    change24h: 1.9,
    volume: 900000000,
    rank: 8,
  },
  {
    symbol: "LINK",
    name: "체인링크",
    marketCap: 14000000000,
    price: 25000,
    change24h: 0.7,
    volume: 700000000,
    rank: 9,
  },
  {
    symbol: "UNI",
    name: "유니스왑",
    marketCap: 8000000000,
    price: 13000,
    change24h: -1.5,
    volume: 500000000,
    rank: 10,
  },
];

// ✅ 완전히 수정된 ResponsiveLogViewer 컴포넌트
const ResponsiveLogViewer = React.memo(
  ({ logs, isCollapsed, setIsCollapsed }) => {
    const [filterType, setFilterType] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // 로그 아이콘 함수
    const getLogIcon = (type) => {
      switch (type) {
        case "success":
          return (
            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
          );
        case "warning":
          return (
            <AlertTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          );
        case "error":
          return <XIcon className="w-4 h-4 text-red-500 flex-shrink-0" />;
        default:
          return <InfoIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      }
    };

    // 로그 텍스트 색상
    const getLogTextColor = (type) => {
      switch (type) {
        case "success":
          return "text-green-300";
        case "warning":
          return "text-yellow-300";
        case "error":
          return "text-red-300";
        default:
          return "text-gray-300";
      }
    };

    // 필터링된 로그
    const filteredLogs = useMemo(() => {
      let filtered = logs;

      // 타입 필터
      if (filterType !== "all") {
        filtered = filtered.filter((log) => log.type === filterType);
      }

      // 검색어 필터
      if (searchTerm) {
        filtered = filtered.filter((log) =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filtered;
    }, [logs, filterType, searchTerm]);

    // 로그 카운트
    const logCounts = useMemo(() => {
      const counts = {
        all: logs.length,
        info: logs.filter((log) => log.type === "info").length,
        success: logs.filter((log) => log.type === "success").length,
        warning: logs.filter((log) => log.type === "warning").length,
        error: logs.filter((log) => log.type === "error").length,
      };
      return counts;
    }, [logs]);

    return (
      <div className="bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-700">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <MonitorIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">실시간 로그</h3>
            <div className="flex items-center space-x-1">
              <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                {logs.length}
              </span>
              {filteredLogs.length !== logs.length && (
                <span className="px-2 py-1 text-xs bg-orange-600 text-white rounded-full">
                  필터: {filteredLogs.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 로그 클리어 버튼 */}
            <button
              onClick={() => {
                // 부모 컴포넌트에서 로그 클리어 함수를 제공해야 함
                window.dispatchEvent(new CustomEvent("clearLogs"));
              }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="로그 지우기"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </button>

            {/* 접기/펼치기 버튼 */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title={isCollapsed ? "펼치기" : "접기"}
            >
              {isCollapsed ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronUpIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* 필터 및 검색 */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* 타입 필터 */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {[
                    { key: "all", label: "전체", color: "bg-gray-600" },
                    { key: "info", label: "정보", color: "bg-blue-600" },
                    { key: "success", label: "성공", color: "bg-green-600" },
                    { key: "warning", label: "경고", color: "bg-yellow-600" },
                    { key: "error", label: "오류", color: "bg-red-600" },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setFilterType(key)}
                      className={`px-2 py-1 text-xs rounded-full text-white transition-colors ${
                        filterType === key
                          ? color
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      {label} ({logCounts[key]})
                    </button>
                  ))}
                </div>

                {/* 검색 */}
                <div className="flex-1 max-w-xs">
                  <div className="relative">
                    <SearchIcon className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="로그 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 로그 내용 */}
            <div className="h-80 overflow-y-auto p-4 space-y-2 font-mono text-sm">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <MonitorIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">
                    {logs.length === 0
                      ? "로그가 없습니다."
                      : "검색 결과가 없습니다."}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      검색어 지우기
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-2 hover:bg-gray-800 rounded transition-colors group"
                  >
                    {/* 아이콘 */}
                    <div className="mt-0.5">{getLogIcon(log.type)}</div>

                    {/* 로그 내용 */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`break-words ${getLogTextColor(log.type)}`}
                      >
                        {log.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>
                          {log.timestamp.toLocaleTimeString("ko-KR", {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 하단 정보 */}
            {logs.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-700 bg-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    총 {logs.length}개 로그
                    {filteredLogs.length !== logs.length &&
                      ` (${filteredLogs.length}개 표시)`}
                  </span>
                  <span>
                    마지막 업데이트: {new Date().toLocaleTimeString("ko-KR")}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

// ✅ 코인 선택 및 관리 컴포넌트
const CoinSelector = React.memo(
  ({ selectedCoins, onCoinToggle, onCoinConfigUpdate }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("rank");
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    const filteredCoins = useMemo(() => {
      let filtered = TOP_COINS.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (showOnlySelected) {
        filtered = filtered.filter((coin) =>
          selectedCoins.includes(coin.symbol)
        );
      }

      filtered.sort((a, b) => {
        switch (sortBy) {
          case "marketCap":
            return b.marketCap - a.marketCap;
          case "change24h":
            return b.change24h - a.change24h;
          case "volume":
            return b.volume - a.volume;
          default:
            return a.rank - b.rank;
        }
      });

      return filtered;
    }, [searchTerm, sortBy, showOnlySelected, selectedCoins]);

    return (
      <div className="space-y-6">
        {/* 검색 및 필터 */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="코인 이름 또는 심볼 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="rank">순위순</option>
              <option value="marketCap">시가총액순</option>
              <option value="change24h">변동률순</option>
              <option value="volume">거래량순</option>
            </select>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlySelected}
                onChange={(e) => setShowOnlySelected(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                선택된 코인만
              </span>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              선택된 코인: {selectedCoins.length}개 / 전체: {TOP_COINS.length}개
            </span>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  selectedCoins.forEach((symbol) => onCoinToggle(symbol, false))
                }
                className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                모두 해제
              </button>
              <button
                onClick={() =>
                  TOP_COINS.slice(0, 5).forEach((coin) =>
                    onCoinToggle(coin.symbol, true)
                  )
                }
                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                상위 5개 선택
              </button>
            </div>
          </div>
        </div>

        {/* 코인 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              코인 목록 ({filteredCoins.length})
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredCoins.map((coin) => (
              <CoinItem
                key={coin.symbol}
                coin={coin}
                isSelected={selectedCoins.includes(coin.symbol)}
                onToggle={onCoinToggle}
                onConfigUpdate={onCoinConfigUpdate}
              />
            ))}
          </div>
        </div>

        {/* 추천 코인 */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2 mb-3">
            <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              오늘의 추천 코인
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOP_COINS.slice(0, 6).map((coin) => (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {coin.symbol}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    #{coin.rank}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-medium ${
                      coin.change24h > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {coin.change24h > 0 ? "+" : ""}
                    {coin.change24h.toFixed(1)}%
                  </div>
                  <button
                    onClick={() =>
                      onCoinToggle(
                        coin.symbol,
                        !selectedCoins.includes(coin.symbol)
                      )
                    }
                    className={`mt-1 px-2 py-1 text-xs rounded ${
                      selectedCoins.includes(coin.symbol)
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    }`}
                  >
                    {selectedCoins.includes(coin.symbol) ? "선택됨" : "선택"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

// ✅ 개별 코인 아이템 컴포넌트
const CoinItem = React.memo(
  ({ coin, isSelected, onToggle, onConfigUpdate }) => {
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState({
      mode: "both",
      buyPercentage: 30,
      sellPercentage: 80,
      profitTarget: 8,
      stopLoss: -8,
      priority: "medium",
      riskLevel: 5,
    });

    const handleConfigChange = useCallback(
      (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onConfigUpdate(coin.symbol, newConfig);
      },
      [config, coin.symbol, onConfigUpdate]
    );

    return (
      <div
        className={`border-b border-gray-200 dark:border-gray-700 transition-colors ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-900/20"
            : "hover:bg-gray-50 dark:hover:bg-gray-750"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onToggle(coin.symbol, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {coin.symbol}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    #{coin.rank}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {coin.name}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(coin.price)}
              </div>
              <div
                className={`text-sm font-medium flex items-center justify-end ${
                  coin.change24h > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {coin.change24h > 0 ? (
                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                )}
                {Math.abs(coin.change24h).toFixed(1)}%
              </div>
            </div>

            {isSelected && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">시가총액</span>
              <div className="font-medium text-gray-900 dark:text-white">
                ₩{(coin.marketCap / 1000000000000).toFixed(1)}조
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                거래량(24h)
              </span>
              <div className="font-medium text-gray-900 dark:text-white">
                ₩{(coin.volume / 1000000000).toFixed(1)}억
              </div>
            </div>
          </div>

          {isSelected && showConfig && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {coin.symbol} 거래 설정
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    거래 모드
                  </label>
                  <select
                    value={config.mode}
                    onChange={(e) => handleConfigChange("mode", e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="both">매수+매도</option>
                    <option value="buyonly">매수만</option>
                    <option value="sellonly">매도만</option>
                    <option value="hold">보유만</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    우선순위
                  </label>
                  <select
                    value={config.priority}
                    onChange={(e) =>
                      handleConfigChange("priority", e.target.value)
                    }
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="high">높음</option>
                    <option value="medium">중간</option>
                    <option value="low">낮음</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    매수 비율: {config.buyPercentage}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={config.buyPercentage}
                    onChange={(e) =>
                      handleConfigChange(
                        "buyPercentage",
                        parseInt(e.target.value)
                      )
                    }
                    className="mt-1 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    익절 목표: {config.profitTarget}%
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="1"
                    value={config.profitTarget}
                    onChange={(e) =>
                      handleConfigChange(
                        "profitTarget",
                        parseInt(e.target.value)
                      )
                    }
                    className="mt-1 w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// ✅ 개선된 usePaperTrading 훅
const usePaperTradingEnhanced = (userId, selectedCoins) => {
  const [portfolio, setPortfolio] = useState({
    totalValue: 1840000,
    availableCash: 1840000,
    totalPnL: 0,
    totalReturn: 0,
    positions: [],
    trades: [],
  });

  const [isActive, setIsActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [marketSentiment, setMarketSentiment] = useState({
    fearGreedIndex: 50,
    sentimentPhase: "neutral",
  });

  const [monitoringStats, setMonitoringStats] = useState({
    tradesExecuted: 0,
    signalsGenerated: 0,
    signalsRejected: 0,
  });

  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ✅ 개선된 로그 추가 함수
  const addLog = useCallback((message, type = "info") => {
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      type,
    };

    setLogs((prev) => [logEntry, ...prev.slice(0, 199)]); // 최대 200개 유지
  }, []);

  // ✅ 로그 클리어 함수
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog("로그가 지워졌습니다", "info");
  }, [addLog]);

  // ✅ 로그 클리어 이벤트 리스너
  useEffect(() => {
    const handleClearLogs = () => clearLogs();
    window.addEventListener("clearLogs", handleClearLogs);
    return () => window.removeEventListener("clearLogs", handleClearLogs);
  }, [clearLogs]);

  // WebSocket 메시지 처리
  const handleWebSocketMessage = useCallback(
    async (event) => {
      if (!isActive) return;

      try {
        let data;

        if (event.data instanceof Blob) {
          const text = await event.data.text();
          data = JSON.parse(text);
        } else if (typeof event.data === "string") {
          data = JSON.parse(event.data);
        } else {
          addLog("알 수 없는 데이터 타입을 받았습니다", "warning");
          return;
        }

        const coinSymbol = data.code?.replace("KRW-", "");
        if (!coinSymbol || !selectedCoins.includes(coinSymbol)) {
          return;
        }

        // 시장 감정 업데이트
        setMarketSentiment((prev) => ({
          ...prev,
          fearGreedIndex: Math.max(
            20,
            Math.min(80, prev.fearGreedIndex + (Math.random() - 0.5) * 2)
          ),
        }));

        // 거래 신호 생성 시뮬레이션
        if (Math.random() > 0.97) {
          // 3% 확률로 신호 생성
          const signal = {
            symbol: coinSymbol,
            type: Math.random() > 0.5 ? "BUY" : "SELL",
            price: data.trade_price || Math.random() * 100000000,
            confidence: Math.random() * 0.3 + 0.7,
            timestamp: new Date(),
          };

          setMonitoringStats((prev) => ({
            ...prev,
            signalsGenerated: prev.signalsGenerated + 1,
          }));

          addLog(
            `${signal.type} 신호 생성: ${signal.symbol} - ${formatCurrency(signal.price)} (신뢰도: ${(signal.confidence * 100).toFixed(1)}%)`,
            "info"
          );

          // 거래 실행 여부 결정
          if (signal.confidence > 0.8 && Math.random() > 0.5) {
            await executeTrade(signal);
          } else {
            setMonitoringStats((prev) => ({
              ...prev,
              signalsRejected: prev.signalsRejected + 1,
            }));
            addLog(
              `신호 거부: ${signal.symbol} - 조건 미충족 (신뢰도: ${(signal.confidence * 100).toFixed(1)}%)`,
              "warning"
            );
          }
        }
      } catch (error) {
        addLog(`데이터 처리 오류: ${error.message}`, "error");
      }
    },
    [isActive, selectedCoins, addLog]
  );

  // 거래 실행 함수
  // 거래 실행 함수 내 포트폴리오 업데이트 부분
  const executeTrade = useCallback(
    async (signal) => {
      try {
        const quantity = Math.random() * 0.001;
        const amount = signal.price * quantity;

        const trade = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: signal.symbol,
          type: signal.type,
          quantity,
          price: signal.price,
          amount,
          timestamp: new Date(),
          executed: true,
        };

        setPortfolio((prev) => {
          const newTrades = [...prev.trades, trade];
          const initialCapital = 1840000;

          // ✅ 총 손익 계산
          const totalTradeValue = newTrades.reduce(
            (sum, t) => sum + (t.type === "BUY" ? -t.amount : t.amount),
            0
          );

          // ✅ 수정된 계산
          const newTotalValue = initialCapital + totalTradeValue;
          const totalReturnPercent = (totalTradeValue / initialCapital) * 100;

          return {
            ...prev,
            trades: newTrades,
            totalPnL: totalTradeValue,
            totalReturn: totalReturnPercent, // 이미 퍼센트로 계산됨
            totalValue: newTotalValue,
            availableCash: Math.max(0, newTotalValue),
          };
        });
      } catch (error) {
        addLog(`❌ 거래 실행 실패: ${error.message}`, "error");
      }
    },
    [addLog]
  );

  // WebSocket 연결 함수
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    addLog("🔄 업비트 WebSocket 연결 시도 중...", "info");

    try {
      wsRef.current = new WebSocket("wss://api.upbit.com/websocket/v1");

      wsRef.current.onopen = () => {
        setConnectionStatus("connected");
        addLog("✅ 업비트 연결 성공! 실시간 데이터 수신 시작", "success");

        const subscribeCodes = selectedCoins.map((symbol) => `KRW-${symbol}`);
        if (subscribeCodes.length > 0) {
          const subscribeMessage = [
            { ticket: "cryptowise-paper-trading" },
            {
              type: "ticker",
              codes: subscribeCodes,
            },
          ];
          wsRef.current.send(JSON.stringify(subscribeMessage));
          addLog(
            `📊 ${subscribeCodes.length}개 선택된 코인 실시간 구독 시작: ${selectedCoins.join(", ")}`,
            "success"
          );
        }
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        setConnectionStatus("error");
        addLog("❌ WebSocket 연결 오류 발생", "error");
      };

      wsRef.current.onclose = (event) => {
        setConnectionStatus("disconnected");
        addLog(
          `🔌 연결 종료: ${event.reason || "알 수 없는 이유"} (코드: ${event.code})`,
          "warning"
        );

        if (isActive && !event.wasClean) {
          addLog("🔄 5초 후 자동 재연결 시도...", "info");
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
      };
    } catch (error) {
      setConnectionStatus("error");
      addLog(`❌ WebSocket 연결 실패: ${error.message}`, "error");
    }
  }, [isActive, handleWebSocketMessage, selectedCoins, addLog]);

  // 선택된 코인 변경 시 재연결
  useEffect(() => {
    if (isActive && wsRef.current?.readyState === WebSocket.OPEN) {
      addLog(
        `🔄 선택된 코인이 변경되어 재연결합니다: ${selectedCoins.join(", ")}`,
        "info"
      );
      wsRef.current.close();
      setTimeout(connectWebSocket, 1000);
    }
  }, [selectedCoins, addLog]);

  // 활성화 상태 변경 시 연결 관리
  useEffect(() => {
    if (isActive) {
      if (selectedCoins.length === 0) {
        addLog(
          "⚠️ 선택된 코인이 없습니다. 먼저 코인을 선택해주세요.",
          "warning"
        );
        return;
      }
      connectWebSocket();
      addLog(
        `🚀 페이퍼 트레이딩 시작 - ${selectedCoins.length}개 코인 (${selectedCoins.join(", ")})`,
        "success"
      );
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnectionStatus("disconnected");
      addLog("⏹️ 페이퍼 트레이딩 중지", "info");
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isActive, connectWebSocket, selectedCoins, addLog]);

  return {
    portfolio,
    isActive,
    setIsActive,
    connectionStatus,
    marketSentiment,
    monitoringStats,
    logs,
    addLog,
    clearLogs,
  };
};

// ✅ 포트폴리오 카드 컴포넌트
const PortfolioCard = React.memo(
  ({ title, subtitle, value, change, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}
          >
            <Icon
              className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-600 dark:text-${color}-400`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="text-right min-w-0">
          <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {value}
          </div>
          {change && (
            <div
              className={`text-sm flex items-center justify-end ${
                change.startsWith("+")
                  ? "text-green-600"
                  : change.startsWith("-")
                    ? "text-red-600"
                    : "text-gray-600"
              }`}
            >
              {change.startsWith("+") && <ArrowUpIcon className="w-4 h-4" />}
              {change.startsWith("-") && <ArrowDownIcon className="w-4 h-4" />}
              {change}
            </div>
          )}
        </div>
      </div>
    </div>
  )
);

// ✅ 메인 컴포넌트
const PaperTrading = () => {
  const userId = "demo-user";

  const [selectedCoins, setSelectedCoins] = useState(["BTC", "ETH", "SOL"]);
  const [coinConfigs, setCoinConfigs] = useState({});

  const {
    portfolio,
    isActive,
    setIsActive,
    connectionStatus,
    marketSentiment,
    monitoringStats,
    logs,
    addLog,
    clearLogs,
  } = usePaperTradingEnhanced(userId, selectedCoins);

  const [activeTab, setActiveTab] = useState("coins");
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);

  // 코인 선택/해제 핸들러
  const handleCoinToggle = useCallback(
    (symbol, isSelected) => {
      if (isSelected) {
        setSelectedCoins((prev) => [...prev, symbol]);
        addLog(`➕ ${symbol} 코인이 추가되었습니다`, "success");
      } else {
        setSelectedCoins((prev) => prev.filter((coin) => coin !== symbol));
        addLog(`➖ ${symbol} 코인이 제거되었습니다`, "info");
      }
    },
    [addLog]
  );

  // 코인 설정 업데이트 핸들러
  const handleCoinConfigUpdate = useCallback(
    (symbol, config) => {
      setCoinConfigs((prev) => ({
        ...prev,
        [symbol]: config,
      }));
      addLog(
        `⚙️ ${symbol} 설정이 업데이트되었습니다 (모드: ${config.mode}, 우선순위: ${config.priority})`,
        "info"
      );
    },
    [addLog]
  );

  // 연결 상태 관련 함수들
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600 dark:text-green-400";
      case "connecting":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return `업비트 연결됨 (${selectedCoins.length}개 코인)`;
      case "connecting":
        return "연결 중...";
      case "error":
        return "연결 오류";
      default:
        return "연결 해제";
    }
  };

  // 탭 렌더링 함수들
  const renderCoinsTab = () => (
    <CoinSelector
      selectedCoins={selectedCoins}
      onCoinToggle={handleCoinToggle}
      onCoinConfigUpdate={handleCoinConfigUpdate}
    />
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 선택된 코인 요약 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          선택된 코인 ({selectedCoins.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedCoins.map((symbol) => (
            <span
              key={symbol}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
            >
              {symbol}
            </span>
          ))}
          {selectedCoins.length === 0 && (
            <span className="text-gray-500 dark:text-gray-400">
              코인을 선택해주세요
            </span>
          )}
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortfolioCard
          title="총 자산"
          subtitle="현재 포트폴리오 가치"
          value={formatCurrency(portfolio.totalValue)}
          change={
            portfolio.totalReturn > 0
              ? `+${portfolio.totalReturn.toFixed(2)}%`
              : portfolio.totalReturn < 0
                ? `${portfolio.totalReturn.toFixed(2)}%`
                : "0.00%"
          }
          icon={DollarSignIcon}
          color="blue"
        />
        <PortfolioCard
          title="가용현금"
          subtitle="투자 대기 자금"
          value={formatCurrency(portfolio.availableCash)}
          icon={CoinsIcon}
          color="green"
        />
        <PortfolioCard
          title="총 손익"
          subtitle="누적 수익/손실"
          value={formatCurrency(portfolio.totalPnL)}
          change={
            portfolio.totalPnL > 0
              ? `+${((portfolio.totalPnL / 1840000) * 100).toFixed(2)}%`
              : portfolio.totalPnL < 0
                ? `${((portfolio.totalPnL / 1840000) * 100).toFixed(2)}%`
                : "0.00%"
          }
          icon={TrendingUpIcon}
          color="purple"
        />
        <PortfolioCard
          title="수익률"
          subtitle="총 투자 대비"
          value={`${portfolio.totalReturn.toFixed(2)}%`}
          icon={TargetIcon}
          color="indigo"
        />
      </div>

      {/* 시장 감정 및 거래 통계 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            시장 감정 분석
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  공포탐욕지수
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.round(marketSentiment.fearGreedIndex)}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${marketSentiment.fearGreedIndex}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            거래 통계
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                실행된 거래
              </span>
              <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                {monitoringStats.tradesExecuted}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                거부된 신호
              </span>
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-lg">
                {monitoringStats.signalsRejected}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                생성된 신호
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                {monitoringStats.signalsGenerated}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPortfolioTab = () => {
    // 코인별 보유 현황 계산
    const coinHoldings = useMemo(() => {
      const holdings = {};
      portfolio.trades.forEach((trade) => {
        if (!holdings[trade.symbol]) {
          holdings[trade.symbol] = {
            symbol: trade.symbol,
            quantity: 0,
            totalBuyAmount: 0,
            totalSellAmount: 0,
            avgBuyPrice: 0,
            currentValue: 0,
            pnl: 0,
            pnlPercent: 0,
          };
        }

        if (trade.type === "BUY") {
          holdings[trade.symbol].quantity += trade.quantity;
          holdings[trade.symbol].totalBuyAmount += trade.amount;
        } else {
          holdings[trade.symbol].quantity -= trade.quantity;
          holdings[trade.symbol].totalSellAmount += trade.amount;
        }
      });

      // 평균 매수가 및 현재 가치 계산
      Object.values(holdings).forEach((holding) => {
        if (holding.quantity > 0) {
          holding.avgBuyPrice = holding.totalBuyAmount / holding.quantity;
          // 현재가는 시뮬레이션된 가격 (실제로는 실시간 가격 API 연동 필요)
          const currentPrice =
            holding.avgBuyPrice * (1 + (Math.random() - 0.5) * 0.1);
          holding.currentValue = holding.quantity * currentPrice;
          holding.pnl =
            holding.currentValue - holding.quantity * holding.avgBuyPrice;
          holding.pnlPercent =
            (holding.pnl / (holding.quantity * holding.avgBuyPrice)) * 100;
        }
      });

      return Object.values(holdings).filter((h) => h.quantity > 0);
    }, [portfolio.trades]);

    return (
      <div className="space-y-6">
        {/* 포트폴리오 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 자산
              </span>
              <DollarSignIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(portfolio.totalValue)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                현금
              </span>
              <CoinsIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(portfolio.availableCash)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 손익
              </span>
              <TrendingUpIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div
              className={`text-xl font-bold mt-1 ${
                portfolio.totalPnL >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {portfolio.totalPnL >= 0 ? "+" : ""}
              {formatCurrency(portfolio.totalPnL)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                보유 종목
              </span>
              <PieChartIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {coinHoldings.length}개
            </div>
          </div>
        </div>

        {/* 코인별 보유 현황 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <PieChartIcon className="w-5 h-5 mr-2 text-green-500" />
            보유 코인 현황
          </h3>

          {coinHoldings.length > 0 ? (
            <div className="space-y-3">
              {coinHoldings.map((holding, index) => (
                <div
                  key={`${holding.symbol}-${index}`}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {holding.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {holding.symbol}
                      </div>
                      <div className="text-sm text-gray-500">
                        보유량: {holding.quantity.toFixed(8)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(holding.currentValue)}
                    </div>
                    <div
                      className={`text-sm ${
                        holding.pnl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {holding.pnl >= 0 ? "+" : ""}
                      {formatCurrency(holding.pnl)}(
                      {holding.pnlPercent >= 0 ? "+" : ""}
                      {holding.pnlPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>보유 중인 코인이 없습니다</p>
              <p className="text-sm">거래를 시작하면 포트폴리오가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTradesTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          거래 내역
        </h3>
        {portfolio.trades.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ActivityIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>거래 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {portfolio.trades.slice(0, 10).map((trade, index) => (
              <div
                key={trade.id || index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.type === "BUY"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {trade.type}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {trade.symbol}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(trade.timestamp).toLocaleString("ko-KR")}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(trade.price)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      수량: {trade.quantity.toFixed(8)}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      총액: {formatCurrency(trade.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSignalsTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <LineChartIcon className="w-5 h-5 mr-2 text-orange-500" />
            실시간 매매 신호
          </h3>

          {/* 현재 신호 상태 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  매수 신호
                </span>
                <ArrowUpIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {signals.filter((s) => s.type === "BUY").length}
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  매도 신호
                </span>
                <ArrowDownIcon className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {signals.filter((s) => s.type === "SELL").length}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  신호 정확도
                </span>
                <TargetIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {monitoringStats.signalAccuracy.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 최근 신호 목록 */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              최근 신호 내역
            </h4>
            {signals.slice(0, 10).map((signal, index) => (
              <div
                key={`${signal.symbol}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      signal.type === "BUY"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {signal.type}
                  </span>
                  <span className="font-medium">{signal.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatCurrency(signal.price)}
                  </div>
                  <div className="text-xs text-gray-500">
                    신뢰도: {(signal.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}

            {signals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <LineChartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>아직 생성된 신호가 없습니다</p>
                <p className="text-sm">
                  거래가 활성화되면 실시간 신호가 표시됩니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <TestTubeIcon className="w-6 sm:w-8 h-6 sm:h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                페이퍼 트레이딩
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                관심코인을 선택하고 실시간 페이퍼 트레이딩을 체험하세요
              </p>
            </div>
          </div>

          {/* 컨트롤 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : connectionStatus === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${getConnectionStatusColor()}`}
              >
                {getConnectionStatusText()}
              </span>
            </div>

            <button
              onClick={() => setIsActive(!isActive)}
              disabled={selectedCoins.length === 0}
              className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                selectedCoins.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isActive
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
              }`}
            >
              {isActive ? (
                <>
                  <PauseIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">트레이딩 중지</span>
                  <span className="sm:hidden">중지</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">트레이딩 시작</span>
                  <span className="sm:hidden">시작</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 sm:px-6 py-4 text-sm font-medium transition-colors border-b-2 min-w-fit whitespace-nowrap ${
                  activeTab === tab.id
                    ? `${tab.color} border-current`
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[600px]">
        {activeTab === "coins" && renderCoinsTab()}
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "portfolio" && renderPortfolioTab()}
        {activeTab === "trades" && renderTradesTab()}
        {activeTab === "signals" && renderSignalsTab()}
        {activeTab === "logs" && (
          <ResponsiveLogViewer
            logs={logs}
            isCollapsed={isLogsCollapsed}
            setIsCollapsed={setIsLogsCollapsed}
          />
        )}
        {activeTab === "settings" && <TradingSettings />}
      </div>

      {/* 하단 로그 (overview 탭에서만 표시) */}
      {activeTab === "overview" && (
        <ResponsiveLogViewer
          logs={logs}
          isCollapsed={isLogsCollapsed}
          setIsCollapsed={setIsLogsCollapsed}
        />
      )}
    </div>
  );
};

export default PaperTrading;
