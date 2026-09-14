"""Add clients and projects (Tenant -> Client -> Project -> Model)

Revision ID: a7c2e9f4b6d1
Revises: f4c8d2a6e1b3
Create Date: 2026-09-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a7c2e9f4b6d1'
down_revision = 'f4c8d2a6e1b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('contact_name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_clients_tenant_id', 'clients', ['tenant_id'])

    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index('ix_projects_tenant_id', 'projects', ['tenant_id'])
    op.create_index('ix_projects_client_id', 'projects', ['client_id'])

    op.add_column('jobs', sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_jobs_project_id', 'jobs', ['project_id'])

    op.add_column('models', sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_models_project_id', 'models', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_models_project_id', table_name='models')
    op.drop_column('models', 'project_id')

    op.drop_index('ix_jobs_project_id', table_name='jobs')
    op.drop_column('jobs', 'project_id')

    op.drop_index('ix_projects_client_id', table_name='projects')
    op.drop_index('ix_projects_tenant_id', table_name='projects')
    op.drop_table('projects')

    op.drop_index('ix_clients_tenant_id', table_name='clients')
    op.drop_table('clients')
