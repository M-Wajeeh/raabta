import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Map, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function MapView({ locations = [], reports = [] }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      // Initialize map centered at Riverside District (31.5204, 74.3587)
      const map = L.map(mapRef.current).setView([31.5204, 74.3587], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Custom Icons using SVG
    const assemblyIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background: #0284c7; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.5); color: #fff; font-size: 14px;">📍</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    const hazardIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background: #ef4444; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(239,68,68,0.7); color: #fff; font-size: 14px;">⚠️</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    // Add Assembly Points (Strictly verification required)
    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], { icon: assemblyIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0b1120;">
          <strong style="font-size: 14px; color: #0284c7;">${loc.name}</strong><br/>
          <span style="display: inline-block; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 3px; font-weight: bold; margin: 4px 0;">
            ${loc.status}
          </span><br/>
          <span>Zone: ${loc.zone}</span><br/>
          <span>Capacity: ~${loc.capacity_estimate} persons</span>
        </div>
      `);
      markersRef.current.push(marker);
    });

    // Add Incident Reports (Canal road obstruction / needs)
    const reportCoords = [
      { lat: 31.5160, lng: 74.3510 },
      { lat: 31.5280, lng: 74.3550 }
    ];

    reports.forEach((rep, idx) => {
      const coord = reportCoords[idx % reportCoords.length];
      const marker = L.marker([coord.lat, coord.lng], { icon: hazardIcon }).addTo(map);
      const isVer = rep.status === 'VERIFIED';
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0b1120;">
          <strong style="font-size: 13px; color: #ef4444;">${rep.title}</strong><br/>
          <span style="display: inline-block; background: ${isVer ? '#d1fae5' : '#fee2e2'}; color: ${isVer ? '#065f46' : '#991b1b'}; padding: 2px 6px; border-radius: 3px; font-weight: bold; margin: 4px 0;">
            Status: ${rep.status}
          </span><br/>
          <p style="margin: 4px 0;">${rep.description}</p>
          <small style="color: #64748b;">Zone: ${rep.location_zone}</small>
        </div>
      `);
      markersRef.current.push(marker);
    });
  }, [locations, reports]);

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Map size={18} color="var(--accent-cyan)" />
          <span>Operational Spatial Awareness</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Riverside Community District
        </div>
      </div>

      <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#bae6fd' }}>
        <strong>Designation Notice:</strong> Locations on map are marked <em>"designated assembly point — verification required"</em> until physical clearance is confirmed by local authorities.
      </div>

      <div ref={mapRef} className="map-container" />

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-sub)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>📍</span> <span>Designated Assembly Point (Verification Required)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>⚠️</span> <span>Reported Route Obstruction / Need (Unverified/Verified)</span>
        </div>
      </div>
    </div>
  );
}
