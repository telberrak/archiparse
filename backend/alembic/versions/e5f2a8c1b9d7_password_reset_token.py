"""Add password reset token fields to users

Revision ID: e5f2a8c1b9d7
Revises: d3a9c6e1f8b4
Create Date: 2026-09-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5f2a8c1b9d7'
down_revision = 'd3a9c6e1f8b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('reset_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.create_unique_constraint('uq_users_reset_token', 'users', ['reset_token'])


def downgrade() -> None:
    op.drop_constraint('uq_users_reset_token', 'users', type_='unique')
    op.drop_column('users', 'reset_token_expires_at')
    op.drop_column('users', 'reset_token')
