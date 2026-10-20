import type { ProjectData, Task } from '../types';

// Fictional dataset shown until the live data source is connected.
// It must stay generic: no people, organisations or real project names.

type Row = [id: number, category: string, name: string, weight: number | null, due: string | null, parents: number[], done: string | null, description?: string];

const rows: Row[] = [
  [1, 'Cadrage', 'Cadrage du besoin avec le client', 2, '2026-09-08', [], '2026-09-07', 'Recueillir les attentes et les contraintes'],
  [2, 'Cadrage', 'Plan de développement', 1, '2026-09-15', [1], '2026-09-16'],
  [3, 'Étude', 'État de l’art des solutions existantes', 3, '2026-09-22', [1], '2026-09-21'],
  [4, 'Étude', 'Bilan de puissance', 3, '2026-09-29', [3], '2026-10-02', 'Consommations nominale, maximale et en veille'],
  [5, 'Étude', 'Budget de masse et de volume', 2, '2026-09-29', [3], '2026-09-28'],
  [6, 'Étude', 'Choix de l’architecture', 4, '2026-10-06', [4, 5], '2026-10-09'],
  [7, 'Conception', 'Schéma cinématique', 2, '2026-10-13', [6], '2026-10-14'],
  [8, 'Conception', 'CAO de la structure', 6, '2026-10-20', [6], '2026-10-19'],
  [9, 'Conception', 'CAO du mécanisme', 6, '2026-10-27', [7], null],
  [10, 'Conception', 'CAO d’assemblage', 3, '2026-11-06', [8, 9], null, 'Assemblage et première simulation'],
  [29, 'Conception', 'Étude d’une variante de mécanisme', null, null, [6], null, 'Ajoutée en cours de projet, non planifiée'],
  [11, 'Électronique', 'Choix de l’actionneur', 2, '2026-10-13', [6], null],
  [12, 'Électronique', 'Schéma électrique', 3, '2026-10-16', [11], null],
  [13, 'Électronique', 'Carte de commande', 4, '2026-11-20', [12], null],
  [14, 'Fabrication', 'Réunion avec l’atelier', 1, '2026-10-09', [6], '2026-10-08'],
  [15, 'Fabrication', 'Mises en plan', 4, '2026-11-13', [10], null],
  [16, 'Fabrication', 'Dossier de fabrication', 6, '2026-11-20', [14, 15], null, 'Échéance ferme de l’atelier'],
  [17, 'Fabrication', 'Impression 3D des pièces prototypes', 4, '2026-11-27', [10], null],
  [18, 'Fabrication', 'Assemblage du prototype', 6, '2026-12-11', [13, 16, 17], null],
  [19, 'Logiciel', 'Prise en main de l’outil de simulation', 2, '2026-10-23', [2], '2026-10-12'],
  [20, 'Logiciel', 'Modèle de simulation', 4, '2026-11-27', [4, 19], null],
  [21, 'Logiciel', 'Loi de commande', 4, '2026-12-04', [13, 20], null],
  [22, 'Essais', 'Accès à la salle d’essais', 1, '2026-10-30', [], '2026-10-15'],
  [23, 'Essais', 'Protocole d’essais', 2, '2026-11-27', [6], null],
  [24, 'Essais', 'Installation du banc d’essai', 3, '2026-12-18', [22, 23], null],
  [25, 'Essais', 'Campagne d’essais', 6, '2027-01-08', [18, 21, 24], null],
  [26, 'Livrables', 'Rapport d’essais', 4, '2027-01-15', [25], null],
  [27, 'Livrables', 'Manuel d’utilisation', 2, '2027-01-22', [18], null],
  [28, 'Livrables', 'Perspectives d’amélioration', 2, '2027-01-29', [25], null],
];

export const demoData: ProjectData = {
  project: {
    title: 'Projet démo',
    subtitle: 'Démonstrateur de mécanisme déployable',
    code: 'Données fictives',
    start: '2026-09-01',
    end: '2027-01-29',
  },
  milestones: [
    { label: 'Architecture figée', date: '2026-10-06' },
    { label: 'Dossier de fabrication', date: '2026-11-20' },
    { label: 'Prototype assemblé', date: '2026-12-11' },
    { label: 'Essais terminés', date: '2027-01-08' },
    { label: 'Rendu final', date: '2027-01-29' },
  ],
  tasks: rows.map(([id, category, name, weight, due, parents, done, description]): Task => ({
    id, category, name, weight, due, parents, done, description,
  })),
};
