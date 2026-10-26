"""Build the bundled map layers for the Pakistan 2025 flood scenario.

Writes to frontend/public/data/:
  flood-2025.png    satellite-detected floodwater over Pakistan (UNOSAT, VIIRS, 26 Aug - 7 Sep 2025)
  districts.geojson all district borders (OCHA / WFP COD-AB, via UNOSAT baseline service), simplified,
                    each with the flooded area (km2) measured from the layer above
  routes.geojson    sample supply routes on real roads (OpenStreetMap via the public OSRM server),
                    with the stretches that cross detected floodwater

Layers are bundled so the map works offline. Needs network, Pillow and numpy:
  python scripts/build_map_layers.py
"""
import io
import json
import math
import os
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data")
W_LON, E_LON, S_LAT, N_LAT = 60.8, 77.9, 23.6, 37.1  # Pakistan
WIDTH = 4000  # about 370 m per pixel, close to VIIRS resolution
UNOSAT = "https://unosat-rm.cern.ch/server/rest/services/FloodVIIRS"

# Sample supply runs (depot -> camp). Endpoints are town centres; OSRM snaps them to roads.
ROUTES = {
    "multan-jalalpur": [(71.4785, 30.1968), (71.2203, 29.5052)],
    "multan-shujabad": [(71.4785, 30.1968), (71.2930, 29.8803)],
    "muzaffargarh-alipur": [(71.1932, 30.0703), (70.9120, 29.3826)],
}


def merc(lon, lat):
    return lon * 20037508.34 / 180, math.log(math.tan((90 + lat) * math.pi / 360)) * 20037508.34 / math.pi


X0, Y0 = merc(W_LON, S_LAT)
X1, Y1 = merc(E_LON, N_LAT)
HEIGHT = round(WIDTH * (Y1 - Y0) / (X1 - X0))
MERC_PX = (X1 - X0) / WIDTH  # mercator metres per pixel; true size shrinks by cos(latitude)


def lat_of_row(row):
    y = Y1 - (row + 0.5) / HEIGHT * (Y1 - Y0)
    return math.degrees(2 * math.atan(math.exp(y * math.pi / 20037508.34)) - math.pi / 2)


ROW_KM2 = np.array([(MERC_PX * math.cos(math.radians(lat_of_row(r))) / 1000) ** 2 for r in range(HEIGHT)])


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "raabta-map-layers/1.0"})
    return urllib.request.urlopen(req, timeout=120).read()


def to_px(lon, lat):
    x, y = merc(lon, lat)
    return (x - X0) / (X1 - X0) * WIDTH, (Y1 - y) / (Y1 - Y0) * HEIGHT


def build_flood():
    common = f"bbox={X0},{Y0},{X1},{Y1}&bboxSR=3857&imageSR=3857&size={WIDTH},{HEIGHT}"
    flood = np.asarray(Image.open(io.BytesIO(get(
        f"{UNOSAT}/VIIRS20250909PAK/ImageServer/exportImage?{common}&format=png&f=image"))).convert("L")) > 64
    perm = np.asarray(Image.open(io.BytesIO(get(
        f"{UNOSAT}/VIIRS20250909PAK_PermanentWater/MapServer/export?{common}&format=png32&transparent=true&f=image"
    ))).convert("RGBA"))[..., 3] > 0
    flood_only = flood & ~perm
    rgba = np.zeros((HEIGHT, WIDTH, 4), dtype="uint8")
    rgba[flood_only] = (64, 200, 255, 175)
    rgba[perm] = (22, 92, 170, 215)
    Image.fromarray(rgba).save(os.path.join(OUT, "flood-2025.png"), optimize=True)
    return flood_only


def build_districts(flood_only):
    data = json.loads(get(
        f"{UNOSAT}/VIIRS20250909PAK_Baseline/MapServer/6/query?where=1%3D1"
        "&outFields=ADM2_EN,ADM1_EN&outSR=4326&maxAllowableOffset=0.005&f=geojson"))
    for f in data["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        mask = Image.new("1", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(mask)
        for poly in polys:
            draw.polygon([to_px(x, y) for x, y in poly[0]], fill=1)
            for hole in poly[1:]:
                draw.polygon([to_px(x, y) for x, y in hole], fill=0)
        inside = np.asarray(mask) & flood_only
        flood_km2 = float((inside.sum(axis=1) * ROW_KM2).sum())
        polys = [[[[round(x, 3), round(y, 3)] for x, y in ring] for ring in poly] for poly in polys]
        f["geometry"] = {"type": "MultiPolygon", "coordinates": polys}
        f["properties"] = {"name": f["properties"].get("ADM2_EN"), "province": f["properties"].get("ADM1_EN"),
                           "floodKm2": round(flood_km2)}
    top = sorted(data["features"], key=lambda f: -f["properties"]["floodKm2"])[:8]
    print("most flooded:", [(f["properties"]["name"], f["properties"]["floodKm2"]) for f in top])
    with open(os.path.join(OUT, "districts.geojson"), "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": data["features"]}, fh, separators=(",", ":"))


def build_routes(flood_only):
    features = []
    for route_id, pts in ROUTES.items():
        coords = ";".join(f"{lon},{lat}" for lon, lat in pts)
        r = json.loads(get(f"https://router.project-osrm.org/route/v1/driving/{coords}"
                           "?overview=full&geometries=geojson"))["routes"][0]
        line = [[round(x, 5), round(y, 5)] for x, y in r["geometry"]["coordinates"]]
        wet_runs, run, wet_m = [], [], 0.0
        for a, b in zip(line, line[1:]):
            (ax, ay), (bx, by) = to_px(*a), to_px(*b)
            mx, my = int((ax + bx) / 2), int((ay + by) / 2)
            wet = 0 <= my < HEIGHT and 0 <= mx < WIDTH and flood_only[my, mx]
            if wet:
                wet_m += math.hypot(bx - ax, by - ay) * MERC_PX * math.cos(math.radians(a[1]))
                run = run or [a]
                run.append(b)
            elif run:
                wet_runs.append(run)
                run = []
        if run:
            wet_runs.append(run)
        features.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": line},
                         "properties": {"id": route_id, "kind": "route", "km": round(r["distance"] / 1000, 1),
                                        "minutes": round(r["duration"] / 60), "kmInFlood": round(wet_m / 1000, 1)}})
        if wet_runs:
            features.append({"type": "Feature", "geometry": {"type": "MultiLineString", "coordinates": wet_runs},
                             "properties": {"id": route_id, "kind": "flooded"}})
        print(route_id, features[-1]["properties"] if not wet_runs else features[-2]["properties"])
    with open(os.path.join(OUT, "routes.geojson"), "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh, separators=(",", ":"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    mask = build_flood()
    print(f"flooded area in frame: {(mask.sum(axis=1) * ROW_KM2).sum():,.0f} km2")
    build_districts(mask)
    build_routes(mask)
    print("bounds [[S, W], [N, E]]:", [[S_LAT, W_LON], [N_LAT, E_LON]])
