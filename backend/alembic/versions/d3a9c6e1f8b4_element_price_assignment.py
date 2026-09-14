"""Allow multiple prices per IFC type + per-element price assignment

Revision ID: d3a9c6e1f8b4
Revises: c7f1b8a4e5d2
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd3a9c6e1f8b4'
down_revision = 'c7f1b8a4e5d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint('uq_price_catalog_tenant_ifc_type', 'price_catalog_items', type_='unique')

    op.add_column('elements', sa.Column('price_catalog_item_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_elements_price_catalog_item_id',
        'elements', 'price_catalog_items',
        ['price_catalog_item_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_elements_price_catalog_item_id', 'elements', ['price_catalog_item_id'])


def downgrade() -> None:
    op.drop_index('ix_elements_price_catalog_item_id', table_name='elements')
    op.drop_constraint('fk_elements_price_catalog_item_id', 'elements', type_='foreignkey')
    op.drop_column('elements', 'price_catalog_item_id')

    op.create_unique_constraint(
        'uq_price_catalog_tenant_ifc_type', 'price_catalog_items', ['tenant_id', 'ifc_type']
    )
