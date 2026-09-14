'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { IFC_TYPE_GROUPS, translateIfcType } from '@/components/explorer/explorerUtils';
import {
  usePriceCatalog,
  useCreatePriceCatalogItem,
  useUpdatePriceCatalogItem,
  useDeletePriceCatalogItem,
} from '@/lib/hooks/usePriceCatalog';
import { PriceCatalogItem, PriceUnit } from '@/lib/api';
import { Trash2, Pencil, X, Check } from 'lucide-react';

const UNIT_OPTIONS: { value: PriceUnit; label: string }[] = [
  { value: 'm²', label: 'm² (surface)' },
  { value: 'm³', label: 'm³ (volume)' },
  { value: 'ml', label: 'ml (longueur)' },
  { value: 'u', label: 'u (unité)' },
];

// Tous les types IFC "élément" chiffrables (hors conteneurs de hiérarchie),
// regroupés par discipline — voir IFC_TYPE_GROUPS.
const PRICEABLE_TYPES = IFC_TYPE_GROUPS.flatMap((g) => g.types);

const formatMAD = (value: number) =>
  `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

interface FormState {
  ifc_type: string;
  label: string;
  unit: PriceUnit;
  unit_price: string;
  notes: string;
}

const emptyForm: FormState = { ifc_type: PRICEABLE_TYPES[0], label: '', unit: 'm²', unit_price: '', notes: '' };

export default function PricingPage() {
  const { data: items, isLoading, error } = usePriceCatalog();
  const createItem = useCreatePriceCatalogItem();
  const updateItem = useUpdatePriceCatalogItem();
  const deleteItem = useDeletePriceCatalogItem();

  const searchParams = useSearchParams();
  const preselectedType = searchParams.get('type');
  const initialType =
    preselectedType && PRICEABLE_TYPES.includes(preselectedType) ? preselectedType : PRICEABLE_TYPES[0];

  const [form, setForm] = useState<FormState>({ ...emptyForm, ifc_type: initialType });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const handleCreate = async () => {
    setFormError(null);
    const price = parseFloat(form.unit_price.replace(',', '.'));
    if (!form.label.trim()) {
      setFormError('Le libellé est requis');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError('Le prix unitaire doit être un nombre positif');
      return;
    }
    try {
      await createItem.mutateAsync({
        ifc_type: form.ifc_type,
        label: form.label.trim(),
        unit: form.unit,
        unit_price: price,
        notes: form.notes.trim() || undefined,
      });
      setForm({ ...emptyForm, ifc_type: form.ifc_type });
    } catch (err: any) {
      setFormError(err?.message || "Erreur lors de l'ajout du prix");
    }
  };

  const startEdit = (item: PriceCatalogItem) => {
    setEditingId(item.id);
    setEditForm({
      ifc_type: item.ifc_type,
      label: item.label,
      unit: item.unit,
      unit_price: String(item.unit_price),
      notes: item.notes || '',
    });
  };

  const handleSaveEdit = async (itemId: string) => {
    const price = parseFloat(editForm.unit_price.replace(',', '.'));
    if (!editForm.label.trim() || Number.isNaN(price) || price < 0) return;
    await updateItem.mutateAsync({
      itemId,
      item: {
        label: editForm.label.trim(),
        unit: editForm.unit,
        unit_price: price,
        notes: editForm.notes.trim() || undefined,
      },
    });
    setEditingId(null);
  };

  const handleDelete = async (item: PriceCatalogItem) => {
    if (!window.confirm(`Supprimer le prix pour « ${translateIfcType(item.ifc_type)} » ?`)) return;
    await deleteItem.mutateAsync(item.id);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Catalogue de prix</h1>
        <p className="mt-2 text-muted-foreground">
          Renseignez un prix unitaire par type d'ouvrage pour générer un avant-métré chiffré sur vos modèles.
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-background border border-border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Ajouter un prix</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            value={form.ifc_type}
            onChange={(e) => setForm({ ...form, ifc_type: e.target.value })}
          >
            {IFC_TYPE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map((type) => (
                  <option key={type} value={type}>
                    {translateIfcType(type)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Input
            placeholder="Libellé (ex: Mur en briques 20cm)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="lg:col-span-2"
          />
          <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as PriceUnit })}>
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Prix unitaire (MAD)"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          />
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        <div className="mt-4">
          <Button onClick={handleCreate} disabled={createItem.isPending}>
            {createItem.isPending ? 'Ajout…' : 'Ajouter au catalogue'}
          </Button>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <p className="text-red-600">Erreur lors du chargement du catalogue</p>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-muted-foreground">Aucun prix renseigné pour le moment</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Type IFC</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Libellé</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Unité</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Prix unitaire</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  {editingId === item.id ? (
                    <>
                      <td className="px-4 py-3 text-muted-foreground">{translateIfcType(item.ifc_type)}</td>
                      <td className="px-4 py-3">
                        <Input
                          value={editForm.label}
                          onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value as PriceUnit })}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.value}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.unit_price}
                          onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-muted-foreground">{translateIfcType(item.ifc_type)}</td>
                      <td className="px-4 py-3 font-medium">{item.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3">{formatMAD(item.unit_price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
