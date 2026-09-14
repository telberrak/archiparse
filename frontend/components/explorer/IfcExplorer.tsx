'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, CostQuantity, Element, Model, PriceCatalogItem, PriceUnit, Storey } from '@/lib/api';
import { usePriceCatalog, useAssignElementPrice, useAssignQuantityOverride } from '@/lib/hooks/usePriceCatalog';
import { Search, AlertTriangle, Banknote, Download, Pencil, Check, X, RotateCcw } from 'lucide-react';
import {
  buildHierarchyTree,
  flattenPsets,
  flattenQuantities,
  getMaterial,
  getPlacement,
  isBrowsable,
  translateIfcType,
} from './explorerUtils';
import { HierarchyTree } from './HierarchyTree';
import './explorer.css';

interface IfcExplorerProps {
  model: Model;
  elements: Element[];
  storeys: Storey[];
}

export function IfcExplorer({ model, elements, storeys }: IfcExplorerProps) {
  const browsable = useMemo(() => elements.filter(isBrowsable), [elements]);
  const storeyOrder = useMemo(() => {
    const order: Record<string, number> = {};
    storeys.forEach((storey, index) => {
      order[storey.id] = index;
    });
    return order;
  }, [storeys]);
  const tree = useMemo(
    () => buildHierarchyTree(elements, storeyOrder),
    [elements, storeyOrder]
  );
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [storeyId, setStoreyId] = useState('all');
  const [spaceId, setSpaceId] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(browsable[0]?.id ?? null);
  const [downloading, setDownloading] = useState<'xlsx' | 'pdf' | 'dpgf' | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const { data: priceCatalog } = usePriceCatalog();
  const assignPrice = useAssignElementPrice();
  const assignQuantityOverride = useAssignQuantityOverride();
  const priceCatalogByType = useMemo(() => {
    const byType: Record<string, PriceCatalogItem[]> = {};
    (priceCatalog || []).forEach((item) => {
      (byType[item.ifc_type] = byType[item.ifc_type] || []).push(item);
    });
    return byType;
  }, [priceCatalog]);

  useEffect(() => {
    if (!selectedId && browsable[0]) {
      setSelectedId(browsable[0].id);
    }
  }, [browsable, selectedId]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    browsable.forEach((el) => {
      counts[el.ifc_type] = (counts[el.ifc_type] || 0) + 1;
    });
    return counts;
  }, [browsable]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return browsable.filter((el) => {
      const matchesType = activeType === 'All' || el.ifc_type === activeType;
      const matchesStorey = storeyId === 'all' || el.storey_id === storeyId;
      const matchesSpace = spaceId === 'all' || el.space_id === spaceId;
      const matchesQuery =
        !q ||
        (el.name || '').toLowerCase().includes(q) ||
        el.guid.toLowerCase().includes(q) ||
        (el.tag || '').toLowerCase().includes(q);
      return matchesType && matchesStorey && matchesSpace && matchesQuery;
    });
  }, [browsable, activeType, storeyId, spaceId, query]);

  const handleDownload = async (format: 'xlsx' | 'pdf' | 'dpgf') => {
    setReportError(null);
    setDownloading(format);
    try {
      await api.downloadReport(model.id, format, model.name || undefined);
    } catch (err) {
      setReportError("Échec de la génération du rapport.");
    } finally {
      setDownloading(null);
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, Element[]> = {};
    filtered.forEach((el) => {
      (groups[el.ifc_type] = groups[el.ifc_type] || []).push(el);
    });
    return groups;
  }, [filtered]);

  const selected =
    browsable.find((el) => el.id === selectedId) || filtered[0] || browsable[0];

  const ifcVersion = model.statistics?.ifc_version || 'IFC';
  const projectName = model.statistics?.project_name || model.name || 'Modèle IFC';

  return (
    <div className="ifc-explorer">
      <header className="ifc-header">
        <div>
          <div className="proj-name">
            <Link href="/models" className="back-link">
              ← Modèles
            </Link>
            {projectName}
          </div>
          <div className="proj-sub">
            {ifcVersion} · {browsable.length} éléments
          </div>
        </div>
        <div className="search">
          <Search className="h-3.5 w-3.5" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un GlobalId…"
          />
        </div>
        <div className="report-actions">
          {reportError && <span className="report-error">{reportError}</span>}
          <Link href={`/models/${model.id}/checks`} className="report-btn">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
            Qualité
          </Link>
          <Link href={`/models/${model.id}/cost-estimate`} className="report-btn">
            <Banknote className="h-3.5 w-3.5" strokeWidth={2} />
            Métré chiffré
          </Link>
          <button
            type="button"
            className="report-btn"
            disabled={downloading !== null}
            onClick={() => handleDownload('dpgf')}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            {downloading === 'dpgf' ? 'Génération…' : 'DPGF'}
          </button>
          <button
            type="button"
            className="report-btn"
            disabled={downloading !== null}
            onClick={() => handleDownload('xlsx')}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            {downloading === 'xlsx' ? 'Génération…' : 'Excel'}
          </button>
          <button
            type="button"
            className="report-btn"
            disabled={downloading !== null}
            onClick={() => handleDownload('pdf')}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            {downloading === 'pdf' ? 'Génération…' : 'PDF'}
          </button>
        </div>
      </header>

      <div className="layout">
        <div className="tree-rail">
          <HierarchyTree
            root={tree}
            activeStoreyId={storeyId}
            activeSpaceId={spaceId}
            onSelectStorey={setStoreyId}
            onSelectSpace={setSpaceId}
          />
        </div>
        <div className="rail">
          <div className="filters">
            {['All', ...Object.keys(typeCounts)].map((type) => {
              const n = type === 'All' ? browsable.length : typeCounts[type];
              return (
                <button
                  key={type}
                  className={type === activeType ? 'chip active' : 'chip'}
                  onClick={() => setActiveType(type)}
                  type="button"
                >
                  {type === 'All' ? 'Tous' : translateIfcType(type)}
                  <span className="n">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="elem-list">
            {Object.keys(grouped).length === 0 ? (
              <div className="empty-hint">Aucun élément ne correspond.</div>
            ) : (
              Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="type-group">
                  <div className="type-head">
                    <span>{translateIfcType(type)}</span>
                    <span>{items.length}</span>
                  </div>
                  {items.map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      className={`elem-row ${selected?.id === el.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(el.id)}
                    >
                      <div className="elem-name">{el.name || translateIfcType(el.ifc_type)}</div>
                      <div className="elem-id mono">{el.guid}</div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="detail">
          {selected ? (
            <ElementDetail
              element={selected}
              priceOptions={priceCatalogByType[selected.ifc_type] || []}
              onAssignPrice={(priceCatalogItemId) =>
                assignPrice.mutate({ elementId: selected.id, priceCatalogItemId })
              }
              onSetQuantityOverride={(value, unit) =>
                assignQuantityOverride.mutate({ elementId: selected.id, value, unit })
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ElementDetail({
  element,
  priceOptions,
  onAssignPrice,
  onSetQuantityOverride,
}: {
  element: Element;
  priceOptions: PriceCatalogItem[];
  onAssignPrice: (priceCatalogItemId: string | null) => void;
  onSetQuantityOverride: (value: number | null, unit: PriceUnit | null) => void;
}) {
  const placement = getPlacement(element);
  const quantities = flattenQuantities(element.quantities);
  const psets = flattenPsets(element.properties);
  const material = getMaterial(element);
  const storey = element.storey_name || '—';

  return (
    <>
      <div className="detail-head">
        <h1>{element.name || translateIfcType(element.ifc_type)}</h1>
        <span className="detail-type">{translateIfcType(element.ifc_type)}</span>
        {priceOptions.length > 0 ? (
          <select
            className="detail-price-select"
            value={element.effective_price_catalog_item_id || ''}
            onChange={(e) => onAssignPrice(e.target.value || null)}
          >
            <option value="">— Prix non assigné —</option>
            {priceOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <Link href={`/pricing?type=${element.ifc_type}`} className="detail-price-add-link">
            + Ajouter un prix pour ce type
          </Link>
        )}
      </div>
      <div className="detail-guid mono">
        {element.guid} · {storey}
      </div>

      {element.cost_quantity?.unit && (
        <QuantityOverrideRow costQuantity={element.cost_quantity} onSetQuantityOverride={onSetQuantityOverride} />
      )}

      {placement && (
        <div className="section">
          <div className="section-title">Emplacement</div>
          <div className="kv-grid">
            <div className="kv">
              <span className="k">X</span>
              <span className="v mono">{placement.x}</span>
            </div>
            <div className="kv">
              <span className="k">Y</span>
              <span className="v mono">{placement.y}</span>
            </div>
            <div className="kv">
              <span className="k">Z</span>
              <span className="v mono">{placement.z}</span>
            </div>
            <div className="kv">
              <span className="k">Rotation</span>
              <span className="v mono">{placement.rotation}</span>
            </div>
            <div className="kv">
              <span className="k">Étage</span>
              <span className="v">{storey}</span>
            </div>
          </div>
        </div>
      )}

      {!placement && (
        <div className="section">
          <div className="section-title">Emplacement</div>
          <div className="kv-grid">
            <div className="kv">
              <span className="k">Étage</span>
              <span className="v">{storey}</span>
            </div>
            {element.tag && (
              <div className="kv">
                <span className="k">Tag</span>
                <span className="v mono">{element.tag}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">Quantités</div>
        {quantities.length === 0 ? (
          <div className="empty-hint" style={{ padding: 0 }}>
            Aucune quantité extraite pour cet élément.
          </div>
        ) : (
          quantities.map((q) => (
            <div key={q.label} className="qty-row">
              <div className="qty-label">{q.label}</div>
              <div className="qty-track">
                <div
                  className="qty-fill"
                  style={{ width: `${Math.min(100, (q.value / q.max) * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="qty-value mono">
                {q.value} {q.unit}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-title">Jeux de propriétés</div>
        {Object.keys(psets).length === 0 ? (
          <div className="empty-hint" style={{ padding: 0 }}>
            Aucun jeu de propriétés extrait pour cet élément.
          </div>
        ) : (
          Object.entries(psets).map(([psetName, rows]) => (
            <div key={psetName}>
              <div className="pset-name">{psetName}</div>
              <table>
                <tbody>
                  {rows.map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ color: 'var(--text-dim)', width: '45%' }}>{k}</td>
                      <td className="mono">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {material && (
        <div className="section">
          <div className="section-title">Matériau</div>
          <div className="material-row">
            <div className="swatch" style={{ background: material.color }} />
            <div>{material.name}</div>
          </div>
        </div>
      )}
    </>
  );
}

function QuantityOverrideRow({
  costQuantity,
  onSetQuantityOverride,
}: {
  costQuantity: CostQuantity;
  onSetQuantityOverride: (value: number | null, unit: PriceUnit | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(costQuantity.effective_quantity != null ? String(costQuantity.effective_quantity) : '');
    setEditing(true);
  };

  const handleSave = () => {
    const value = parseFloat(draft.replace(',', '.'));
    if (Number.isNaN(value) || value < 0) return;
    onSetQuantityOverride(value, costQuantity.unit);
    setEditing(false);
  };

  const handleReset = () => onSetQuantityOverride(null, null);

  return (
    <div className="qty-override">
      <span className="qty-override-label">Quantité pour le métré</span>
      {editing ? (
        <div className="qty-override-edit">
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <span className="qty-override-unit">{costQuantity.unit}</span>
          <button type="button" className="qty-override-btn" onClick={handleSave} aria-label="Enregistrer">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
          <button type="button" className="qty-override-btn" onClick={() => setEditing(false)} aria-label="Annuler">
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div className="qty-override-display">
          <span className="qty-override-value mono">
            {costQuantity.effective_quantity ?? '—'} {costQuantity.unit}
          </span>
          {costQuantity.is_override_applied && (
            <span className="qty-override-note">
              corrigée · source : {costQuantity.resolved_quantity ?? '—'} {costQuantity.unit}
            </span>
          )}
          {costQuantity.override_ignored && (
            <span className="qty-override-warning">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              correction ignorée (unité différente du prix assigné)
            </span>
          )}
          <button type="button" className="qty-override-edit-btn" onClick={startEdit}>
            <Pencil className="h-3 w-3" strokeWidth={2} />
            Modifier
          </button>
          {costQuantity.is_override_applied && (
            <button type="button" className="qty-override-edit-btn" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" strokeWidth={2} />
              Réinitialiser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
