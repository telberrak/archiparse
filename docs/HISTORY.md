# Historique du projet

Résumé de haut niveau de l'évolution du projet. Pour l'état actuel du
système, voir [ARCHITECTURE.md](./ARCHITECTURE.md) — ce document est un
journal, pas une référence à jour.

## Scaffold initial (phases 1–6)

Le projet a démarré comme un scaffold en six phases : architecture et
schéma de base (1), upload/validation de fichiers IFCXML (2), parseur
streaming (3), une couche de **transformation XSLT** pour produire du JSON
(4), l'interface frontend (5), puis le durcissement SaaS — JWT, isolation
multi-tenant, quotas, logs d'audit, RLS (6).

La couche XSLT de la phase 4 (`xslt/modules/*.xsl`,
`backend/app/services/xslt_service.py`) a depuis été **retirée** : la
résolution des Psets/Qtos se fait entièrement en Python, dans une seconde
passe du parseur streaming (`parser_service.py`), sans étape de
transformation séparée.

## Explorateur et rapports

Ajout de l'explorateur de modèle plein écran (`/models/{id}`, voir
[EXPLORER.md](./EXPLORER.md)) et des exports Excel/PDF avec image de
marque du tenant.

## Refonte visuelle et authentification

Nouvelle mise en page (nav latérale, thème clair professionnel), refonte
complète du flux d'authentification (inscription, connexion, mot de
passe oublié/réinitialisation par e-mail), correctifs de contraste et de
cohérence visuelle sur l'ensemble de l'application.

## Feuille de route métreur marocain

Quatre phases construites pour rapprocher l'outil de l'usage réel d'un
métreur/BE marocain :

1. **Avant-métré chiffré** — catalogue de prix unitaires par tenant,
   assignation de prix par élément, correction manuelle de quantité,
   résolution automatique quand un type IFC n'a qu'un seul prix possible.
2. **Export DPGF** — le même chiffrage, mais groupé par **lot** (gros
   œuvre, second œuvre, CVC, plomberie, électricité, …) avec sous-totaux,
   dans l'Excel et sur la page Métré chiffré — la structure attendue d'un
   DQE réel plutôt qu'une liste plate.
3. **Contrôles réglementaires indicatifs** — surfaces minimales, épaisseur
   de mur porteur, ratio de vitrage ; présentés comme « à vérifier », pas
   comme une certification.
4. **Rapports à l'image du cabinet** — logo tenant intégré aux exports
   Excel/PDF/DPGF.

Suivi d'un import en masse du catalogue de prix (gabarit Excel
téléchargeable, upsert par ligne, erreurs rapportées sans bloquer tout
l'import) — le point de friction identifié pour un métreur qui a déjà des
années de bordereaux de prix accumulés.

## Hiérarchie Client → Projet → Modèle

Restructuration autour de l'usage réel d'un cabinet : plusieurs clients,
plusieurs projets par client, plusieurs modèles par projet. Nouvelles
pages `/clients` et `/projets`, page `/models` mise à jour pour afficher
le client/projet de chaque modèle.

Suivi de la **suppression douce** : supprimer un client, un projet ou un
modèle ne l'efface jamais réellement — il est marqué `deleted` en cascade
(client → projets → modèles) et disparaît de l'application sans perte de
données, restaurable depuis la nouvelle page **Archives**.

## État actuel

Voir [ARCHITECTURE.md](./ARCHITECTURE.md). Pistes identifiées mais non
implémentées : comparaison/versionnage de modèles, rôles/permissions par
tenant, interface bilingue FR/AR, vue 3D.
