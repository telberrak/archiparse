import { Element } from '@/lib/api';

export const HIDDEN_TYPES = new Set([
  'IfcProject',
  'IfcSite',
  'IfcBuilding',
  'IfcBuildingStorey',
]);

// IfcWall, IfcDoor, etc. sont le vocabulaire standard buildingSMART (IFC) :
// on les conserve tels quels comme identifiants, mais on affiche un libellé
// français à côté pour l'utilisateur (ex. "Mur (IfcWall)").
export const IFC_TYPE_LABELS: Record<string, string> = {
  IfcWall: 'Mur',
  IfcWallStandardCase: 'Mur',
  IfcSlab: 'Dalle',
  IfcDoor: 'Porte',
  IfcWindow: 'Fenêtre',
  IfcBeam: 'Poutre',
  IfcColumn: 'Poteau',
  IfcRoof: 'Toiture',
  IfcStair: 'Escalier',
  IfcStairFlight: "Volée d'escalier",
  IfcRailing: 'Garde-corps',
  IfcCurtainWall: 'Mur-rideau',
  IfcPlate: 'Plaque',
  IfcMember: 'Membrure',
  IfcCovering: 'Revêtement',
  IfcOpeningElement: 'Ouverture',
  IfcBuildingElementProxy: 'Élément générique',
  IfcFooting: 'Fondation',
  IfcPile: 'Pieu',
  IfcRamp: 'Rampe',
  IfcRampFlight: 'Volée de rampe',

  // Renfort structurel
  IfcReinforcingBar: 'Armature (barre)',
  IfcReinforcingMesh: 'Treillis d\'armature',
  IfcTendon: 'Câble de précontrainte',
  IfcTendonAnchor: 'Ancrage de précontrainte',
  IfcMechanicalFastener: 'Fixation mécanique',
  IfcFastener: 'Fixation',
  IfcDiscreteAccessory: 'Accessoire',

  // CVC (chauffage, ventilation, climatisation)
  IfcAirTerminal: 'Bouche d\'air',
  IfcAirTerminalBox: 'Boîte de bouche d\'air',
  IfcAirToAirHeatRecovery: 'Récupérateur de chaleur air-air',
  IfcBoiler: 'Chaudière',
  IfcBurner: 'Brûleur',
  IfcChiller: 'Refroidisseur',
  IfcCoil: 'Batterie d\'échange',
  IfcCompressor: 'Compresseur',
  IfcCondenser: 'Condenseur',
  IfcCoolingTower: 'Tour de refroidissement',
  IfcDamper: 'Registre / volet',
  IfcDuctFitting: 'Raccord de gaine',
  IfcDuctSegment: 'Tronçon de gaine',
  IfcDuctSilencer: 'Silencieux de gaine',
  IfcEvaporativeCooler: 'Refroidisseur évaporatif',
  IfcEvaporator: 'Évaporateur',
  IfcFan: 'Ventilateur',
  IfcFilter: 'Filtre',
  IfcHeatExchanger: 'Échangeur de chaleur',
  IfcHumidifier: 'Humidificateur',
  IfcSpaceHeater: 'Radiateur',
  IfcTank: 'Réservoir',
  IfcTubeBundle: 'Faisceau tubulaire',
  IfcUnitaryControlElement: 'Élément de régulation unitaire',
  IfcUnitaryEquipment: 'Équipement unitaire CVC',
  IfcVibrationIsolator: 'Isolateur de vibrations',

  // Plomberie / fluides
  IfcPipeFitting: 'Raccord de tuyauterie',
  IfcPipeSegment: 'Tronçon de tuyauterie',
  IfcPump: 'Pompe',
  IfcValve: 'Vanne',
  IfcInterceptor: 'Séparateur',
  IfcSanitaryTerminal: 'Appareil sanitaire',
  IfcStackTerminal: 'Terminal de colonne',
  IfcWasteTerminal: 'Terminal d\'évacuation',
  IfcFireSuppressionTerminal: 'Terminal d\'extinction incendie',

  // Réseaux génériques (distribution / régulation)
  IfcDistributionChamberElement: 'Chambre de distribution',
  IfcDistributionControlElement: 'Élément de régulation',
  IfcDistributionElement: 'Élément de distribution',
  IfcDistributionFlowElement: 'Élément de réseau',
  IfcFlowController: 'Régulateur de flux',
  IfcFlowFitting: 'Raccord de réseau',
  IfcFlowInstrument: 'Instrument de mesure',
  IfcFlowMeter: 'Compteur de réseau',
  IfcFlowMovingDevice: 'Dispositif de mise en mouvement',
  IfcFlowSegment: 'Tronçon de réseau',
  IfcFlowStorageDevice: 'Dispositif de stockage (réseau)',
  IfcFlowTerminal: 'Terminal de réseau',
  IfcFlowTreatmentDevice: 'Dispositif de traitement (réseau)',
  IfcEnergyConversionDevice: 'Dispositif de conversion d\'énergie',
  IfcMotorConnection: 'Raccordement moteur',
  IfcJunctionBox: 'Boîte de jonction',

  // Électricité
  IfcActuator: 'Actionneur',
  IfcAlarm: 'Alarme',
  IfcAudioVisualAppliance: 'Appareil audiovisuel',
  IfcCableCarrierFitting: 'Raccord de chemin de câbles',
  IfcCableCarrierSegment: 'Tronçon de chemin de câbles',
  IfcCableFitting: 'Raccord de câble',
  IfcCableSegment: 'Tronçon de câble',
  IfcCommunicationsAppliance: 'Appareil de communication',
  IfcController: 'Contrôleur',
  IfcElectricAppliance: 'Appareil électrique',
  IfcElectricDistributionBoard: 'Tableau électrique',
  IfcElectricFlowStorageDevice: 'Dispositif de stockage électrique',
  IfcElectricGenerator: 'Générateur électrique',
  IfcElectricMotor: 'Moteur électrique',
  IfcElectricTimeControl: 'Minuterie électrique',
  IfcEngine: 'Moteur thermique',
  IfcLamp: 'Lampe',
  IfcLightFixture: 'Luminaire',
  IfcOutlet: 'Prise électrique',
  IfcProtectiveDevice: 'Dispositif de protection',
  IfcProtectiveDeviceTrippingUnit: 'Unité de déclenchement',
  IfcSensor: 'Capteur',
  IfcSolarDevice: 'Dispositif solaire',
  IfcSwitchingDevice: 'Appareil de commutation',
  IfcTransformer: 'Transformateur',
  IfcMedicalDevice: 'Appareil médical',

  // Mobilier
  IfcFurnishingElement: 'Élément d\'ameublement',
  IfcFurniture: 'Mobilier',
  IfcSystemFurnitureElement: 'Élément de mobilier système',

  // Divers / enveloppe
  IfcChimney: 'Cheminée',
  IfcCivilElement: 'Élément de génie civil',
  IfcGeographicElement: 'Élément géographique',
  IfcProjectionElement: 'Élément de saillie',
  IfcShadingDevice: 'Dispositif d\'ombrage',
  IfcSurfaceFeature: 'Élément de surface',
  IfcTransportElement: 'Élément de transport',
  IfcVirtualElement: 'Élément virtuel',
  IfcVoidingFeature: 'Élément d\'évidement',

  // Variantes structurelles
  IfcBeamStandardCase: 'Poutre',
  IfcColumnStandardCase: 'Poteau',
  IfcDoorStandardCase: 'Porte',
  IfcMemberStandardCase: 'Membrure',
  IfcOpeningStandardCase: 'Ouverture',
  IfcPlateStandardCase: 'Plaque',
  IfcSlabElementedCase: 'Dalle',
  IfcSlabStandardCase: 'Dalle',
  IfcWallElementedCase: 'Mur',
  IfcWindowStandardCase: 'Fenêtre',
  IfcCooledBeam: 'Poutre froide',
  IfcBuildingElementPart: 'Élément de construction (partie)',
  IfcElementAssembly: 'Assemblage d\'éléments',

  IfcSpace: 'Espace',
  IfcProject: 'Projet',
  IfcSite: 'Site',
  IfcBuilding: 'Bâtiment',
  IfcBuildingStorey: 'Étage',
};

export function translateIfcType(ifcType: string): string {
  const label = IFC_TYPE_LABELS[ifcType];
  return label ? `${label} (${ifcType})` : ifcType;
}

// Regroupement des types IFC "élément" (hors conteneurs de hiérarchie) par
// discipline, pour un menu de sélection utilisable (ex: catalogue de prix) —
// une liste plate de 130+ types serait inexploitable pour un métreur.
export const IFC_TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: 'Structure & enveloppe',
    types: [
      'IfcWall', 'IfcWallStandardCase', 'IfcWallElementedCase', 'IfcSlab', 'IfcSlabStandardCase',
      'IfcSlabElementedCase', 'IfcDoor', 'IfcDoorStandardCase', 'IfcWindow', 'IfcWindowStandardCase',
      'IfcBeam', 'IfcBeamStandardCase', 'IfcColumn', 'IfcColumnStandardCase', 'IfcRoof', 'IfcStair',
      'IfcStairFlight', 'IfcRailing', 'IfcCurtainWall', 'IfcPlate', 'IfcPlateStandardCase', 'IfcMember',
      'IfcMemberStandardCase', 'IfcCovering', 'IfcOpeningElement', 'IfcOpeningStandardCase',
      'IfcBuildingElementProxy', 'IfcFooting', 'IfcPile', 'IfcRamp', 'IfcRampFlight', 'IfcCooledBeam',
      'IfcBuildingElementPart', 'IfcElementAssembly',
    ],
  },
  {
    label: 'Renfort structurel',
    types: [
      'IfcReinforcingBar', 'IfcReinforcingMesh', 'IfcTendon', 'IfcTendonAnchor', 'IfcMechanicalFastener',
      'IfcFastener', 'IfcDiscreteAccessory',
    ],
  },
  {
    label: 'CVC (chauffage, ventilation, climatisation)',
    types: [
      'IfcAirTerminal', 'IfcAirTerminalBox', 'IfcAirToAirHeatRecovery', 'IfcBoiler', 'IfcBurner',
      'IfcChiller', 'IfcCoil', 'IfcCompressor', 'IfcCondenser', 'IfcCoolingTower', 'IfcDamper',
      'IfcDuctFitting', 'IfcDuctSegment', 'IfcDuctSilencer', 'IfcEvaporativeCooler', 'IfcEvaporator',
      'IfcFan', 'IfcFilter', 'IfcHeatExchanger', 'IfcHumidifier', 'IfcSpaceHeater', 'IfcTank',
      'IfcTubeBundle', 'IfcUnitaryControlElement', 'IfcUnitaryEquipment', 'IfcVibrationIsolator',
    ],
  },
  {
    label: 'Plomberie & fluides',
    types: [
      'IfcPipeFitting', 'IfcPipeSegment', 'IfcPump', 'IfcValve', 'IfcInterceptor', 'IfcSanitaryTerminal',
      'IfcStackTerminal', 'IfcWasteTerminal', 'IfcFireSuppressionTerminal',
    ],
  },
  {
    label: 'Réseaux génériques',
    types: [
      'IfcDistributionChamberElement', 'IfcDistributionControlElement', 'IfcDistributionElement',
      'IfcDistributionFlowElement', 'IfcFlowController', 'IfcFlowFitting', 'IfcFlowInstrument',
      'IfcFlowMeter', 'IfcFlowMovingDevice', 'IfcFlowSegment', 'IfcFlowStorageDevice', 'IfcFlowTerminal',
      'IfcFlowTreatmentDevice', 'IfcEnergyConversionDevice', 'IfcMotorConnection', 'IfcJunctionBox',
    ],
  },
  {
    label: 'Électricité',
    types: [
      'IfcActuator', 'IfcAlarm', 'IfcAudioVisualAppliance', 'IfcCableCarrierFitting',
      'IfcCableCarrierSegment', 'IfcCableFitting', 'IfcCableSegment', 'IfcCommunicationsAppliance',
      'IfcController', 'IfcElectricAppliance', 'IfcElectricDistributionBoard',
      'IfcElectricFlowStorageDevice', 'IfcElectricGenerator', 'IfcElectricMotor', 'IfcElectricTimeControl',
      'IfcEngine', 'IfcLamp', 'IfcLightFixture', 'IfcOutlet', 'IfcProtectiveDevice',
      'IfcProtectiveDeviceTrippingUnit', 'IfcSensor', 'IfcSolarDevice', 'IfcSwitchingDevice',
      'IfcTransformer', 'IfcMedicalDevice',
    ],
  },
  {
    label: 'Mobilier',
    types: ['IfcFurnishingElement', 'IfcFurniture', 'IfcSystemFurnitureElement'],
  },
  {
    label: 'Divers',
    types: [
      'IfcChimney', 'IfcCivilElement', 'IfcGeographicElement', 'IfcProjectionElement', 'IfcShadingDevice',
      'IfcSurfaceFeature', 'IfcTransportElement', 'IfcVirtualElement', 'IfcVoidingFeature',
    ],
  },
  {
    label: 'Espaces',
    types: ['IfcSpace'],
  },
];

const QTY_LABELS: Record<string, string> = {
  Length: 'Longueur',
  Width: 'Largeur',
  Height: 'Hauteur',
  Depth: 'Profondeur',
  Thickness: 'Épaisseur',
  Perimeter: 'Périmètre',
  GrossArea: 'Surface brute',
  NetArea: 'Surface nette',
  NetSideArea: 'Surface nette',
  GrossSideArea: 'Surface brute',
  CrossSectionArea: 'Section',
  OuterSurfaceArea: 'Surface extérieure',
  GrossVolume: 'Volume brut',
  NetVolume: 'Volume net',
  GrossWeight: 'Poids brut',
  NetWeight: 'Poids net',
  Area: 'Surface',
  Volume: 'Volume',
  NominalLength: 'Longueur nominale',
  NominalWidth: 'Largeur nominale',
  NominalHeight: 'Hauteur nominale',
};

const PSET_LABELS: Record<string, string> = {
  Pset_WallCommon: 'Mur — Propriétés communes',
  Pset_DoorCommon: 'Porte — Propriétés communes',
  Pset_WindowCommon: 'Fenêtre — Propriétés communes',
  Pset_SlabCommon: 'Dalle — Propriétés communes',
  Pset_RoofCommon: 'Toiture — Propriétés communes',
  Pset_BeamCommon: 'Poutre — Propriétés communes',
  Pset_ColumnCommon: 'Poteau — Propriétés communes',
  Pset_SpaceCommon: 'Espace — Propriétés communes',
  Pset_BuildingCommon: 'Bâtiment — Propriétés communes',
  Pset_SiteCommon: 'Site — Propriétés communes',
  Pset_BuildingStoreyCommon: 'Étage — Propriétés communes',
  Pset_CoveringCommon: 'Revêtement — Propriétés communes',
  Pset_RailingCommon: 'Garde-corps — Propriétés communes',
  Pset_StairCommon: 'Escalier — Propriétés communes',
  Pset_StairFlightCommon: "Volée d'escalier — Propriétés communes",
  Pset_CurtainWallCommon: 'Mur-rideau — Propriétés communes',
  Pset_MemberCommon: 'Membrure — Propriétés communes',
  Pset_PlateCommon: 'Plaque — Propriétés communes',
  Pset_RampCommon: 'Rampe — Propriétés communes',
  Pset_FootingCommon: 'Fondation — Propriétés communes',
  Pset_ReinforcingBarCommon: "Armature — Propriétés communes",
};

const PROPERTY_LABELS: Record<string, string> = {
  IsExternal: 'Extérieur',
  LoadBearing: 'Porteur',
  FireRating: 'Résistance au feu',
  Combustible: 'Combustible',
  Compartmentation: 'Compartimentage',
  AcousticRating: 'Isolation acoustique',
  ThermalTransmittance: 'Transmittance thermique',
  SurfaceSpreadOfFlame: 'Propagation de flamme en surface',
  ExtendToStructure: 'Prolongé jusqu\'à la structure',
  IsConnectedToRoof: 'Connecté à la toiture',
  SelfClosing: 'Fermeture automatique',
  FireExit: 'Issue de secours',
  Reference: 'Référence',
  Status: 'Statut',
  Category: 'Catégorie',
  Description: 'Description',
  AcousticPerformance: 'Performance acoustique',
  SecurityRating: 'Niveau de sécurité',
  DurabilityRating: 'Durabilité',
  HandicapAccessible: 'Accessible PMR',
  IsExternalFireRating: 'Résistance au feu extérieure',
  NetPlannedArea: 'Surface nette planifiée',
  GrossPlannedArea: 'Surface brute planifiée',
  PubliclyAccessible: 'Accessible au public',
  OccupancyType: 'Type d\'occupation',
  OccupancyNumber: "Nombre d'occupants",
  NumberOfRisers: 'Nombre de contremarches',
  NumberOfTreads: 'Nombre de marches',
  RiserHeight: 'Hauteur de contremarche',
  TreadLength: 'Longueur de marche',
  NosingLength: 'Longueur de nez de marche',
  WalkingLineOffset: 'Décalage de la ligne de foulée',
  RequiredHeadroom: 'Hauteur libre requise',
  WaterproofingLayer: "Couche d'étanchéité",
  Infiltration: 'Infiltration',
  ThermalMass: 'Masse thermique',
  VisibleLightTransmittance: 'Transmission lumineuse visible',
  SolarHeatGainTransmittance: 'Transmission des apports solaires',
  ThermalResistanceCorrected: 'Résistance thermique corrigée',
  GlazingAreaFraction: 'Fraction de surface vitrée',
  SmokeStop: 'Anti-fumée',
  IsExternalInfiltration: 'Infiltration extérieure',
  Span: 'Portée',
  Slope: 'Pente',
  Roofing: 'Couverture',
  ParapetHeight: 'Hauteur de parapet',
  IsCompartmentation: 'Compartimentage',
};

function translatePsetName(name: string): string {
  return PSET_LABELS[name] || name;
}

function translatePropertyName(name: string): string {
  return PROPERTY_LABELS[name] || name;
}

export interface QuantityRow {
  label: string;
  value: number;
  unit: string;
  max: number;
}

export function formatDisplayValue(value: unknown): string {
  if (value === true) return 'VRAI';
  if (value === false) return 'FAUX';
  if (value === null || value === undefined || value === '') return '–';
  if (Array.isArray(value)) return value.map(formatDisplayValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function flattenQuantities(quantities: any): QuantityRow[] {
  if (!quantities || typeof quantities !== 'object') return [];
  const rows: QuantityRow[] = [];

  const visit = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if ('value' in obj && obj.value !== undefined) {
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (!val || typeof val !== 'object') continue;
      if ('value' in (val as any)) {
        const num = toNumber((val as any).value);
        if (num === null) continue;
        rows.push({
          label: QTY_LABELS[key] || key,
          value: num,
          unit: String((val as any).unit || ''),
          max: 0,
        });
      } else {
        visit(val);
      }
    }
  };

  visit(quantities);

  const byUnit: Record<string, number> = {};
  rows.forEach((row) => {
    byUnit[row.unit] = Math.max(byUnit[row.unit] || 0, Math.abs(row.value));
  });
  return rows.map((row) => ({
    ...row,
    max: Math.max(byUnit[row.unit] * 1.15, Math.abs(row.value) || 1),
  }));
}

export function flattenPsets(properties: any): Record<string, [string, string][]> {
  if (!properties || typeof properties !== 'object') return {};
  // Legacy: { property_sets: [{ reference }] }
  if (Array.isArray(properties.property_sets)) {
    const named = properties.property_sets.filter((p: any) => p?.name && p?.properties);
    if (named.length === 0) return {};
    return Object.fromEntries(
      named.map((p: any) => [
        translatePsetName(p.name),
        Object.entries(p.properties).map(
          ([k, v]) => [translatePropertyName(k), formatDisplayValue(v)] as [string, string]
        ),
      ])
    );
  }

  const result: Record<string, [string, string][]> = {};
  for (const [name, props] of Object.entries(properties)) {
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;
    const rows = Object.entries(props as Record<string, unknown>).map(
      ([k, v]) => [translatePropertyName(k), formatDisplayValue(v)] as [string, string]
    );
    if (rows.length) result[translatePsetName(name)] = rows;
  }
  return result;
}

export function getPlacement(element: Element): {
  x: string;
  y: string;
  z: string;
  rotation: string;
  unit: string;
} | null {
  const placement = element.geometry?.placement;
  if (!placement) return null;
  const unit = placement.unit || 'm';
  const fmt = (n: unknown) => {
    const num = toNumber(n);
    if (num === null) return '–';
    if (unit === 'm') return `${Math.round(num * 1000)} mm`;
    return `${num} ${unit}`;
  };
  return {
    x: fmt(placement.x),
    y: fmt(placement.y),
    z: fmt(placement.z),
    rotation: placement.rotation || '0°',
    unit,
  };
}

export function getMaterial(element: Element): { name: string; color: string } | null {
  const mat = element.attributes?.material;
  if (mat?.name) {
    return { name: mat.name, color: mat.color || '#9AA5B1' };
  }
  return null;
}

export function isBrowsable(element: Element): boolean {
  return !HIDDEN_TYPES.has(element.ifc_type);
}

export interface TreeNode {
  id: string;
  ifc_type: string;
  name: string;
  children: TreeNode[];
}

function groupById<T extends { id: string }>(
  items: T[],
  keyFn: (item: T) => string | null | undefined
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    (result[key] = result[key] || []).push(item);
  }
  return result;
}

/**
 * Construit l'arbre Project → Site → Building → Storey → Space à partir de la
 * liste brute (non filtrée) des éléments d'un modèle. Un niveau intermédiaire
 * manquant (relation d'agrégation absente dans le fichier source) ne fait pas
 * disparaître ses enfants : ils remontent au niveau disponible le plus proche.
 */
export function buildHierarchyTree(
  elements: Element[],
  storeyOrder?: Record<string, number>
): TreeNode | null {
  const project = elements.find((e) => e.ifc_type === 'IfcProject');
  if (!project) return null;

  const sites = elements.filter((e) => e.ifc_type === 'IfcSite');
  const buildings = elements.filter((e) => e.ifc_type === 'IfcBuilding');
  const orderOf = (id: string) => storeyOrder?.[id] ?? Number.MAX_SAFE_INTEGER;
  const storeys = elements
    .filter((e) => e.ifc_type === 'IfcBuildingStorey')
    .sort((a, b) => orderOf(a.id) - orderOf(b.id));
  const spaces = elements.filter((e) => e.ifc_type === 'IfcSpace');

  const spacesByStorey = groupById(spaces, (s) => s.storey_id);
  const storeysByBuilding = groupById(storeys, (s) => s.building_id);
  const buildingsBySite = groupById(buildings, (b) => b.site_id);

  const toSpaceNode = (space: Element): TreeNode => ({
    id: space.id,
    ifc_type: space.ifc_type,
    name: space.name || 'Espace sans nom',
    children: [],
  });

  const toStoreyNode = (storey: Element): TreeNode => ({
    id: storey.id,
    ifc_type: storey.ifc_type,
    name: storey.name || 'Étage sans nom',
    children: (spacesByStorey[storey.id] || []).map(toSpaceNode),
  });

  const toBuildingNode = (building: Element): TreeNode => ({
    id: building.id,
    ifc_type: building.ifc_type,
    name: building.name || 'Bâtiment sans nom',
    children: (storeysByBuilding[building.id] || []).map(toStoreyNode),
  });

  const toSiteNode = (site: Element): TreeNode => ({
    id: site.id,
    ifc_type: site.ifc_type,
    name: site.name || 'Site sans nom',
    children: (buildingsBySite[site.id] || []).map(toBuildingNode),
  });

  const attachedBuildingIds = new Set(sites.flatMap((s) => (buildingsBySite[s.id] || []).map((b) => b.id)));
  const attachedStoreyIds = new Set(buildings.flatMap((b) => (storeysByBuilding[b.id] || []).map((s) => s.id)));
  const attachedSpaceIds = new Set(storeys.flatMap((s) => (spacesByStorey[s.id] || []).map((sp) => sp.id)));

  const orphanBuildings = buildings.filter((b) => !attachedBuildingIds.has(b.id)).map(toBuildingNode);
  const orphanStoreys = storeys.filter((s) => !attachedStoreyIds.has(s.id)).map(toStoreyNode);
  const orphanSpaces = spaces.filter((s) => !attachedSpaceIds.has(s.id)).map(toSpaceNode);

  return {
    id: project.id,
    ifc_type: project.ifc_type,
    name: project.name || 'Projet',
    children: [...sites.map(toSiteNode), ...orphanBuildings, ...orphanStoreys, ...orphanSpaces],
  };
}
