"""Add status (soft-delete) to clients, projects and models

Revision ID: f1d8a3c5e7b2
Revises: a7c2e9f4b6d1
Create Date: 2026-09-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1d8a3c5e7b2'
down_revision = 'a7c2e9f4b6d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("clients", "projects", "models"):
        op.add_column(
            table,
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        )
        op.create_index(f"ix_{table}_status", table, ["status"])


def downgrade() -> None:
    for table in ("clients", "projects", "models"):
        op.drop_index(f"ix_{table}_status", table_name=table)
        op.drop_column(table, "status")
