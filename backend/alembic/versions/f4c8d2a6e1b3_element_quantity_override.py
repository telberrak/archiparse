"""Add manual quantity override for métré chiffré

Revision ID: f4c8d2a6e1b3
Revises: e5f2a8c1b9d7
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f4c8d2a6e1b3'
down_revision = 'e5f2a8c1b9d7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('elements', sa.Column('quantity_override_value', sa.Numeric(precision=14, scale=3), nullable=True))
    op.add_column('elements', sa.Column('quantity_override_unit', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('elements', 'quantity_override_unit')
    op.drop_column('elements', 'quantity_override_value')
