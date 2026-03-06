#!/usr/bin/env python3
"""Clean up duplicate breeder_events for a breeder/day.

Use case:
- Operators may accidentally create duplicate events (e.g. retry / double-submit).
- For the same breeder + same day + same event payload, keep only one record.

Safety:
- Default is dry-run.
- PROD writes require --apply --confirm-prod.

Examples:
  # Dry-run (prod)
  python3 scripts/cleanup_duplicate_breeder_events.py --env prod \
    --codes "HB-2,XT-2" --date 2026-03-04 --event-type mating

  # Apply (prod)
  python3 scripts/cleanup_duplicate_breeder_events.py --env prod --apply --confirm-prod \
    --codes "HB-2,XT-2" --date 2026-03-04 --event-type mating

Notes:
- Deletion uses admin endpoint: DELETE /api/admin/breeder-events/{event_id}
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

ENV_URLS = {
    "dev": "http://localhost:8000",
    "staging": "https://staging.turtlealbum.com",
    "prod": "https://qmngzrlhklmt.sealoshzh.site",
}


def _strip_quotes(v: str) -> str:
    v = v.strip()
    if (len(v) >= 2) and (v[0] == v[-1]) and (v[0] in {"\"", "'"}):
        return v[1:-1]
    return v


def load_dotenv(path: Path) -> bool:
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return False

    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith("export "):
            s = s[len("export ") :].lstrip()
        if "=" not in s:
            continue
        k, v = s.split("=", 1)
        k = k.strip()
        if not k:
            continue
        os.environ.setdefault(k, _strip_quotes(v))
    return True


def autoload_dotenv(explicit: Optional[str] = None) -> Optional[Path]:
    candidates: List[Path] = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    else:
        candidates.extend([Path.cwd() / ".env", Path(__file__).resolve().parent.parent / ".env"])

    for p in candidates:
        if load_dotenv(p):
            return p
    return None


class API:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token: Optional[str] = None

    def _headers(self, *, auth: bool) -> Dict[str, str]:
        if not auth:
            return {"Content-Type": "application/json"}
        if not self.token:
            raise RuntimeError("Missing token")
        t = self.token.strip()
        if not t.lower().startswith("bearer "):
            t = f"Bearer {t}"
        return {"Authorization": t, "Content-Type": "application/json"}

    def login(self, username: str, password: str) -> None:
        r = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password},
            timeout=30,
        )
        r.raise_for_status()
        payload = r.json() or {}
        data = payload.get("data") or payload
        token = data.get("token") or data.get("access_token") or data.get("accessToken")
        if not token:
            raise RuntimeError("Login succeeded but token missing")
        self.token = str(token)

    def list_products_by_search(self, search: str) -> List[Dict[str, Any]]:
        r = requests.get(
            f"{self.base_url}/api/products",
            params={"search": search, "page": 1, "limit": 1000},
            headers=self._headers(auth=True),
            timeout=30,
        )
        r.raise_for_status()
        data = (r.json() or {}).get("data") or {}
        return data.get("products") or []

    def get_breeder_events(self, breeder_id: str, *, event_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        if limit > 100:
            raise ValueError("limit must be <= 100")
        r = requests.get(
            f"{self.base_url}/api/breeders/{breeder_id}/events",
            params={"type": event_type, "limit": limit},
            headers=self._headers(auth=True),
            timeout=30,
        )
        r.raise_for_status()
        data = (r.json() or {}).get("data") or {}
        return data.get("items") or []

    def delete_breeder_event(self, event_id: str) -> None:
        r = requests.delete(
            f"{self.base_url}/api/admin/breeder-events/{event_id}",
            headers=self._headers(auth=True),
            timeout=30,
        )
        if r.status_code == 404:
            raise RuntimeError("Delete endpoint not found (not deployed yet?)")
        r.raise_for_status()


def _normalize_code(value: str) -> str:
    return (value or "").strip().upper()


@dataclass
class Target:
    code: str
    product_id: str


def _pick_target_product(products: List[Dict[str, Any]], *, code: str) -> Target:
    wanted = _normalize_code(code)
    exact = [p for p in products if _normalize_code(str(p.get("code") or "")) == wanted]
    if not exact:
        raise RuntimeError(f"No product found with exact code match: {code}")
    if len(exact) > 1:
        ids = [str(p.get("id") or "").strip() for p in exact]
        raise RuntimeError(
            "Multiple products matched the same code. Disambiguate by using a unique code. "
            f"Candidates: {', '.join([i for i in ids if i])}"
        )
    pid = str(exact[0].get("id") or "").strip()
    if not pid:
        raise RuntimeError("Matched product has no id")
    return Target(code=str(exact[0].get("code") or code), product_id=pid)


def _parse_iso_dt(s: str) -> Tuple[Optional[datetime], str]:
    raw = (s or "").strip()
    if not raw:
        return (None, "")
    v = raw
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(v)
    except Exception:
        return (None, raw)
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    return (dt, raw)


def _event_key(ev: Dict[str, Any], *, date_only: str) -> Tuple[Any, ...]:
    # "Same day + same event". Keep the key conservative to avoid deleting legitimate distinct events.
    return (
        str(ev.get("eventType") or ""),
        date_only,
        str(ev.get("maleCode") or ""),
        ev.get("eggCount"),
        str(ev.get("oldMateCode") or ""),
        str(ev.get("newMateCode") or ""),
        str(ev.get("note") or ""),
    )


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Cleanup duplicate breeder_events by breeder/day")
    p.add_argument("--env", choices=["dev", "staging", "prod"], default="dev")
    p.add_argument("--base-url", help="Override base URL")

    default_username = os.environ.get("TURTLEALBUM_ADMIN_USERNAME") or "admin"
    p.add_argument("--username", default=default_username)
    p.add_argument(
        "--password",
        default=os.environ.get("TURTLEALBUM_ADMIN_PASSWORD"),
        help="If omitted, uses env TURTLEALBUM_ADMIN_PASSWORD",
    )
    p.add_argument("--dotenv", help="Optional explicit .env path")

    p.add_argument("--codes", required=True, help="Comma-separated breeder codes, e.g. 'HB-2,XT-2'")
    p.add_argument("--event-type", default="mating", help="mating|egg|change_mate")
    p.add_argument("--date", required=True, help="YYYY-MM-DD")
    p.add_argument("--keep", choices=["earliest", "latest"], default="earliest")

    p.add_argument("--apply", action="store_true")
    p.add_argument("--confirm-prod", action="store_true")

    return p


def main() -> int:
    args = build_parser().parse_args()

    autoload_dotenv(args.dotenv)

    base_url = (args.base_url or ENV_URLS.get(args.env) or "").strip()
    if not base_url:
        print(f"ERROR: unknown env={args.env}", file=sys.stderr)
        return 2

    if args.apply and args.env == "prod" and not args.confirm_prod:
        print("ERROR: refusing prod write without --confirm-prod", file=sys.stderr)
        return 2

    password = (args.password or "").strip()
    if not password:
        print("ERROR: missing password (set TURTLEALBUM_ADMIN_PASSWORD or pass --password)", file=sys.stderr)
        return 2

    api = API(base_url)
    api.login(args.username, password)

    codes = [c.strip() for c in str(args.codes or "").split(",") if c.strip()]
    if not codes:
        print("ERROR: empty --codes", file=sys.stderr)
        return 2

    # Validate date
    try:
        dt = datetime.fromisoformat(args.date)
        date_only = dt.date().isoformat()
    except Exception:
        print("ERROR: --date must be YYYY-MM-DD", file=sys.stderr)
        return 2

    any_changes = False

    for raw_code in codes:
        products = api.list_products_by_search(raw_code)
        target = _pick_target_product(products, code=raw_code)

        items = api.get_breeder_events(target.product_id, event_type=args.event_type, limit=100)
        day_items = [e for e in items if str(e.get("eventDate") or "").startswith(date_only)]

        # Group possible duplicates.
        groups: Dict[Tuple[Any, ...], List[Dict[str, Any]]] = {}
        for e in day_items:
            k = _event_key(e, date_only=date_only)
            groups.setdefault(k, []).append(e)

        print(f"\n== {target.code} ({target.product_id}) {args.event_type} {date_only} ==")
        if not day_items:
            print("No events on that day")
            continue

        for k, evs in groups.items():
            if len(evs) <= 1:
                continue

            def sort_key(ev: Dict[str, Any]):
                created = str(ev.get("createdAt") or "")
                parsed, _raw = _parse_iso_dt(created)
                # If createdAt missing/unparseable, fall back to string.
                return (parsed or datetime.max, created, str(ev.get("id") or ""))

            evs_sorted = sorted(evs, key=sort_key)
            if args.keep == "latest":
                keep_ev = evs_sorted[-1]
                del_evs = evs_sorted[:-1]
            else:
                keep_ev = evs_sorted[0]
                del_evs = evs_sorted[1:]

            print(f"Duplicate group: count={len(evs)} keep={keep_ev.get('id')}")
            for ev in evs_sorted:
                print(
                    f"  - id={ev.get('id')} male={ev.get('maleCode') or ''} createdAt={ev.get('createdAt') or ''}"
                )

            if args.apply:
                for ev in del_evs:
                    eid = str(ev.get("id") or "").strip()
                    if not eid:
                        raise RuntimeError("Event missing id")
                    api.delete_breeder_event(eid)
                    any_changes = True
                    print(f"  DELETE ok: {eid}")

        if args.apply and any_changes:
            rb = api.get_breeder_events(target.product_id, event_type=args.event_type, limit=100)
            rb_day = [e for e in rb if str(e.get("eventDate") or "").startswith(date_only)]
            # Print remaining count for quick verification.
            print(f"Readback remaining on day: {len(rb_day)}")

    if not args.apply:
        print("\nDry run only. Re-run with --apply to delete duplicates.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
