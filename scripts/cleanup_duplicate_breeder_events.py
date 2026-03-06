#!/usr/bin/env python3
"""Clean duplicate breeder events for specific breeders and date.

This script targets duplicate rows in breeder_events and can optionally delete
extra rows through the admin delete endpoint.

Defaults are tuned for the current cleanup request:
- codes: \u79cd\u9f9f-7, XT-2, HB-2
- date: 2026-03-04
- event type: mating
- keep: earliest

Usage:
  # Dry run on prod (default mode)
  python3 scripts/cleanup_duplicate_breeder_events.py --env prod

  # Apply on prod (requires explicit confirm)
  python3 scripts/cleanup_duplicate_breeder_events.py --env prod --apply --confirm-prod

  # Custom codes/date and keep latest row per duplicate group
  python3 scripts/cleanup_duplicate_breeder_events.py \
    --env staging \
    --codes XT-2,HB-2 \
    --date 2026-03-04 \
    --event-type mating \
    --keep latest \
    --apply
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

DEFAULT_CODES = "\u79cd\u9f9f-7,XT-2,HB-2"
DEFAULT_DATE = "2026-03-04"


class CleanupError(RuntimeError):
    pass


def _strip_quotes(value: str) -> str:
    v = value.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in {'"', "'"}:
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
        key, val = s.split("=", 1)
        key = key.strip()
        if not key:
            continue
        os.environ.setdefault(key, _strip_quotes(val))
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


@dataclass
class DuplicatePlan:
    code: str
    product_id: str
    mode: str
    key: Tuple[Any, ...]
    keep_id: str
    delete_ids: List[str]
    all_ids: List[str]


class TurtleAlbumClient:
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token: Optional[str] = None

    def _headers(self, auth: bool = False) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if auth:
            if not self.token:
                raise CleanupError("Auth requested but token is missing")
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        auth: bool = False,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            resp = requests.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers=self._headers(auth=auth),
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise CleanupError(f"Request failed: {method} {url} -> {exc}") from exc

        try:
            body = resp.json() if resp.content else {}
        except ValueError:
            body = {"message": resp.text}

        if resp.status_code >= 400:
            detail = ""
            if isinstance(body, dict):
                detail = str(body.get("message") or body.get("detail") or "")
            if not detail:
                detail = resp.text or f"HTTP {resp.status_code}"
            raise CleanupError(f"HTTP {resp.status_code}: {detail}")

        if isinstance(body, dict) and body.get("success") is False:
            raise CleanupError(str(body.get("message") or "API returned success=false"))

        return body if isinstance(body, dict) else {}

    def login(self, username: str, password: str) -> None:
        body = self._request(
            "POST",
            "/api/auth/login",
            json_body={"username": username, "password": password},
            auth=False,
        )
        data = body.get("data") or {}
        token = data.get("token") or data.get("access_token") or data.get("accessToken")
        if not token:
            raise CleanupError("Login succeeded but token is missing")
        self.token = str(token)

    def find_product_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        body = self._request(
            "GET",
            "/api/products",
            params={"search": code, "page": 1, "limit": 200},
            auth=False,
        )
        data = body.get("data") or {}
        products = data.get("products") if isinstance(data, dict) else None
        if not isinstance(products, list):
            return None

        code_stripped = code.strip()
        for p in products:
            if str(p.get("code") or "").strip() == code_stripped:
                return p

        code_upper = code_stripped.upper()
        for p in products:
            if str(p.get("code") or "").strip().upper() == code_upper:
                return p

        return None

    def list_breeder_events(self, product_id: str, event_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        cursor: Optional[str] = None
        seen_cursors: set[str] = set()

        while True:
            params: Dict[str, Any] = {"type": event_type, "limit": limit}
            if cursor:
                params["cursor"] = cursor

            body = self._request(
                "GET",
                f"/api/breeders/{product_id}/events",
                params=params,
                auth=False,
            )
            data = body.get("data") or {}
            page_items = data.get("items") if isinstance(data, dict) else None
            if isinstance(page_items, list):
                items.extend(page_items)

            has_more = bool(data.get("hasMore")) if isinstance(data, dict) else False
            next_cursor = str(data.get("nextCursor") or "").strip() if isinstance(data, dict) else ""

            if not has_more:
                break
            if not next_cursor or next_cursor in seen_cursors:
                break

            seen_cursors.add(next_cursor)
            cursor = next_cursor

        return items

    def delete_breeder_event(self, event_id: str) -> None:
        self._request("DELETE", f"/api/admin/breeder-events/{event_id}", auth=True)


def _parse_codes(raw: str) -> List[str]:
    out: List[str] = []
    for token in (raw or "").split(","):
        code = token.strip()
        if code:
            out.append(code)
    deduped: List[str] = []
    seen: set[str] = set()
    for code in out:
        k = code.upper()
        if k in seen:
            continue
        seen.add(k)
        deduped.append(code)
    return deduped


def _parse_iso_datetime(value: Optional[str]) -> datetime:
    v = (value or "").strip()
    if not v:
        return datetime.min
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(v)
    except Exception:
        return datetime.min
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    return dt


def _event_day(event: Dict[str, Any]) -> str:
    event_date = str(event.get("eventDate") or "").strip()
    return event_date[:10]


def _norm_text(value: Any) -> str:
    return str(value or "").strip()


def _strict_key(event: Dict[str, Any]) -> Tuple[Any, ...]:
    return (
        _norm_text(event.get("eventType")),
        _event_day(event),
        _norm_text(event.get("maleCode")),
        event.get("eggCount"),
        _norm_text(event.get("oldMateCode")),
        _norm_text(event.get("newMateCode")),
        _norm_text(event.get("note")),
    )


def _broad_key(event: Dict[str, Any]) -> Tuple[Any, ...]:
    return (
        _norm_text(event.get("eventType")),
        _event_day(event),
        _norm_text(event.get("maleCode")),
    )


def _select_keep_and_delete(items: List[Dict[str, Any]], keep: str) -> Tuple[Optional[str], List[str], List[str]]:
    sortable = [it for it in items if _norm_text(it.get("id"))]
    sortable.sort(key=lambda e: (_parse_iso_datetime(e.get("createdAt")), _parse_iso_datetime(e.get("eventDate")), _norm_text(e.get("id"))))
    if not sortable:
        return (None, [], [])

    keep_item = sortable[0] if keep == "earliest" else sortable[-1]
    keep_id = _norm_text(keep_item.get("id"))

    all_ids = [_norm_text(it.get("id")) for it in sortable if _norm_text(it.get("id"))]
    delete_ids = [eid for eid in all_ids if eid != keep_id]
    return (keep_id, delete_ids, all_ids)


def _build_duplicate_plans(
    code: str,
    product_id: str,
    events: List[Dict[str, Any]],
    date_prefix: str,
    keep: str,
    event_type: str,
) -> List[DuplicatePlan]:
    """Build deletion plans.

    Grouping rule (per operator request):
    - Same day + same event type + same maleCode => keep only 1 record.

    We intentionally ignore note/eggCount/oldMateCode/newMateCode when grouping,
    because those may vary across retries and should not prevent de-duplication.
    """

    filtered = [
        e
        for e in events
        if _norm_text(e.get("eventType")) == event_type
        and _event_day(e) == date_prefix
        and _norm_text(e.get("id"))
    ]

    groups: Dict[Tuple[Any, ...], List[Dict[str, Any]]] = {}
    for e in filtered:
        groups.setdefault(_broad_key(e), []).append(e)

    plans: List[DuplicatePlan] = []

    for broad, items in groups.items():
        if len(items) <= 1:
            continue

        keep_id, delete_ids, all_ids = _select_keep_and_delete(items, keep=keep)
        if not keep_id or not delete_ids:
            continue

        plans.append(
            DuplicatePlan(
                code=code,
                product_id=product_id,
                mode="broad",
                key=broad,
                keep_id=keep_id,
                delete_ids=delete_ids,
                all_ids=all_ids,
            )
        )

    return plans


def _plan_match(plan: DuplicatePlan, event: Dict[str, Any]) -> bool:
    if plan.mode == "strict":
        return _strict_key(event) == plan.key
    return _broad_key(event) == plan.key


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Clean duplicate breeder_events rows for a target date")
    parser.add_argument("--env", choices=sorted(ENV_URLS.keys()), default="dev")
    parser.add_argument("--base-url", default=None)
    parser.add_argument("--apply", action="store_true", help="Actually delete duplicate rows")
    parser.add_argument("--confirm-prod", action="store_true", help="Required when --env prod and --apply")
    parser.add_argument("--codes", default=DEFAULT_CODES, help="Comma-separated breeder codes")
    parser.add_argument("--event-type", default="mating", help="Event type filter (default: mating)")
    parser.add_argument("--date", default=DEFAULT_DATE, help="Target date in YYYY-MM-DD")
    parser.add_argument("--keep", choices=["earliest", "latest"], default="earliest")
    parser.add_argument("--dotenv", default=None)
    parser.add_argument("--no-dotenv", action="store_true")

    args = parser.parse_args(argv)

    if len(args.date) != 10:
        print("Invalid --date; expected YYYY-MM-DD", file=sys.stderr)
        return 2
    try:
        datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        print("Invalid --date; expected YYYY-MM-DD", file=sys.stderr)
        return 2

    if args.apply and args.env == "prod" and not args.confirm_prod:
        print("Refusing to apply on prod without --confirm-prod", file=sys.stderr)
        return 2

    loaded_env = None
    if not args.no_dotenv:
        loaded_env = autoload_dotenv(explicit=args.dotenv)

    codes = _parse_codes(args.codes)
    if not codes:
        print("No breeder codes found. Pass --codes CODE1,CODE2", file=sys.stderr)
        return 2

    username = os.environ.get("TURTLEALBUM_ADMIN_USERNAME")
    password = os.environ.get("TURTLEALBUM_ADMIN_PASSWORD")
    if not username or not password:
        print("Missing TURTLEALBUM_ADMIN_USERNAME/PASSWORD in environment or .env", file=sys.stderr)
        return 2

    base_url = (args.base_url or ENV_URLS[args.env]).rstrip("/")

    print(f"Base URL: {base_url}")
    print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Codes: {', '.join(codes)}")
    print(f"Event type: {args.event_type}")
    print(f"Date: {args.date}")
    print(f"Keep: {args.keep}")
    if loaded_env:
        print(f"Loaded .env: {loaded_env}")

    client = TurtleAlbumClient(base_url=base_url)

    try:
        client.login(username=username, password=password)
    except CleanupError as exc:
        print(f"Login failed: {exc}", file=sys.stderr)
        return 1

    plans_by_product: Dict[str, List[DuplicatePlan]] = {}
    unresolved_codes: List[str] = []

    for code in codes:
        try:
            product = client.find_product_by_code(code)
        except CleanupError as exc:
            print(f"{code}: failed to search product -> {exc}", file=sys.stderr)
            return 1

        if not product:
            unresolved_codes.append(code)
            continue

        product_id = _norm_text(product.get("id"))
        if not product_id:
            unresolved_codes.append(code)
            continue

        try:
            events = client.list_breeder_events(product_id=product_id, event_type=args.event_type, limit=100)
        except CleanupError as exc:
            print(f"{code}: failed to list events -> {exc}", file=sys.stderr)
            return 1

        plans = _build_duplicate_plans(
            code=code,
            product_id=product_id,
            events=events,
            date_prefix=args.date,
            keep=args.keep,
            event_type=args.event_type,
        )
        plans_by_product[product_id] = plans

        dup_count = sum(len(p.delete_ids) for p in plans)
        print(f"{code} ({product_id}): duplicate groups={len(plans)}, rows_to_delete={dup_count}")
        for idx, plan in enumerate(plans, start=1):
            print(
                f"  group {idx}: mode={plan.mode}, keep={plan.keep_id}, "
                f"delete={','.join(plan.delete_ids)}"
            )

    if unresolved_codes:
        print(f"Could not resolve product code(s): {', '.join(unresolved_codes)}", file=sys.stderr)

    total_groups = sum(len(v) for v in plans_by_product.values())
    total_deletes = sum(len(p.delete_ids) for plans in plans_by_product.values() for p in plans)

    print(f"Total duplicate groups: {total_groups}")
    print(f"Total rows to delete: {total_deletes}")

    if total_groups == 0:
        return 0 if not unresolved_codes else 1

    if not args.apply:
        return 0 if not unresolved_codes else 1

    delete_errors: List[str] = []

    for product_id, plans in plans_by_product.items():
        for plan in plans:
            for event_id in plan.delete_ids:
                try:
                    client.delete_breeder_event(event_id)
                    print(f"Deleted event: {event_id}")
                except CleanupError as exc:
                    msg = f"Delete failed for {event_id} ({plan.code}): {exc}"
                    delete_errors.append(msg)
                    print(msg, file=sys.stderr)

    verify_errors: List[str] = []
    for product_id, plans in plans_by_product.items():
        if not plans:
            continue
        try:
            refreshed = client.list_breeder_events(product_id=product_id, event_type=args.event_type, limit=100)
        except CleanupError as exc:
            verify_errors.append(f"Verify fetch failed for product {product_id}: {exc}")
            continue

        filtered = [e for e in refreshed if _event_day(e) == args.date and _norm_text(e.get("eventType")) == args.event_type]

        for plan in plans:
            remain = [e for e in filtered if _plan_match(plan, e)]
            if len(remain) != 1:
                verify_errors.append(
                    f"Verify failed for {plan.code} group {plan.mode} key={plan.key}: remaining={len(remain)}"
                )

    if delete_errors:
        print(f"Delete errors: {len(delete_errors)}", file=sys.stderr)
    if verify_errors:
        print(f"Verify errors: {len(verify_errors)}", file=sys.stderr)

    for msg in delete_errors:
        print(msg, file=sys.stderr)
    for msg in verify_errors:
        print(msg, file=sys.stderr)

    if unresolved_codes or delete_errors or verify_errors:
        return 1

    print("Cleanup apply completed with verification OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
