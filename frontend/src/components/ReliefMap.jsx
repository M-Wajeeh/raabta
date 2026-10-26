import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PAKISTAN_BOUNDS, OPS_BOUNDS, DEPOTS, ZONE_PINS, RUN_STATUS } from '../scenario';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const MAX_FLOOD_KM2 = 1700;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pin = (markClass, text) => L.divIcon({
  className: 'rl-pin',
  html: `<span class="rl-pin-mark ${markClass}"></span>${text ? `<span class="rl-pin-label">${esc(text)}</span>` : ''}`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const toLatLngs = (coords) => coords.map(([lng, lat]) => [lat, lng]);

function districtStyle(feature) {
  const km2 = feature.properties.floodKm2 || 0;
  return {
    color: '#FFFFFF',
    weight: 0.7,
    opacity: 0.35,
    fillColor: '#FF8A3D',
    fillOpacity: Math.min(0.5, (km2 / MAX_FLOOD_KM2) * 0.5)
  };
}

export default function ReliefMap({ districts, routes, locations, reports, runs, selectedRunId, onSelectRun, focus }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const districtLayersRef = useRef({});
  const opsRef = useRef(null);

  useEffect(() => {
    const map = L.map(elRef.current, {
      minZoom: 5,
      maxBounds: L.latLngBounds(PAKISTAN_BOUNDS).pad(0.4)
    });
    map.createPane('districts').style.zIndex = 350;
    map.createPane('flood').style.zIndex = 380;
    map.createPane('placeLabels').style.zIndex = 390;
    map.getPane('placeLabels').style.pointerEvents = 'none';
    map.createPane('routes').style.zIndex = 420;

    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 17,
      className: 'rl-basemap',
      attribution: 'Imagery &copy; Esri'
    }).addTo(map);
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 17,
      pane: 'placeLabels'
    }).addTo(map);
    L.imageOverlay('/data/flood-2025.png', PAKISTAN_BOUNDS, {
      pane: 'flood',
      attribution: 'Floodwater: UNOSAT, VIIRS, 26 Aug to 7 Sep 2025 (preliminary)'
    }).addTo(map);

    // Pin labels crowd each other at country scale; show them once zoomed in.
    const toggleLabels = () => elRef.current?.classList.toggle('rl-far', map.getZoom() < 8);
    map.on('zoomend', toggleLabels);
    map.fitBounds(PAKISTAN_BOUNDS);
    toggleLabels();
    opsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !districts) return;
    const layer = L.geoJSON(districts, {
      pane: 'districts',
      style: districtStyle,
      attribution: 'District borders: OCHA and WFP',
      onEachFeature: (feature, lyr) => {
        const { name, province, floodKm2 } = feature.properties;
        districtLayersRef.current[name] = lyr;
        lyr.bindTooltip(
          `<strong>${esc(name)}</strong>, ${esc(province)}<br>${floodKm2 > 0 ? `About ${floodKm2.toLocaleString()} km² under water` : 'No flooding detected'}`,
          { sticky: true, className: 'rl-tooltip' }
        );
        lyr.on('click', () => map.flyToBounds(lyr.getBounds(), { padding: [30, 30] }));
      }
    }).addTo(map);
    return () => {
      layer.remove();
      districtLayersRef.current = {};
    };
  }, [districts]);

  useEffect(() => {
    const group = opsRef.current;
    if (!group || !routes) return;
    group.clearLayers();

    runs.forEach((run) => {
      const route = routes.features.find((f) => f.properties.id === run.id && f.properties.kind === 'route');
      if (!route) return;
      const line = toLatLngs(route.geometry.coordinates);
      // A blocked run keeps the route colour; only the flooded stretch is drawn in red.
      const color = run.status === 'blocked' ? RUN_STATUS.enroute.color : RUN_STATUS[run.status].color;
      const selected = run.id === selectedRunId;
      L.polyline(line, { pane: 'routes', color: '#0E1317', weight: selected ? 11 : 8, opacity: 0.9 }).addTo(group);
      L.polyline(line, {
        pane: 'routes',
        color,
        weight: selected ? 6 : 4,
        dashArray: run.status === 'ready' ? '10 8' : null
      }).on('click', () => onSelectRun(run.id)).addTo(group);

      const flooded = routes.features.find((f) => f.properties.id === run.id && f.properties.kind === 'flooded');
      if (flooded) {
        flooded.geometry.coordinates.forEach((part) => {
          L.polyline(toLatLngs(part), { pane: 'routes', color: '#FF6B57', weight: 6, dashArray: '2 9' }).addTo(group);
        });
      }
      if (run.status === 'enroute') {
        L.marker(line[Math.floor(line.length / 2)], { icon: pin('rl-mark-convoy', 'Convoy') }).addTo(group);
      }
    });

    DEPOTS.forEach((d) => L.marker([d.lat, d.lng], { icon: pin('rl-mark-depot', d.name) }).addTo(group));

    locations.forEach((loc) => {
      const campRuns = runs.filter((r) => r.campId === loc.id);
      const worst = ['blocked', 'ready', 'boat', 'enroute', 'delivered'].find((s) => campRuns.some((r) => r.status === s));
      const marker = L.marker([loc.lat, loc.lng], { icon: pin('rl-mark-camp', loc.name) }).addTo(group);
      marker.getElement()?.style.setProperty('--ring', worst ? RUN_STATUS[worst].color : '#FFFFFF');
      marker.bindTooltip(
        `<strong>${esc(loc.name)}</strong><br>Not verified as safe: ${esc(loc.status)}<br>Room for about ${esc(loc.capacity_estimate)} people`,
        { className: 'rl-tooltip', direction: 'top', offset: [0, -10] }
      );
    });

    reports.forEach((rep) => {
      const at = ZONE_PINS[rep.location_zone];
      if (!at) return;
      const unverified = rep.status === 'UNVERIFIED';
      L.marker(at, { icon: pin(unverified ? 'rl-mark-report' : 'rl-mark-report rl-verified', unverified ? 'Not verified' : 'Verified') })
        .bindTooltip(`<strong>${esc(rep.title)}</strong><br>${esc(rep.description)}`, { className: 'rl-tooltip', direction: 'top', offset: [0, -10] })
        .addTo(group);
    });
  }, [routes, locations, reports, runs, selectedRunId, onSelectRun]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    if (focus.kind === 'pakistan') map.flyToBounds(PAKISTAN_BOUNDS);
    if (focus.kind === 'ops') map.flyToBounds(OPS_BOUNDS);
    if (focus.kind === 'district') {
      const lyr = districtLayersRef.current[focus.name];
      if (lyr) map.flyToBounds(lyr.getBounds(), { padding: [30, 30] });
    }
  }, [focus]);

  return <div ref={elRef} className="rl-map" role="region" aria-label="Flood and relief map of Pakistan" />;
}
