"""Drop models.normalized_json (XSLT layer removed)

Revision ID: a1c3f9e2d4b7
Revises: 59a3d5cf7676
Create Date: 2026-09-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1c3f9e2d4b7'
down_revision = '59a3d5cf7676'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('models', 'normalized_json')


def downgrade() -> None:
    op.add_column('models', sa.Column('normalized_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
