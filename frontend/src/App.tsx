import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
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
import UploadPanel from './components/UploadPanel';
import SalesPaymentDemo from './components/SalesPaymentDemo';
import ChartPage from './components/ChartPage';
import { CHART_SNIPPETS } from './utils/chartSnippets';
import styles from './App.module.css';

const NAV_ITEMS = [
  { path: '/demo', label: '🎯 Sales & Payments Demo' },
  { path: '/', label: '📊 Bar Chart' },
  { path: '/line', label: '📈 Line Chart' },
  { path: '/heatmap', label: '🔥 Heatmap' },
  { path: '/force', label: '🕸 Force Graph' },
  { path: '/treemap', label: '🌳 Treemap' },
  { path: '/sankey', label: '🌊 Sankey' },
  { path: '/scatter', label: '⚡ Scatter Plot' },
  { path: '/boxplot', label: '📦 Box Plot' },
  { path: '/choropleth', label: '🗺 Choropleth' },
  { path: '/sunburst', label: '☀️ Sunburst' },
  { path: '/radar', label: '🕷 Radar Chart' },
  { path: '/stacked-area', label: '📐 Stacked Area' },
  { path: '/network', label: '🔗 Network Graph' },
  { path: '/parallel', label: '📏 Parallel Coords' },
  { path: '/ai-dashboard', label: '🤖 AI Dashboard' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span>DataViz</span>
            <span className={styles.logoAccent}> AI Studio</span>
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
            <Route path="/demo" element={<div style={{ overflowY: 'auto', height: '100%', padding: 28 }}><SalesPaymentDemo /></div>} />
          </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
