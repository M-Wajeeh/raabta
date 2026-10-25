"""SQLite persistence layer for Raabta."""

import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "raabta.db"


def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create schema tables if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        raw_text TEXT NOT NULL,
        source_agency TEXT NOT NULL,
        source_url TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        affected_zones TEXT NOT NULL,
        onset_time TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        evidence_anchors TEXT NOT NULL,
        template_id TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_plans (
        id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        title TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        status TEXT NOT NULL,
        template_id TEXT NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        source_agency TEXT NOT NULL,
        source_url TEXT NOT NULL,
        evidence_anchors TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        task_code TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_to TEXT,
        volunteer_id TEXT,
        location_note TEXT,
        location_status TEXT NOT NULL,
        escalation_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES action_plans(id)
    );

    CREATE TABLE IF NOT EXISTS volunteers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        zone TEXT NOT NULL,
        phone_masked TEXT NOT NULL,
        is_available INTEGER NOT NULL DEFAULT 1,
        active_tasks_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS incident_reports (
        id TEXT PRIMARY KEY,
        hazard_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location_zone TEXT NOT NULL,
        status TEXT NOT NULL,
        reported_at TEXT NOT NULL,
        verified_by TEXT,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS assembly_points (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        zone TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT NOT NULL,
        verified_by TEXT,
        capacity_estimate INTEGER NOT NULL DEFAULT 150
    );
    """)

    conn.commit()
    conn.close()


def reset_database():
    """Drop and recreate all tables for scenario reset."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.executescript("""
        DROP TABLE IF EXISTS tasks;
        DROP TABLE IF EXISTS action_plans;
        DROP TABLE IF EXISTS alerts;
        DROP TABLE IF EXISTS volunteers;
        DROP TABLE IF EXISTS incident_reports;
        DROP TABLE IF EXISTS assembly_points;
        """)
        conn.commit()
    finally:
        conn.close()
    init_db()
