import argparse
import os
import shutil
from datetime import datetime, timedelta
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Importing models defines Base + tables.
from app.models.models import Base, Series, Product, ProductImage, MatingRecord, EggRecord
from app.core.security import get_password_hash


def _utc_now():
    return datetime.utcnow()


def _make_engine(db_url: str):
    return create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
    )


def _backup_existing(path: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    bak = f"{path}.{ts}.bak"
    shutil.move(path, bak)
    return bak


def seed_turtle_album(db_session):
    """Insert small, deterministic-ish sample data for local dev.

    Keep fields minimal but realistic for the turtle-album UI:
    - 2 series
    - several breeders (products) with sex + lineage
    - a couple mating records + egg records
    """

    # Series
    s1 = Series(name="CB-2026", sort_order=1, is_active=True)
    s2 = Series(name="High-Contrast", sort_order=2, is_active=True)
    db_session.add_all([s1, s2])
    db_session.flush()  # get ids

    def breeder(
        *,
        series,
        name,
        code,
        sex,
        price=None,
        sire_code=None,
        dam_code=None,
    ):
        p = Product(
            name=name,
            code=code,
            description=f"Demo breeder {code}",
            series_id=series.id,
            sex=sex,
            offspring_unit_price=price,
            sire_code=sire_code,
            dam_code=dam_code,
            # legacy-required product fields
            shape="turtle",
            material="n/a",
            factory_price=0.0,
            in_stock=True,
            is_featured=False,
        )
        db_session.add(p)
        db_session.flush()
        db_session.add(
            ProductImage(
                product_id=p.id,
                url="/static/images/demo-turtle.webp",
                alt=f"{code} main",
                type="main",
                sort_order=0,
            )
        )
        return p

    f1 = breeder(series=s1, name="CB Female #1", code="CBF-001", sex="female", price=1999.0)
    m1 = breeder(series=s1, name="CB Male #1", code="CBM-001", sex="male")
    f2 = breeder(series=s1, name="CB Female #2", code="CBF-002", sex="female", price=2499.0, sire_code="CBM-001")
    m2 = breeder(series=s2, name="HC Male #1", code="HCM-001", sex="male")

    # Records
    db_session.add(
        MatingRecord(
            female_id=f1.id,
            male_id=m1.id,
            mated_at=_utc_now() - timedelta(days=14),
            notes="Demo mating record",
        )
    )
    db_session.add(
        EggRecord(
            female_id=f1.id,
            laid_at=_utc_now() - timedelta(days=3),
            count=6,
            notes="Demo egg record",
        )
    )

    db_session.commit()


def main():
    parser = argparse.ArgumentParser(description="Init a branch-isolated sqlite DB for turtle-album.")
    parser.add_argument(
        "--db-path",
        default="./turtle_album.db",
        help="SQLite DB file path (relative to backend/ when run there).",
    )
    parser.add_argument("--reset", action="store_true", help="Backup and recreate if DB exists.")
    parser.add_argument("--seed", action="store_true", help="Insert demo data after creating tables.")
    parser.add_argument(
        "--admin-username",
        default=os.getenv("ADMIN_USERNAME", "admin"),
        help="Admin username to create when seeding.",
    )
    parser.add_argument(
        "--admin-password",
        default=os.getenv("ADMIN_PASSWORD", "admin123"),
        help="Admin password to create when seeding.",
    )

    args = parser.parse_args()

    db_path = args.db_path
    if not db_path.startswith("sqlite:"):
        # Normalize to a sqlite URL.
        if db_path.startswith("./"):
            db_url = f"sqlite:///{db_path}"
        else:
            db_url = f"sqlite:///{db_path}"
    else:
        db_url = db_path

    # If user passed a file path, handle backup/reset on the filesystem.
    if db_url.startswith("sqlite:///"):
        file_path = db_url.replace("sqlite:///", "", 1)
        if os.path.exists(file_path):
            if not args.reset:
                raise SystemExit(f"DB already exists: {file_path} (use --reset to recreate)")
            bak = _backup_existing(file_path)
            print(f"Backed up existing DB -> {bak}")

    engine = _make_engine(db_url)
    Base.metadata.create_all(bind=engine)
    print(f"Created tables for: {db_url}")

    if args.seed:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        try:
            # Create admin user in the same DB for convenience.
            from app.models.models import User

            existing = db.query(User).filter(User.username == args.admin_username).first()
            if not existing:
                db.add(
                    User(
                        id=str(uuid.uuid4()),
                        username=args.admin_username,
                        hashed_password=get_password_hash(args.admin_password),
                        role="admin",
                        is_active=True,
                    )
                )
                db.commit()
                print(f"Created admin user: {args.admin_username}")

            seed_turtle_album(db)
            print("Seeded turtle-album demo data")
        finally:
            db.close()


if __name__ == "__main__":
    main()
