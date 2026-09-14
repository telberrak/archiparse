"""Add tenant logo (report branding)

Revision ID: c7f1b8a4e5d2
Revises: b2e4a1f9c3d6
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c7f1b8a4e5d2'
down_revision = 'b2e4a1f9c3d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('logo_data', sa.LargeBinary(), nullable=True))
    op.add_column('tenants', sa.Column('logo_content_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('tenants', 'logo_content_type')
    op.drop_column('tenants', 'logo_data')
