"""Add price_catalog_items (métré chiffré)

Revision ID: b2e4a1f9c3d6
Revises: a1c3f9e2d4b7
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b2e4a1f9c3d6'
down_revision = 'a1c3f9e2d4b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'price_catalog_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ifc_type', sa.String(length=100), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.UniqueConstraint('tenant_id', 'ifc_type', name='uq_price_catalog_tenant_ifc_type'),
    )
    op.create_index('ix_price_catalog_items_tenant_id', 'price_catalog_items', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_price_catalog_items_tenant_id', table_name='price_catalog_items')
    op.drop_table('price_catalog_items')
