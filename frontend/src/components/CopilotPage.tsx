import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { chartCard, chartTitle, chartSubtitle } from '../utils/chartStyles';
import { CHART_COLORS, GRID_COLOR, TEXT_COLOR } from '../utils/colors';
import { makeTip, fmt, tipHtml } from '../utils/tooltipHelpers';
import { useSampleData } from '../hooks/useSampleData';
import { logEvent } from '../utils/analytics';
import {
  inferSchema, SchemaDisplay, MultiChartGrid,
  DataSchema, Recommendation,
} from './DataVisuals';
import { RelationshipMapCard, MultiTableAnalysisResult, TableNodeInfo } from './TableRelationshipMap';

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  fileName: string;
  records: Record<string, any>[];
  rowCount: number;
  columns: number;
  schema: DataSchema;
  recommendations: Recommendation[];
}
interface AIResult {
  recommendations?: Recommendation[];
  insights?: string[];
  suggested_title?: string;
  error?: string;
}

// ── Priority badge colours ────────────────────────────────────────────────────

// (MultiTableAnalysisResult and TableNodeInfo are imported from TableRelationshipMap)

const PRIORITY_COLOR: Record<number, string> = {
  1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#10b981', 5: '#8b5cf6',
};

// ── Auto bar chart (D3) ───────────────────────────────────────────────────────

function AutoBarChart({
  records,
  numCol,
  catCol,
  index,
}: {
  records: Record<string, any>[];
  numCol: string;
  catCol: string;
  index: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!records.length || !svgRef.current) return;
    const { show, hide } = makeTip(tipRef.current);

    const byGroup = d3.rollup(records, v => d3.sum(v, d => +d[numCol] || 0), d => String(d[catCol]));
    const chartData = Array.from(byGroup, ([label, value]) => ({ label, value }))
      .filter(d => d.value !== 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    if (!chartData.length) return;

    const W = 480, H = 280;
    const margin = { top: 16, right: 16, bottom: 52, left: 72 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('width', '100%')
      .style('height', 'auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, w]).padding(0.28);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value)! * 1.12]).range([h, 0]);

    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(() => ''))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('.tick line').attr('stroke', GRID_COLOR).attr('stroke-dasharray', '3,3'));

    const color = CHART_COLORS[index % CHART_COLORS.length];

    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label)!)
      .attr('width', x.bandwidth())
      .attr('y', h)
      .attr('height', 0)
      .attr('rx', 3)
      .attr('fill', color)
      .attr('opacity', 0.82)
      .style('cursor', 'pointer')
      .on('mousemove', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'rgba(255,255,255,0.3)').attr('stroke-width', 1.5);
        show(tipHtml(d.label, [[numCol, fmt(d.value)]], color), event.clientX, event.clientY);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.82).attr('stroke', 'none');
        hide();
      })
      .transition().duration(600).delay((_, i) => i * 50)
      .attr('y', d => y(d.value))
      .attr('height', d => h - y(d.value));

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(gr => gr.select('.domain').attr('stroke', GRID_COLOR))
      .call(gr => gr.selectAll('text')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', 10)
        .attr('dy', '1.2em')
        .attr('transform', chartData.length > 8 ? 'rotate(-35)' : null)
        .style('text-anchor', chartData.length > 8 ? 'end' : 'middle'));

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        const n = +d;
        return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
          : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
          : String(n);
      }))
      .call(gr => gr.select('.domain').remove())
      .call(gr => gr.selectAll('text').attr('fill', TEXT_COLOR).attr('font-size', 10));
  }, [records, numCol, catCol, index]);

  return (
    <div style={chartCard}>
      <div style={chartTitle}>{numCol} by {catCol}</div>
      <div style={chartSubtitle}>Aggregated sum · top 20 groups</div>
      <svg ref={svgRef} />
      <div ref={tipRef} />
    </div>
  );
}

// ── Visual samples section ───────────────────────────────────────────────────

function VisualSamples({
  uploadedFiles,
  activeIndex,
  onSelectFile,
  multiTableResult,
  multiAnalyzing,
}: {
  uploadedFiles: UploadedFile[];
  activeIndex: number;
  onSelectFile: (i: number) => void;
  multiTableResult: MultiTableAnalysisResult | null;
  multiAnalyzing: boolean;
}) {
  const { data: sampleRecords, loading: sampleLoading } = useSampleData('sales');

  const hasUploads = uploadedFiles.length > 0;
  const activeFile = uploadedFiles[activeIndex];

  // ── No uploads: show basic sample charts ──────────────────────────────────
  if (!hasUploads) {
    if (sampleLoading) return <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading sample data…</div>;

    const numericKeys = sampleRecords.length > 0
      ? Object.keys(sampleRecords[0]).filter(k => typeof sampleRecords[0][k] === 'number')
      : [];
    const catKeys = sampleRecords.length > 0
      ? Object.keys(sampleRecords[0]).filter(k => {
          if (numericKeys.includes(k)) return false;
          const unique = new Set(sampleRecords.map(r => r[k])).size;
          return unique > 1 && unique <= 50;
        })
      : [];
    const chartPairs: { numCol: string; catCol: string }[] = [];
    if (catKeys.length > 0) {
      numericKeys.forEach(n => chartPairs.push({ numCol: n, catCol: catKeys[0] }));
      if (numericKeys.length > 0) catKeys.slice(1).forEach(c => chartPairs.push({ numCol: numericKeys[0], catCol: c }));
    }
    return (
      <>
        <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Sample sales dataset · upload a file for AI-driven charts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
          {chartPairs.map((pair, i) => (
            <AutoBarChart key={`${pair.numCol}-${pair.catCol}`} records={sampleRecords} numCol={pair.numCol} catCol={pair.catCol} index={i} />
          ))}
        </div>
      </>
    );
  }

  // ── Uploaded files: relationship map + schema + AI-driven multi-chart grid ─────
  return (
    <>
      {/* File tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {uploadedFiles.map((f, i) => (
          <button
            key={i}
            onClick={() => onSelectFile(i)}
            style={{
              padding: '5px 14px', borderRadius: 20,
              border: i === activeIndex ? 'none' : '1px solid #2d3148',
              background: i === activeIndex ? '#6c63ff' : '#1a1d27',
              color: i === activeIndex ? '#fff' : '#94a3b8',
              fontSize: '0.78rem', fontWeight: i === activeIndex ? 700 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {f.fileName}
            <span style={{ marginLeft: 6, opacity: 0.7, fontSize: '0.72rem' }}>
              {f.rowCount.toLocaleString()} rows
            </span>
          </button>
        ))}
      </div>

      {/* Multi-table relationship map (shows only when 2+ files are loaded) */}
      {multiAnalyzing && (
        <div style={{
          padding: '12px 16px',
          background: '#0f1117',
          borderRadius: 8,
          border: '1px solid #2d3148',
          color: '#64748b',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔗</span>
          Analyzing table relationships with Copilot…
        </div>
      )}
      {!multiAnalyzing && multiTableResult && uploadedFiles.length >= 2 && (
        <RelationshipMapCard
          tables={uploadedFiles.map(f => ({
            name: f.fileName,
            columns: f.schema.allCols,
            colTypes: {
              ...Object.fromEntries(f.schema.numericCols.map(c => [c, 'numeric'])),
              ...Object.fromEntries(f.schema.catCols.map(c => [c, 'categorical'])),
              ...Object.fromEntries(f.schema.dateCols.map(c => [c, 'datetime'])),
            },
            rowCount: f.rowCount,
          }))}
          result={multiTableResult}
        />
      )}

      {activeFile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Schema card */}
          <SchemaDisplay schema={activeFile.schema} />

          {/* AI-driven chart grid */}
          {activeFile.recommendations.length > 0 && (
            <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AI-recommended charts for {activeFile.fileName}
            </div>
          )}
          <MultiChartGrid
            records={activeFile.records}
            schema={activeFile.schema}
            recommendations={activeFile.recommendations}
          />
        </div>
      )}
    </>
  );
}

// ── Setup steps card ─────────────────────────────────────────────────────────

function SetupCard() {
  const [copied, setCopied] = useState(false);
  const snippet = 'GITHUB_TOKEN=ghp_your_token_here';

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={chartCard}>
      <div style={chartTitle}>Setup — GitHub Personal Access Token</div>
      <div style={chartSubtitle}>Required to authenticate with the GitHub Models API</div>

      <ol style={{ margin: '12px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[
          <>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={{ color: '#6c63ff' }}>github.com/settings/tokens</a> → Developer settings → Personal access tokens</>,
          <>Click <strong style={{ color: '#e2e8f0' }}>Generate new token (classic)</strong></>,
          <>Select scope: <code style={{ color: '#6c63ff', background: '#0f1117', padding: '1px 5px', borderRadius: 4 }}>models:read</code> (or <code style={{ color: '#6c63ff', background: '#0f1117', padding: '1px 5px', borderRadius: 4 }}>read:org</code> for Copilot Business)</>,
          <>Copy the token (shown only once) and add it to your <code style={{ color: '#6c63ff', background: '#0f1117', padding: '1px 5px', borderRadius: 4 }}>.env</code> file:</>,
        ].map((step, i) => (
          <li key={i} style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6 }}>{step}</li>
        ))}
      </ol>

      {/* .env snippet */}
      <div style={{
        marginTop: 14, background: '#0a0c12',
        border: '1px solid #2d3148', borderRadius: 8, overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 14px', background: '#1a1d27', borderBottom: '1px solid #2d3148',
        }}>
          <span style={{ fontFamily: 'Menlo, monospace', fontSize: '0.74rem', color: '#64748b' }}>.env</span>
          <button onClick={copy} style={{
            background: 'none', border: '1px solid #2d3148', borderRadius: 6,
            color: copied ? '#34d399' : '#94a3b8', padding: '2px 10px',
            fontSize: '0.72rem', cursor: 'pointer',
          }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre style={{
          margin: 0, padding: '12px 16px',
          fontFamily: 'Menlo, monospace', fontSize: '0.82rem',
          color: '#6c63ff',
        }}>{snippet}</pre>
      </div>

      <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#64748b' }}>
        After updating <code>.env</code>, restart the backend for the token to take effect.
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { result: uploadResult, setResult } = useUpload();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [showSamples, setShowSamples] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [multiTableResult, setMultiTableResult] = useState<MultiTableAnalysisResult | null>(null);
  const [multiAnalyzing, setMultiAnalyzing] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    axios.get('/health')
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));
  }, []);

  // ── Upload + process multiple files ────────────────────────────────────────
  const handleFileUpload = async () => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMsg('');
    setError(null);
    setUploadProgress({ done: 0, total: files.length });

    const newEntries: UploadedFile[] = [];
    let lastResult: any = null;
    let lastFile: File | null = null;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const form = new FormData();
      form.append('file', file);
      form.append('schema_json', '{}');
      form.append('relationships', '');
      form.append('provider', 'copilot');

      try {
        const res = await axios.post('/api/process', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { viz_data, ai_insights } = res.data;
        const schema = inferSchema(viz_data.records);
        const recommendations: Recommendation[] = ai_insights?.recommendations ?? [];
        newEntries.push({
          fileName: file.name,
          records: viz_data.records,
          rowCount: viz_data.meta.row_count,
          columns: viz_data.meta.columns.length,
          schema,
          recommendations,
        });
        lastResult = res.data;
        lastFile = file;
        logEvent('file_upload', `Copilot Upload: ${file.name}`, 'AI Providers', {
          fileName: file.name, rows: String(viz_data.meta.row_count), status: 'success',
        });
        // Use AI insights from the last file
        if (idx === files.length - 1 && ai_insights && !ai_insights.error) {
          setAiResult(ai_insights);
        }
      } catch (e: any) {
        const detail: string = e.response?.data?.detail ?? '';
        setError(`Failed to upload ${file.name}: ${detail || 'Check backend logs.'}`);
        logEvent('file_upload', 'Copilot Upload', 'AI Providers', { status: 'error', fileName: file.name });
      }
      setUploadProgress({ done: idx + 1, total: files.length });
    }

    if (newEntries.length > 0) {
      const updatedFiles = [...uploadedFiles, ...newEntries];
      setUploadedFiles(updatedFiles);
      setActiveFileIndex(updatedFiles.length - 1);
      setShowSamples(true);
      const names = newEntries.map(e => e.fileName).join(', ');
      setUploadMsg(`✓ Loaded ${newEntries.length} file(s): ${names}`);
      // Update shared context with last successful upload
      if (lastResult && lastFile) {
        setResult({ ...lastResult, fileName: lastFile.name });
      }
      // Kick off relationship analysis when 2+ tables are present
      if (updatedFiles.length >= 2) {
        runMultiTableAnalysis(updatedFiles);
      }
    }

    // Reset input so same files can be re-added
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    setUploadProgress(null);
  };

  // ── Run Copilot analysis ───────────────────────────────────────────────────
  const runAnalysisWithData = async (precomputed?: AIResult) => {
    // If we already got AI insights during upload, use them directly
    if (precomputed && !precomputed.error) {
      setAiResult(precomputed);
      logEvent('ai_analysis', 'Copilot Analysis', 'AI Providers', { provider: 'copilot', status: 'success' });
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      // Build summary from upload context or fall back to sample data
      const summary = uploadResult ? buildSummary(uploadResult) : SAMPLE_SUMMARY;

      const res = await axios.post('/api/insights?provider=copilot', { dataset_summary: summary });
      setAiResult(res.data);
      setBackendUp(true);
      logEvent('ai_analysis', 'Copilot Analysis', 'AI Providers', { provider: 'copilot', status: 'success' });
    } catch (e: any) {
      const detail: string = e.response?.data?.detail ?? '';
      logEvent('ai_analysis', 'Copilot Analysis', 'AI Providers', { provider: 'copilot', status: 'error', error: detail || 'unknown' });
      if (!e.response) {
        setBackendUp(false);
        setError('Backend is not running. Start it with the Launcher.');
      } else if (detail.toLowerCase().includes('github_token') || detail.toLowerCase().includes('github token')) {
        setError('GITHUB_TOKEN is not set.\n\nAdd it to your .env file:\n\nGITHUB_TOKEN=ghp_your_token_here\n\nThen restart the backend.');
      } else if (detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('authentication')) {
        setError('GITHUB_TOKEN is invalid or has insufficient permissions.\n\nEnsure the token has the "models:read" scope.\n\nGenerate a new token at https://github.com/settings/tokens');
      } else {
        setError(detail || 'GitHub Copilot analysis failed. Check the backend logs.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const runAnalysis = () => runAnalysisWithData(undefined);

  // ── Multi-table relationship analysis ────────────────────────────────────
  const runMultiTableAnalysis = async (files: UploadedFile[]) => {
    if (files.length < 2) return;
    setMultiAnalyzing(true);
    setMultiTableResult(null);
    try {
      const payload = {
        tables: files.map(f => ({
          name: f.fileName,
          columns: f.schema.allCols,
          col_types: {
            ...Object.fromEntries(f.schema.numericCols.map(c => [c, 'numeric'] as [string, string])),
            ...Object.fromEntries(f.schema.catCols.map(c => [c, 'categorical'] as [string, string])),
            ...Object.fromEntries(f.schema.dateCols.map(c => [c, 'datetime'] as [string, string])),
          },
          row_count: f.rowCount,
          sample_values: Object.fromEntries(
            f.schema.allCols.map(col => [
              col,
              [...new Set(f.records.slice(0, 50).map(r => r[col]))].slice(0, 10),
            ])
          ),
        })),
      };
      const res = await axios.post<MultiTableAnalysisResult>(
        '/api/multi-table/analyze?provider=copilot',
        payload,
      );
      setMultiTableResult(res.data);
    } catch (_e) {
      // Multi-table analysis is additive — silently skip on error
    } finally {
      setMultiAnalyzing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ ...chartCard, borderTop: '3px solid #6c63ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Copilot logo mark */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={chartTitle}>GitHub Copilot Analysis</div>
            <div style={chartSubtitle}>gpt-4o · GitHub Models API</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                background: backendUp === true ? '#34d399' : backendUp === false ? '#f87171' : '#64748b',
              }} />
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {backendUp === true ? 'Backend connected' : backendUp === false ? 'Backend offline' : 'Checking…'}
              </span>
            </div>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer"
              style={{ fontSize: '0.74rem', color: '#6c63ff', textDecoration: 'none' }}>
              GitHub Tokens ↗
            </a>
          </div>
        </div>

        {/* Token hint */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: '#0f1117', borderRadius: 8,
          border: '1px solid #2d3148', fontFamily: 'Menlo, monospace', fontSize: '0.78rem',
          color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#64748b' }}>🔑</span>
          <span>Set <strong style={{ color: '#6c63ff' }}>GITHUB_TOKEN</strong> in your <code>.env</code> file to enable GitHub Copilot.</span>
        </div>
      </div>

      {/* ── Setup instructions ──────────────────────────────────────────────── */}
      <SetupCard />

      {/* ── Data source ────────────────────────────────────────────────────── */}
      <div style={chartCard}>
        <div style={chartTitle}>Data Source</div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {uploadedFiles.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', background: '#0f1117',
                border: '1px solid #34d39933', borderRadius: 8,
              }}>
                <span style={{ color: '#34d399', fontSize: '1rem' }}>✓</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontSize: '0.86rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.fileName}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: 1 }}>
                    {f.rowCount.toLocaleString()} rows · {f.columns} columns
                  </div>
                </div>
                <button
                  onClick={() => navigate('/upload-results')}
                  style={{
                    padding: '4px 12px', background: '#6c63ff22',
                    border: '1px solid #6c63ff55', borderRadius: 6,
                    color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  View Visuals →
                </button>
                <button
                  onClick={() => setUploadedFiles(prev => {
                    const next = prev.filter((_, idx) => idx !== i);
                    setActiveFileIndex(Math.min(activeFileIndex, Math.max(next.length - 1, 0)));
                    if (next.length < 2) setMultiTableResult(null);
                    return next;
                  })}
                  title="Remove"
                  style={{
                    padding: '4px 8px', background: 'none',
                    border: '1px solid #ef444433', borderRadius: 6,
                    color: '#f87171', fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={runAnalysis}
                disabled={analyzing || backendUp === false}
                style={{
                  padding: '8px 18px', background: analyzing ? '#334155' : '#6c63ff',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontWeight: 700, fontSize: '0.85rem', cursor: analyzing ? 'default' : 'pointer',
                }}
              >
                {analyzing ? 'Analysing…' : 'Re-analyse with Copilot'}
              </button>
              <span style={{ color: '#64748b', fontSize: '0.76rem' }}>or add more files below</span>
            </div>
          </div>
        )}

        {uploadedFiles.length === 0 && (
          <div style={chartSubtitle}>No files uploaded yet. Select one or more CSV / JSON files to analyse.</div>
        )}

        {/* Multi-file upload input */}
        <div style={{ marginTop: 14 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || backendUp === false}
            style={{
              padding: '9px 22px', background: 'transparent',
              border: '1px dashed #6c63ff88', borderRadius: 8,
              color: '#a78bfa', fontSize: '0.85rem', cursor: uploading ? 'default' : 'pointer',
            }}
          >
            {uploading
              ? uploadProgress
                ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
                : 'Uploading…'
              : '+ Upload CSV / JSON (multiple allowed)'}
          </button>
          {uploadMsg && (
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#34d399' }}>{uploadMsg}</div>
          )}
        </div>

        {/* Run on sample data when nothing uploaded */}
        {uploadedFiles.length === 0 && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={runAnalysis}
              disabled={analyzing || backendUp === false}
              style={{
                padding: '9px 22px', background: analyzing ? '#334155' : '#6c63ff',
                color: '#fff', border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: '0.88rem', cursor: analyzing ? 'default' : 'pointer',
              }}
            >
              {analyzing ? 'Analysing…' : 'Run Copilot Analysis on Sample Data'}
            </button>
            <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#64748b' }}>
              Uses a built-in sales dataset summary for demonstration.
            </div>
          </div>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          ...chartCard, background: '#1f1215', borderLeft: '4px solid #ef4444',
          fontFamily: 'Menlo, monospace', fontSize: '0.82rem', color: '#fca5a5',
          whiteSpace: 'pre-wrap',
        }}>
          {error}
        </div>
      )}

      {/* ── AI Results ─────────────────────────────────────────────────────── */}
      {aiResult && !aiResult.error && (
        <>
          {/* Suggested title */}
          {aiResult.suggested_title && (
            <div style={{ ...chartCard, borderLeft: '4px solid #6c63ff' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                Copilot Suggested Title
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>
                {aiResult.suggested_title}
              </div>
            </div>
          )}

          {/* Chart recommendations */}
          {aiResult.recommendations && aiResult.recommendations.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Chart Recommendations</div>
              <div style={chartSubtitle}>Ranked by Copilot — P1 is highest priority</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {[...aiResult.recommendations]
                  .sort((a, b) => a.priority - b.priority)
                  .map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', background: '#0f1117',
                      borderRadius: 8, border: '1px solid #2d3148',
                    }}>
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: '50%',
                        background: PRIORITY_COLOR[r.priority] ?? '#6c63ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{r.priority}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
                          {r.chart_type}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>
                          {r.reason}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Key insights */}
          {aiResult.insights && aiResult.insights.length > 0 && (
            <div style={chartCard}>
              <div style={chartTitle}>Key Insights</div>
              <div style={chartSubtitle}>Generated by GitHub Copilot</div>
              <ul style={{ margin: '14px 0 0', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiResult.insights.map((ins, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700, marginTop: 1 }}>›</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA to full visuals */}
          {uploadResult && (
            <div style={{ ...chartCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.92rem' }}>
                  View full auto-generated charts
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                  Bar charts, data table, and numeric summaries for {uploadResult.fileName}
                </div>
              </div>
              <button
                onClick={() => navigate('/upload-results')}
                style={{
                  padding: '10px 24px',
                  background: '#6c63ff',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                View Full Visuals →
              </button>
            </div>
          )}
        </>
      )}

      {/* AI error response */}
      {aiResult?.error && (
        <div style={{
          ...chartCard, background: '#1f1215', borderLeft: '4px solid #f59e0b',
          fontSize: '0.82rem', color: '#fcd34d',
        }}>
          <strong>Copilot returned an error:</strong> {aiResult.error}
        </div>
      )}

      {/* ── Visual Samples ─────────────────────────────────────────────────── */}
      <div style={chartCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={chartTitle}>Visual Samples</div>
            <div style={chartSubtitle}>
              {uploadedFiles.length > 0
                ? `${uploadedFiles.length} file(s) loaded — click a tab to switch`
                : 'Sample sales dataset bar charts'}
            </div>
          </div>
          <button
            onClick={() => setShowSamples(s => !s)}
            style={{
              padding: '8px 18px',
              background: showSamples ? '#1e293b' : '#6c63ff',
              border: showSamples ? '1px solid #6c63ff55' : 'none',
              borderRadius: 8, color: showSamples ? '#a78bfa' : '#fff',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {showSamples ? 'Hide Charts' : 'Generate Visual Samples'}
          </button>
        </div>

        {showSamples && (
          <div style={{ marginTop: 20 }}>
            <VisualSamples
              uploadedFiles={uploadedFiles}
              activeIndex={activeFileIndex}
              onSelectFile={setActiveFileIndex}
              multiTableResult={multiTableResult}
              multiAnalyzing={multiAnalyzing}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSummary(result: ReturnType<typeof useUpload>['result']) {
  if (!result) return SAMPLE_SUMMARY;
  const { viz_data } = result;
  const numericCols = Object.keys(viz_data.numeric_summaries);
  const catCols = viz_data.meta.columns.filter(c => !numericCols.includes(c));
  return {
    dataset_shape: { rows: viz_data.meta.row_count, columns: viz_data.meta.columns.length },
    column_groups: {
      numeric: numericCols,
      categorical: catCols,
      datetime: [],
    },
    numeric_summaries: viz_data.numeric_summaries,
    file_name: result.fileName,
  };
}

const SAMPLE_SUMMARY = {
  dataset_shape: { rows: 1200, columns: 9 },
  column_groups: {
    numeric: ['quantity', 'unit_price', 'total_amount'],
    categorical: ['region', 'category', 'payment_method'],
    datetime: ['order_date'],
  },
  region_revenue: { North: 142300, South: 98700, East: 115400, West: 131200 },
  top_categories: ['Electronics', 'Clothing', 'Food'],
};
