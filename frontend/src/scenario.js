// Map frame and sample relief operations for the 2025 Punjab flood demo.
// Real layers (floodwater, district borders, road routes) are built by scripts/build_map_layers.py
// into public/data. Depots, stock, camp needs and supply runs below are SAMPLE data.

export const PAKISTAN_BOUNDS = [[23.6, 60.8], [37.1, 77.9]];
export const OPS_BOUNDS = [[29.3, 70.75], [30.3, 71.75]];

export const DEPOTS = [
  { id: 'multan', name: 'Multan depot', lat: 30.1968, lng: 71.4785 },
  { id: 'muzaffargarh', name: 'Muzaffargarh depot', lat: 30.0703, lng: 71.1932 }
];

// Food packs needed per camp, keyed by the seeded assembly point ids (backend/app/seed.py).
export const CAMP_NEEDS = { 'pt-01': 600, 'pt-02': 900, 'pt-03': 500 };

// Where to pin community reports, by the zone named in the report.
export const ZONE_PINS = {
  'Jalalpur Pirwala': [29.455, 71.26],
  Shujabad: [29.86, 71.42]
};

// Route ids match the features in public/data/routes.geojson.
export const SUPPLY_RUNS = [
  { id: 'multan-jalalpur', from: 'multan', campId: 'pt-02', load: '400 tents and 900 food packs', foodPacks: 900, status: 'blocked' },
  { id: 'multan-shujabad', from: 'multan', campId: 'pt-01', load: '250 food packs and 6,000 litres of water', foodPacks: 250, status: 'enroute', driver: 'Bilal Ahmed' },
  { id: 'muzaffargarh-alipur', from: 'muzaffargarh', campId: 'pt-03', load: '500 food packs', foodPacks: 500, status: 'ready' }
];

export const RUN_STATUS = {
  ready: { label: 'Ready to send', color: '#C9D3DA' },
  enroute: { label: 'On the way', color: '#F2A93B' },
  blocked: { label: 'Blocked by water', color: '#FF6B57' },
  boat: { label: 'Boat transfer planned', color: '#7FD3FF' },
  delivered: { label: 'Delivered', color: '#5BD18B' }
};
