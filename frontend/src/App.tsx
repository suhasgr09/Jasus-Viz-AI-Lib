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
          <Routes>
            <Route path="/" element={<BarChart />} />
            <Route path="/line" element={<LineChart />} />
            <Route path="/heatmap" element={<HeatmapMatrix />} />
            <Route path="/force" element={<ForceGraph />} />
            <Route path="/treemap" element={<Treemap />} />
            <Route path="/sankey" element={<SankeyDiagram />} />
            <Route path="/scatter" element={<ScatterPlot />} />
            <Route path="/boxplot" element={<BoxPlot />} />
            <Route path="/choropleth" element={<ChoroplethMap />} />
            <Route path="/sunburst" element={<SunburstChart />} />
            <Route path="/radar" element={<RadarChart />} />
            <Route path="/stacked-area" element={<StackedAreaChart />} />
            <Route path="/network" element={<NetworkGraph />} />
            <Route path="/parallel" element={<ParallelCoordinates />} />
            <Route path="/ai-dashboard" element={<AIDashboard />} />
            <Route path="/demo" element={<SalesPaymentDemo />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
