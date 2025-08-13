// src/constants/navigation.js
import {
  TrendingUp,
  Newspaper,
  Filter,
  Settings,
  Activity,
} from "lucide-react";

export const NAVIGATION_TABS = [
  { id: "dashboard", label: "포트폴리오", icon: TrendingUp },
  { id: "search", label: "코인 검색", icon: Filter },
  { id: "recommendations", label: "AI 추천", icon: Activity },
  { id: "news", label: "뉴스 분석", icon: Newspaper },
  { id: "controls", label: "설정", icon: Settings },
  { id: "backtest", label: "백테스팅", icon: Activity },
];
