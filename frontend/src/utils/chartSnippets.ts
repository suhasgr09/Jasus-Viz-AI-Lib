export interface ChartSnippet {
  title: string;
  description: string;
  react: string;
  python: string;
  cli: string;
}

export const CHART_SNIPPETS: Record<string, ChartSnippet> = {
  bar: {
    title: 'Bar Chart',
    description: 'Animated bar chart aggregating sales revenue by region using D3 scaleBand.',
    react: `import * as d3 from 'd3';

// Aggregate data
const byRegion = d3.rollup(
  data,
  v => d3.sum(v, d => d.total_amount),
  d => d.region
);
const chartData = Array.from(byRegion,
  ([region, total]) => ({ region, total })
).sort((a, b) => b.total - a.total);

// Scales
const x = d3.scaleBand()
  .domain(chartData.map(d => d.region))
  .range([0, width])
  .padding(0.3);

const y = d3.scaleLinear()
  .domain([0, d3.max(chartData, d => d.total)! * 1.1])
  .range([height, 0]);

// Animated bars
svg.selectAll('.bar')
  .data(chartData)
  .join('rect')
  .attr('x', d => x(d.region)!)
  .attr('width', x.bandwidth())
  .attr('y', height)
  .attr('height', 0)
  .transition().duration(700)
  .attr('y', d => y(d.total))
  .attr('height', d => height - y(d.total));`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')

# Aggregate by region
region_rev = (
  df.groupby('region')['total_amount']
  .sum()
  .reset_index()
  .sort_values('total_amount', ascending=False)
)
print(region_rev)

# Or via API
import requests
res = requests.get('http://localhost:8000/api/sample-data/sales')
data = res.json()`,
    cli: `# Generate sample data
source .venv/bin/activate
python data/generate_samples.py

# Start backend
uvicorn src.api:app --reload --port 8000

# Fetch data
curl http://localhost:8000/api/sample-data/sales | python3 -m json.tool

# Run CLI analysis
python src/main.py \\
  --schema data/sample_schemas/sales_schema.json \\
  --data data/sample_data/sales.csv \\
  --output out.json`,
  },

  line: {
    title: 'Line Chart',
    description: 'Monthly revenue trend with animated line draw, area fill, and scroll-to-zoom.',
    react: `import * as d3 from 'd3';

// Parse & aggregate by month
const byMonth = d3.rollup(
  data,
  v => d3.sum(v, d => d.total_amount),
  d => d.order_date?.slice(0, 7)
);
const chartData = Array.from(byMonth,
  ([month, total]) => ({ date: new Date(month + '-01'), total })
).sort((a, b) => +a.date - +b.date);

// Scales
const x = d3.scaleTime()
  .domain(d3.extent(chartData, d => d.date) as [Date, Date])
  .range([0, width]);

// Line generator
const lineGen = d3.line<{ date: Date; total: number }>()
  .x(d => x(d.date))
  .y(d => y(d.total))
  .curve(d3.curveMonotoneX);

// Animate draw
const totalLength = path.node().getTotalLength();
path
  .attr('stroke-dasharray', \`\${totalLength} \${totalLength}\`)
  .attr('stroke-dashoffset', totalLength)
  .transition().duration(1200)
  .attr('stroke-dashoffset', 0);

// Zoom
const zoom = d3.zoom().scaleExtent([1, 8])
  .on('zoom', event => {
    const newX = event.transform.rescaleX(x);
    xAxis.call(d3.axisBottom(newX));
  });`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')
df['order_date'] = pd.to_datetime(df['order_date'])
df['month'] = df['order_date'].dt.to_period('M').astype(str)

monthly = (
  df.groupby('month')['total_amount']
  .sum()
  .reset_index()
  .sort_values('month')
)
print(monthly.head(12))`,
    cli: `# Get monthly revenue via API
curl -X POST http://localhost:8000/api/insights \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset_summary": {
      "dataset_shape": {"rows": 1000, "columns": 9},
      "column_groups": {
        "datetime": ["order_date"],
        "numeric": ["total_amount"]
      }
    }
  }'`,
  },

  heatmap: {
    title: 'Heatmap Matrix',
    description: 'Region × category revenue heatmap with sequential color scale.',
    react: `import * as d3 from 'd3';

// Build matrix: region × category
const matrix = d3.rollup(
  data,
  v => d3.sum(v, d => d.total_amount),
  d => d.region,
  d => d.category
);

const color = d3.scaleSequential()
  .domain([0, d3.max(values)!])
  .interpolator(d3.interpolatePurples);

// Draw cells
svg.selectAll('rect')
  .data(cells)
  .join('rect')
  .attr('x', d => xScale(d.col)!)
  .attr('y', d => yScale(d.row)!)
  .attr('width', xScale.bandwidth())
  .attr('height', yScale.bandwidth())
  .attr('fill', d => color(d.value))
  .attr('rx', 3);`,
    python: `import pandas as pd
import numpy as np

df = pd.read_csv('data/sample_data/sales.csv')

pivot = df.pivot_table(
  values='total_amount',
  index='region',
  columns='category',
  aggfunc='sum',
  fill_value=0
)
print(pivot.round(0))`,
    cli: `# Export pivot to JSON
python3 -c "
import pandas as pd, json
df = pd.read_csv('data/sample_data/sales.csv')
pivot = df.pivot_table(
  values='total_amount',
  index='region', columns='category',
  aggfunc='sum', fill_value=0
)
print(pivot.to_json())
"`,
  },

  force: {
    title: 'Force-Directed Graph',
    description: 'Interactive entity relationship graph. Drag nodes to rearrange.',
    react: `import * as d3 from 'd3';

const sim = d3.forceSimulation(nodes)
  .force('link',
    d3.forceLink(links)
      .id((d: any) => d.id)
      .distance(120)
  )
  .force('charge',
    d3.forceManyBody().strength(-300)
  )
  .force('center',
    d3.forceCenter(W / 2, H / 2)
  );

// Draggable nodes
const drag = d3.drag<SVGCircleElement, any>()
  .on('start', (event, d) => {
    if (!event.active)
      sim.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  })
  .on('drag', (event, d) => {
    d.fx = event.x; d.fy = event.y;
  })
  .on('end', (event, d) => {
    if (!event.active) sim.alphaTarget(0);
    d.fx = null; d.fy = null;
  });

node.call(drag as any);

// Tick update
sim.on('tick', () => {
  link
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);
  node.attr('cx', d => d.x).attr('cy', d => d.y);
});`,
    python: `# Build entity graph from schema relationships
import json

schema = {
  "nodes": [
    {"id": "orders"},
    {"id": "customers"},
    {"id": "products"},
    {"id": "categories"},
    {"id": "regions"}
  ],
  "links": [
    {"source": "orders", "target": "customers", "value": 3},
    {"source": "orders", "target": "products",  "value": 3},
    {"source": "products","target": "categories","value": 2},
    {"source": "orders", "target": "regions",   "value": 2}
  ]
}

# Or extract from your schema file
with open('data/sample_schemas/sales_schema.json') as f:
  s = json.load(f)
  print(json.dumps(s, indent=2))`,
    cli: `# Get schema recommendations from Claude
curl -X POST http://localhost:8000/api/recommendations \\
  -H "Content-Type: application/json" \\
  -d @data/sample_schemas/sales_schema.json`,
  },

  treemap: {
    title: 'Treemap',
    description: 'Hierarchical breakdown of revenue by category and region.',
    react: `import * as d3 from 'd3';

// Build hierarchy
const root = d3.hierarchy({
  name: 'root',
  children: categories.map(cat => ({
    name: cat,
    value: totalByCategory[cat]
  }))
}).sum(d => (d as any).value);

// Layout
d3.treemap()
  .size([width, height])
  .paddingInner(3)
  .paddingOuter(6)
  (root);

// Cells with labels
const cell = svg.selectAll('g')
  .data(root.leaves())
  .join('g')
  .attr('transform',
    d => \`translate(\${d.x0},\${d.y0})\`
  );

cell.append('rect')
  .attr('width', d => d.x1 - d.x0)
  .attr('height', d => d.y1 - d.y0)
  .attr('fill', (_, i) => CHART_COLORS[i % CHART_COLORS.length]);`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')

category_rev = (
  df.groupby('category')['total_amount']
  .sum()
  .reset_index()
  .sort_values('total_amount', ascending=False)
)

# Build nested hierarchy for D3
hierarchy = {
  "name": "Sales",
  "children": [
    {"name": row.category, "value": round(row.total_amount, 2)}
    for _, row in category_rev.iterrows()
  ]
}
import json
print(json.dumps(hierarchy, indent=2))`,
    cli: `python3 -c "
import pandas as pd, json
df = pd.read_csv('data/sample_data/sales.csv')
cat = df.groupby('category')['total_amount'].sum()
print(cat.sort_values(ascending=False).to_json())
"`,
  },

  scatter: {
    title: 'Scatter Plot',
    description: 'Unit price vs total amount with linear regression line per category.',
    react: `import * as d3 from 'd3';

// Linear regression helper
const regression = (pts: [number,number][]) => {
  const n = pts.length;
  const mx = d3.mean(pts, d => d[0])!;
  const my = d3.mean(pts, d => d[1])!;
  const slope = d3.sum(pts, d =>
    (d[0]-mx)*(d[1]-my)
  ) / d3.sum(pts, d => (d[0]-mx)**2);
  const intercept = my - slope * mx;
  return { slope, intercept };
};

// Scales
const x = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.unit_price)!])
  .range([0, width]);

// Dots with color by category
svg.selectAll('circle')
  .data(sample)
  .join('circle')
  .attr('cx', d => x(d.unit_price))
  .attr('cy', d => y(d.total_amount))
  .attr('r', 4)
  .attr('fill', d => color(d.category))
  .attr('opacity', 0.65);`,
    python: `import pandas as pd
from scipy import stats

df = pd.read_csv('data/sample_data/sales.csv')

# Regression per category
for cat, grp in df.groupby('category'):
  slope, intercept, r, p, se = stats.linregress(
    grp['unit_price'], grp['total_amount']
  )
  print(f"{cat}: slope={slope:.2f}, R²={r**2:.3f}")`,
    cli: `# Get viz recommendation for scatter
curl -X POST http://localhost:8000/api/viz-recommendation \\
  -H "Content-Type: application/json" \\
  -d '{
    "x_col": "unit_price",
    "y_col": "total_amount",
    "data_sample": [
      {"unit_price": 99.9, "total_amount": 499.5},
      {"unit_price": 25.0, "total_amount": 125.0}
    ]
  }'`,
  },

  sankey: {
    title: 'Sankey Diagram',
    description: 'Flow diagram showing product category to sales region distribution.',
    react: `import * as d3 from 'd3';

// Custom Sankey without d3-sankey plugin
// Left nodes: categories, Right nodes: regions
const NODES = ['Electronics','Clothing','Home',
               'Sports','Books',
               'North','South','East','West'];
const LINKS = [
  { source: 0, target: 5, value: 120 },
  { source: 1, target: 6, value: 80  },
  // ...
];

LINKS.forEach(l => {
  const path = d3.linkHorizontal()({
    source: [leftX + nodeW, leftY(l.source)],
    target: [rightX,        rightY(l.target - 5)]
  } as any);

  svg.append('path')
    .attr('d', path as string)
    .attr('fill', 'none')
    .attr('stroke', CHART_COLORS[l.source])
    .attr('stroke-width',
      Math.max(1, l.value / 10)
    )
    .attr('opacity', 0.4);
});`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')

# Category → Region flow matrix
flow = (
  df.groupby(['category', 'region'])['total_amount']
  .sum()
  .reset_index()
  .pivot(index='category',
         columns='region',
         values='total_amount')
  .fillna(0)
)
print(flow.round(0))`,
    cli: `python3 -c "
import pandas as pd, json
df = pd.read_csv('data/sample_data/sales.csv')
flow = (df.groupby(['category','region'])['quantity']
  .sum().reset_index()
  .rename(columns={'quantity':'value'}))
print(flow.to_json(orient='records', indent=2))
"`,
  },

  boxplot: {
    title: 'Box Plot',
    description: 'Distribution of order values per product category with IQR and outliers.',
    react: `import * as d3 from 'd3';

// Per-category statistics
const stats = categories.map(cat => {
  const vals = data
    .filter(d => d.category === cat)
    .map(d => d.total_amount)
    .sort(d3.ascending);
  const q1  = d3.quantile(vals, 0.25)!;
  const med = d3.quantile(vals, 0.50)!;
  const q3  = d3.quantile(vals, 0.75)!;
  const iqr = q3 - q1;
  return {
    cat, q1, med, q3,
    min: Math.max(d3.min(vals)!, q1 - 1.5*iqr),
    max: Math.min(d3.max(vals)!, q3 + 1.5*iqr),
    outliers: vals.filter(
      v => v < q1 - 1.5*iqr || v > q3 + 1.5*iqr
    )
  };
});`,
    python: `import pandas as pd
import numpy as np

df = pd.read_csv('data/sample_data/sales.csv')

stats = df.groupby('category')['total_amount'].describe(
  percentiles=[.25, .5, .75]
)
print(stats[['min','25%','50%','75%','max']].round(2))

# Find outliers per category
for cat, grp in df.groupby('category'):
  q1, q3 = grp['total_amount'].quantile([.25,.75])
  iqr = q3 - q1
  out = grp[
    (grp['total_amount'] < q1 - 1.5*iqr) |
    (grp['total_amount'] > q3 + 1.5*iqr)
  ]
  if len(out):
    print(f"{cat}: {len(out)} outliers")`,
    cli: `python3 -c "
import pandas as pd
df = pd.read_csv('data/sample_data/sales.csv')
print(df.groupby('category')['total_amount']
  .describe().round(2).to_string())
"`,
  },

  radar: {
    title: 'Radar / Spider Chart',
    description: 'Multi-metric comparison of average KPIs per product category.',
    react: `import * as d3 from 'd3';

const AXES = ['avg_quantity','avg_price',
              'avg_total','order_count'];

const angleSlice = (Math.PI * 2) / AXES.length;
const rScale = d3.scaleLinear()
  .domain([0, 1])   // normalized 0-1
  .range([0, radius]);

// Draw axis lines
AXES.forEach((ax, i) => {
  const angle = angleSlice * i - Math.PI / 2;
  svg.append('line')
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', cx + rScale(1) * Math.cos(angle))
    .attr('y2', cy + rScale(1) * Math.sin(angle));
});

// Draw polygon for each category
const lineGen = d3.lineRadial<number>()
  .radius(d => rScale(d))
  .angle((_, i) => i * angleSlice);

svg.append('path')
  .datum(values)
  .attr('d', lineGen as any)
  .attr('fill', color)
  .attr('fill-opacity', 0.25);`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')

metrics = df.groupby('category').agg(
  avg_quantity=('quantity',     'mean'),
  avg_price   =('unit_price',   'mean'),
  avg_total   =('total_amount', 'mean'),
  order_count =('order_id',     'count')
).reset_index()

# Normalize to 0-1 for radar
from sklearn.preprocessing import MinMaxScaler
cols = ['avg_quantity','avg_price',
        'avg_total','order_count']
metrics[cols] = MinMaxScaler().fit_transform(
  metrics[cols]
)
print(metrics.round(3))`,
    cli: `python3 -c "
import pandas as pd
df = pd.read_csv('data/sample_data/sales.csv')
print(df.groupby('category').agg(
  qty=('quantity','mean'),
  price=('unit_price','mean'),
  total=('total_amount','mean'),
  orders=('order_id','count')
).round(1).to_string())
"`,
  },

  network: {
    title: 'Network Graph',
    description: 'Schema relationship graph showing fact/dimension table connections.',
    react: `import * as d3 from 'd3';
// Fact tables (purple) vs dimension tables (teal)
const NODES = [
  { id: 'orders',     type: 'fact'      },
  { id: 'customers',  type: 'dimension' },
  { id: 'products',   type: 'dimension' },
  { id: 'categories', type: 'dimension' },
  { id: 'regions',    type: 'dimension' },
];

// Arrows on edges
svg.append('defs').append('marker')
  .attr('id', 'arrow')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 28).attr('refY', 0)
  .attr('markerWidth', 6)
  .attr('markerHeight', 6)
  .attr('orient', 'auto')
  .append('path')
  .attr('d', 'M0,-5L10,0L0,5')
  .attr('fill', GRID_COLOR);

// Node group: rect + label
nodeGroup.append('rect')
  .attr('fill', d =>
    d.type === 'fact'
      ? CHART_COLORS[0]
      : CHART_COLORS[2]
  );`,
    python: `import json

# Load and inspect schema
with open('data/sample_schemas/sales_schema.json') as f:
  schema = json.load(f)

# Extract relationships
rels = schema.get('relationships', [])
for r in rels:
  print(f"  {r['from']} --{r['key']}--> {r['to']}")

# Or use the schema processor
from src.schema_processor.relationship_mapper import (
  RelationshipMapper
)
mapper = RelationshipMapper(schema)
paths = mapper.find_paths('orders', 'categories')
print(paths)`,
    cli: `# Validate schema
curl -X POST http://localhost:8000/api/recommendations \\
  -H "Content-Type: application/json" \\
  -d @data/sample_schemas/sales_schema.json

# Run schema processor via CLI
python src/main.py \\
  --schema data/sample_schemas/sales_schema.json \\
  --data   data/sample_data/sales.csv \\
  --relationships "orders->customers:customer_id" \\
  --output data/generated_json/output.json`,
  },

  parallel: {
    title: 'Parallel Coordinates',
    description: 'Multi-dimensional exploration of employee metrics across departments.',
    react: `import * as d3 from 'd3';

const AXES = ['age','salary',
              'performance','tenure'];

// One vertical axis per metric
const yScales: Record<string, d3.ScaleLinear<number,number>> = {};
AXES.forEach(ax => {
  yScales[ax] = d3.scaleLinear()
    .domain(d3.extent(data, d => +d[ax]) as [number,number])
    .range([height, 0]);
});

const x = d3.scalePoint()
  .domain(AXES).range([0, width]);

// Draw polyline per record
const line = d3.line();
svg.selectAll('.pcp-line')
  .data(sample)
  .join('path')
  .attr('d', d =>
    line(AXES.map(ax =>
      [x(ax)!, yScales[ax](+d[ax] || 0)]
    ))
  )
  .attr('stroke', d => color(d.department))
  .attr('opacity', 0.45);`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/employees.csv')

# Normalize for parallel coords
from sklearn.preprocessing import MinMaxScaler
cols = ['age','salary','performance_score','tenure']
df_norm = df[cols].copy()
df_norm[cols] = MinMaxScaler().fit_transform(df[cols])
df_norm['department'] = df['department']

print(df_norm.head())
print("\\nCorrelation matrix:")
print(df[cols].corr().round(2))`,
    cli: `# Get employees data
curl http://localhost:8000/api/sample-data/employees \\
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'{len(d)} records')
print('Keys:', list(d[0].keys()))
"`,
  },

  stacked: {
    title: 'Stacked Area Chart',
    description: 'Category contribution to total revenue over time, stacked and filled.',
    react: `import * as d3 from 'd3';

// Stack by category
const stack = d3.stack()
  .keys(categories)
  .order(d3.stackOrderNone)
  .offset(d3.stackOffsetNone);

const series = stack(monthlyByCategory);

const area = d3.area<d3.SeriesPoint<any>>()
  .x(d => x(new Date(d.data.month + '-01')))
  .y0(d => y(d[0]))
  .y1(d => y(d[1]))
  .curve(d3.curveMonotoneX);

svg.selectAll('.layer')
  .data(series)
  .join('path')
  .attr('class', 'layer')
  .attr('fill', (_, i) =>
    CHART_COLORS[i % CHART_COLORS.length]
  )
  .attr('fill-opacity', 0.8)
  .attr('d', area);`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')
df['month'] = df['order_date'].str[:7]

# Monthly by category pivot
pivot = df.pivot_table(
  values='total_amount',
  index='month',
  columns='category',
  aggfunc='sum',
  fill_value=0
).reset_index().sort_values('month')

print(pivot.tail())

# Percentage contribution
totals = pivot.drop('month', axis=1).sum(axis=1)
pct = pivot.drop('month', axis=1).div(totals, axis=0)
print("\\nCategory share (last month):")
print(pct.iloc[-1].round(3).sort_values(ascending=False))`,
    cli: `python3 -c "
import pandas as pd
df = pd.read_csv('data/sample_data/sales.csv')
df['month'] = df['order_date'].str[:7]
print(
  df.pivot_table(
    values='total_amount',
    index='month', columns='category',
    aggfunc='sum', fill_value=0
  ).tail(3).round(0).to_string()
)
"`,
  },

  choropleth: {
    title: 'Choropleth Map',
    description: 'Geographic revenue distribution across US states (demo data).',
    react: `import * as d3 from 'd3';
// Requires GeoJSON — uses generated state totals
const projection = d3.geoAlbersUsa()
  .scale(900)
  .translate([W / 2, H / 2]);

const path = d3.geoPath().projection(projection);

const color = d3.scaleQuantize<string>()
  .domain([0, d3.max(Object.values(stateData))!])
  .range(d3.schemeBlues[7]);

svg.selectAll('path')
  .data(geoFeatures)
  .join('path')
  .attr('d', path as any)
  .attr('fill', d =>
    color(stateData[d.properties.name] ?? 0)
  )
  .attr('stroke', '#2d3148');`,
    python: `import pandas as pd

df = pd.read_csv('data/sample_data/sales.csv')

# Map region → simulated state totals
region_map = {
  'North': ['NY','PA','OH','MI','IL'],
  'South': ['TX','FL','GA','NC','VA'],
  'East':  ['MA','NJ','CT','MD','NH'],
  'West':  ['CA','WA','OR','NV','AZ'],
  'Central':['MN','WI','MO','IA','KS']
}

region_rev = df.groupby('region')['total_amount'].sum()
state_rev = {}
for region, states in region_map.items():
  per_state = region_rev.get(region, 0) / len(states)
  for s in states:
    state_rev[s] = round(per_state, 2)

import json
print(json.dumps(state_rev, indent=2))`,
    cli: `# Fetch state-level data
curl http://localhost:8000/api/sample-data/sales \\
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
regs = {}
for r in d:
  regs[r['region']] = regs.get(r['region'],0) + r['total_amount']
print(json.dumps({k:round(v,2) for k,v in regs.items()}, indent=2))
"`,
  },

  sunburst: {
    title: 'Sunburst Chart',
    description: 'Multi-level hierarchy: region → category → revenue with animated expand.',
    react: `import * as d3 from 'd3';

// Nested hierarchy
const root = d3.hierarchy(nestedData)
  .sum(d => (d as any).value)
  .sort((a, b) => b.value! - a.value!);

d3.partition().size([2 * Math.PI, radius])(root);

const arc = d3.arc<d3.HierarchyRectangularNode<any>>()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .innerRadius(d => Math.max(0, d.y0))
  .outerRadius(d => Math.max(0, d.y1 - 2));

svg.selectAll('path')
  .data(root.descendants().filter(d => d.depth))
  .join('path')
  .attr('d', arc)
  .attr('fill', d => {
    let n = d;
    while (n.depth > 1) n = n.parent!;
    return CHART_COLORS[topIdx % CHART_COLORS.length];
  })
  // Click to zoom
  .on('click', (_, d) => animateToNode(d));`,
    python: `import pandas as pd, json

df = pd.read_csv('data/sample_data/sales.csv')

def build_hierarchy(df):
  children = []
  for region, rg in df.groupby('region'):
    cats = []
    for cat, cg in rg.groupby('category'):
      cats.append({
        "name": cat,
        "value": round(cg['total_amount'].sum(), 2)
      })
    children.append({"name": region, "children": cats})
  return {"name": "Sales", "children": children}

hierarchy = build_hierarchy(df)
print(json.dumps(hierarchy, indent=2))`,
    cli: `python3 -c "
import pandas as pd, json
df = pd.read_csv('data/sample_data/sales.csv')
hier = {'name':'Sales','children':[
  {'name':r,'children':[
    {'name':c,'value':round(v,2)}
    for c,v in grp.groupby('category')['total_amount'].sum().items()
  ]}
  for r,grp in df.groupby('region')
]}
print(json.dumps(hier, indent=2))
"`,
  },
};
