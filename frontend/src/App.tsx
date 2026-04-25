import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import BarChart from './d3-charts/BarChart';
import LineChart from './d3-charts/LineChart';
import HeatmapMatrix from './d3-charts/HeatmapMatrix';
import ForceGraph from './d3-charts/ForceGraph';
import Treemap from './d3-charts/Treemap';
import SankeyDiagram from './d3-charts/SankeyDiagram';
import ScatterPlot from './d3-charts/ScatterPlot';
import BoxPlot from './d3-charts/BoxPlot';
import ChoroplethMap from './d3-charts/ChoroplethMap';
import SunburstChart from './d3-charts/SunburstChart';
import RadarChart from './d3-charts/RadarChart';
import StackedAreaChart from './d3-charts/StackedAreaChart';
import NetworkGraph from './d3-charts/NetworkGraph';
import ParallelCoordinates from './d3-charts/ParallelCoordinates';
import AIDashboard from './components/AIDashboard';
import AIModelConfig from './components/AIModelConfig';
import GeminiPage from './components/GeminiPage';
import ClaudePage from './components/ClaudePage';
import OpenAIPage from './components/OpenAIPage';
import APIKeysPage from './components/APIKeysPage';
import UsageReportPage from './components/UsageReportPage';
import UploadPanel from './components/UploadPanel';
import UploadResultsPage from './components/UploadResultsPage';
import SalesPaymentDemo from './components/SalesPaymentDemo';
import ChartPage from './components/ChartPage';
import CopilotPage from './components/CopilotPage';
import { UploadProvider } from './context/UploadContext';
import { CHART_SNIPPETS } from './utils/chartSnippets';
import { logEvent } from './utils/analytics';
import styles from './App.module.css';

const NAV_ITEMS = [
  { path: '/demo',         label: '🎯 Sales & Payments Demo', section: 'Demos' },
  { path: '/',             label: '📊 Bar Chart',             section: 'Charts' },
  { path: '/line',         label: '📈 Line Chart',            section: 'Charts' },
  { path: '/heatmap',      label: '🔥 Heatmap',              section: 'Charts' },
  { path: '/force',        label: '🕸 Force Graph',           section: 'Charts' },
  { path: '/treemap',      label: '🌳 Treemap',               section: 'Charts' },
  { path: '/sankey',       label: '🌊 Sankey',                section: 'Charts' },
  { path: '/scatter',      label: '⚡ Scatter Plot',          section: 'Charts' },
  { path: '/boxplot',      label: '📦 Box Plot',              section: 'Charts' },
  { path: '/choropleth',   label: '🗺 Choropleth',            section: 'Charts' },
  { path: '/sunburst',     label: '☀️ Sunburst',              section: 'Charts' },
  { path: '/radar',        label: '🕷 Radar Chart',           section: 'Charts' },
  { path: '/stacked-area', label: '📐 Stacked Area',         section: 'Charts' },
  { path: '/network',      label: '🔗 Network Graph',         section: 'Charts' },
  { path: '/parallel',     label: '📏 Parallel Coords',       section: 'Charts' },
  { path: '/ai-dashboard', label: '🤖 AI Dashboard',          section: 'AI Tools' },
  { path: '/ai-config',    label: '⚙️ AI Model Config',       section: 'AI Tools' },
];

const AI_NAV = [
  { path: '/ai/gemini',  label: '💎 Gemini',         section: 'AI Providers' },
  { path: '/ai/claude',  label: '🧠 Claude',         section: 'AI Providers' },
  { path: '/ai/openai',  label: '⚡ OpenAI',         section: 'AI Providers' },
  { path: '/ai/copilot', label: '🤖 Copilot',        section: 'AI Providers' },
  { path: '/ai/keys',    label: '🔑 API Keys',       section: 'AI Providers' },
];

const ANALYTICS_NAV = [
  { path: '/report',          label: '📊 Usage Report',    section: 'Analytics' },
  { path: '/upload-results',  label: '📂 Upload Results',  section: 'Analytics' },
];

const sectionDivider: React.CSSProperties = {
  margin: '12px 0 4px', paddingLeft: 12,
  fontSize: '0.68rem', fontWeight: 700, letterSpacing: 1,
  color: '#475569', textTransform: 'uppercase',
};

const ALL_ROUTES = [...NAV_ITEMS, ...AI_NAV, ...ANALYTICS_NAV];

function TrackPageViews() {
  const location = useLocation();
  useEffect(() => {
    const match = ALL_ROUTES.find(n => {
      if (n.path === '/') return location.pathname === '/';
      return location.pathname.startsWith(n.path);
    });
    const label   = match?.label   ?? location.pathname;
    const section = match?.section ?? 'Other';
    logEvent('page_view', label, section, { path: location.pathname });
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <UploadProvider>
      <TrackPageViews />
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span>jasus</span>
            <span className={styles.logoAccent}>-viz-AI-lib</span>
          </div>
          <UploadPanel />
          <nav className={styles.nav}>
            {NAV_ITEMS.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navActive : ''}`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* ── AI Providers section ── */}
            <div style={sectionDivider}>AI Providers</div>
            {AI_NAV.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navActive : ''}`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* ── Analytics section ── */}
            <div style={sectionDivider}>Analytics</div>
            {ANALYTICS_NAV.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navActive : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className={styles.main}>
          <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<ChartPage snippet={CHART_SNIPPETS.bar}><BarChart /></ChartPage>} />
            <Route path="/line" element={<ChartPage snippet={CHART_SNIPPETS.line}><LineChart /></ChartPage>} />
            <Route path="/heatmap" element={<ChartPage snippet={CHART_SNIPPETS.heatmap}><HeatmapMatrix /></ChartPage>} />
            <Route path="/force" element={<ChartPage snippet={CHART_SNIPPETS.force}><ForceGraph /></ChartPage>} />
            <Route path="/treemap" element={<ChartPage snippet={CHART_SNIPPETS.treemap}><Treemap /></ChartPage>} />
            <Route path="/sankey" element={<ChartPage snippet={CHART_SNIPPETS.sankey}><SankeyDiagram /></ChartPage>} />
            <Route path="/scatter" element={<ChartPage snippet={CHART_SNIPPETS.scatter}><ScatterPlot /></ChartPage>} />
            <Route path="/boxplot" element={<ChartPage snippet={CHART_SNIPPETS.boxplot}><BoxPlot /></ChartPage>} />
            <Route path="/choropleth" element={<ChartPage snippet={CHART_SNIPPETS.choropleth}><ChoroplethMap /></ChartPage>} />
            <Route path="/sunburst" element={<ChartPage snippet={CHART_SNIPPETS.sunburst}><SunburstChart /></ChartPage>} />
            <Route path="/radar" element={<ChartPage snippet={CHART_SNIPPETS.radar}><RadarChart /></ChartPage>} />
            <Route path="/stacked-area" element={<ChartPage snippet={CHART_SNIPPETS.stacked}><StackedAreaChart /></ChartPage>} />
            <Route path="/network" element={<ChartPage snippet={CHART_SNIPPETS.network}><NetworkGraph /></ChartPage>} />
            <Route path="/parallel" element={<ChartPage snippet={CHART_SNIPPETS.parallel}><ParallelCoordinates /></ChartPage>} />
            <Route path="/ai-dashboard" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><AIDashboard /></div>} />
            <Route path="/ai-config" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><AIModelConfig /></div>} />
            <Route path="/demo" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><SalesPaymentDemo /></div>} />
            {/* ── AI Provider pages ── */}
            <Route path="/ai/gemini" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><GeminiPage /></div>} />
            <Route path="/ai/claude" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><ClaudePage /></div>} />
            <Route path="/ai/openai"  element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><OpenAIPage /></div>} />
            <Route path="/ai/copilot" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><CopilotPage /></div>} />
            <Route path="/ai/keys"    element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><APIKeysPage /></div>} />
              {/* Analytics */}
              <Route path="/report"         element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><UsageReportPage /></div>} />
              <Route path="/upload-results"  element={<UploadResultsPage />} />
          </Routes>
          </div>
        </main>
      </div>
      </UploadProvider>
    </BrowserRouter>
  );
}
