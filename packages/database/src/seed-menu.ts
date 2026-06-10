/**
 * Menu reale del Ristorante Cinese "Al Mare" (Livorno).
 *
 * Trascritto da `docs/menu-reale.md` (OCR del menu cartaceo, giugno 2026).
 * Prezzi in centesimi (integer) — vedi ADR-003.
 * Il numero di menu cartaceo è mantenuto in `number` (campo `menu_number`):
 * i clienti abituali ordinano per numero e aiuta la comanda in cucina.
 *
 * ⚠️ Alcuni prezzi erano segnalati con `(?)` nel file sorgente (lettura OCR
 * incerta): #38, #60, #92. Sono stati seminati con il valore letto; vanno
 * verificati da Stefano contro il menu fisico.
 */

export interface SeedCategory {
  name: string
  sortOrder: number
  /** Tempo di preparazione di default per i piatti di questa categoria (min). */
  defaultPrepMinutes: number
}

export interface SeedMenuItem {
  /** Numero di menu cartaceo, es. "44" o "44a". Chiave idempotente per tenant. */
  number: string
  category: string
  name: string
  priceCents: number
}

export const MENU_CATEGORIES: SeedCategory[] = [
  { name: 'Antipasto', sortOrder: 1, defaultPrepMinutes: 10 },
  { name: 'Zuppa', sortOrder: 2, defaultPrepMinutes: 8 },
  { name: 'Riso e Pasta', sortOrder: 3, defaultPrepMinutes: 12 },
  { name: 'Pollo', sortOrder: 4, defaultPrepMinutes: 15 },
  { name: 'Vitello', sortOrder: 5, defaultPrepMinutes: 15 },
  { name: 'Maiale', sortOrder: 6, defaultPrepMinutes: 15 },
  { name: 'Gamberi e Pesce', sortOrder: 7, defaultPrepMinutes: 15 },
  { name: 'Anatra', sortOrder: 8, defaultPrepMinutes: 15 },
  { name: 'Contorno', sortOrder: 9, defaultPrepMinutes: 8 },
  { name: 'Omelette', sortOrder: 10, defaultPrepMinutes: 8 },
  { name: 'Tofu', sortOrder: 11, defaultPrepMinutes: 10 },
  { name: 'Dolci', sortOrder: 12, defaultPrepMinutes: 6 },
]

export const MENU_ITEMS: SeedMenuItem[] = [
  // --- Antipasto ---
  { number: '1', category: 'Antipasto', name: 'Involtini Primavera', priceCents: 200 },
  { number: '2', category: 'Antipasto', name: 'Involtino di Gamberi', priceCents: 330 },
  { number: '3', category: 'Antipasto', name: 'Nuvolette di Gamberi', priceCents: 200 },
  { number: '4', category: 'Antipasto', name: 'Toast di Gamberi', priceCents: 330 },
  { number: '5', category: 'Antipasto', name: 'Frittelle di Gamberi', priceCents: 300 },
  { number: '6', category: 'Antipasto', name: 'Patatine Fritte', priceCents: 350 },
  { number: '7', category: 'Antipasto', name: 'Won Ton Fritto', priceCents: 300 },
  { number: '8', category: 'Antipasto', name: 'Verdure Miste Fritte', priceCents: 450 },
  { number: '9', category: 'Antipasto', name: 'Antipasto Misto Caldo', priceCents: 500 },
  { number: '10', category: 'Antipasto', name: 'Pane Cinese', priceCents: 280 },
  { number: '11', category: 'Antipasto', name: 'Ravioli al Vapore', priceCents: 400 },
  { number: '12', category: 'Antipasto', name: 'Ravioli di Gamberi', priceCents: 430 },
  { number: '13', category: 'Antipasto', name: 'Ravioli di Pollo', priceCents: 430 },
  { number: '14', category: 'Antipasto', name: 'Ravioli di Verdure', priceCents: 400 },
  { number: '15', category: 'Antipasto', name: 'Ravioli alla Griglia', priceCents: 430 },
  { number: '16', category: 'Antipasto', name: 'Ravioli Misti', priceCents: 500 },
  { number: '17', category: 'Antipasto', name: 'Insalata con Gamberi', priceCents: 400 },
  { number: '18', category: 'Antipasto', name: 'Germogli di Soia con Granchio', priceCents: 450 },

  // --- Zuppa ---
  { number: '19', category: 'Zuppa', name: 'Zuppa Agro Piccante', priceCents: 350 },
  { number: '20', category: 'Zuppa', name: 'Zuppa di Mais', priceCents: 350 },
  { number: '21', category: 'Zuppa', name: 'Zuppa di Won Ton', priceCents: 350 },
  { number: '22', category: 'Zuppa', name: 'Zuppa di Asparagi con Granchio', priceCents: 350 },
  { number: '23', category: 'Zuppa', name: 'Zuppa Tom Yum', priceCents: 350 },

  // --- Riso e Pasta ---
  { number: '24', category: 'Riso e Pasta', name: 'Riso alla Cantonese', priceCents: 380 },
  { number: '25', category: 'Riso e Pasta', name: 'Riso con Gamberi', priceCents: 420 },
  { number: '26', category: 'Riso e Pasta', name: 'Riso con Verdure', priceCents: 380 },
  { number: '27', category: 'Riso e Pasta', name: 'Riso al Curry', priceCents: 380 },
  { number: '28', category: 'Riso e Pasta', name: "Riso all'Ananas e Pinoli", priceCents: 420 },
  { number: '29', category: 'Riso e Pasta', name: 'Riso Bianco', priceCents: 200 },
  { number: '30', category: 'Riso e Pasta', name: 'Riso con Misto Mare', priceCents: 480 },
  { number: '31', category: 'Riso e Pasta', name: 'Riso alla Fantasia', priceCents: 480 },
  { number: '32', category: 'Riso e Pasta', name: 'Riso alla Thailandese', priceCents: 480 },
  { number: '33', category: 'Riso e Pasta', name: 'Riso alla Malese', priceCents: 480 },
  { number: '34', category: 'Riso e Pasta', name: 'Riso alla Pechinese', priceCents: 480 },
  { number: '35', category: 'Riso e Pasta', name: 'Spaghetti di Riso con Verdure', priceCents: 480 },
  { number: '36', category: 'Riso e Pasta', name: 'Spaghetti di Riso al Curry', priceCents: 480 },
  {
    number: '37',
    category: 'Riso e Pasta',
    name: 'Spaghetti di Riso con Misto Mare',
    priceCents: 550,
  },
  {
    number: '38',
    category: 'Riso e Pasta',
    name: 'Spaghetti di Soia con Carne Piccante',
    priceCents: 480,
  },
  { number: '39', category: 'Riso e Pasta', name: 'Spaghetti di Soia con Verdure', priceCents: 480 },
  {
    number: '40',
    category: 'Riso e Pasta',
    name: 'Spaghetti di Soia con Misto Mare',
    priceCents: 550,
  },
  { number: '41', category: 'Riso e Pasta', name: 'Spaghetti Udon con Verdure', priceCents: 580 },
  { number: '42', category: 'Riso e Pasta', name: 'Spaghetti Udon con Carne', priceCents: 650 },
  { number: '43', category: 'Riso e Pasta', name: 'Spaghetti Udon con Pollo', priceCents: 650 },
  { number: '44', category: 'Riso e Pasta', name: 'Spaghetti Udon con Misto Mare', priceCents: 650 },
  { number: '44a', category: 'Riso e Pasta', name: 'Spaghetti Udon con Gamberi', priceCents: 650 },
  {
    number: '45',
    category: 'Riso e Pasta',
    name: 'Spaghetti Udon Speciale con Brodo',
    priceCents: 600,
  },
  { number: '46', category: 'Riso e Pasta', name: 'Spaghetti con Verdure', priceCents: 480 },
  { number: '47', category: 'Riso e Pasta', name: 'Spaghetti con Misto Mare', priceCents: 550 },
  { number: '48', category: 'Riso e Pasta', name: 'Spaghetti con Carne', priceCents: 550 },
  { number: '49', category: 'Riso e Pasta', name: 'Gnocchi di Riso', priceCents: 500 },

  // --- Pollo ---
  { number: '50', category: 'Pollo', name: 'Pollo con Bambù e Funghi', priceCents: 520 },
  { number: '51', category: 'Pollo', name: 'Pollo con Mandorle', priceCents: 520 },
  { number: '52', category: 'Pollo', name: 'Pollo Agro Dolce', priceCents: 520 },
  { number: '53', category: 'Pollo', name: 'Pollo Fritto', priceCents: 520 },
  { number: '54', category: 'Pollo', name: "Pollo all'Ananas", priceCents: 520 },
  { number: '55', category: 'Pollo', name: 'Pollo con Patate', priceCents: 520 },
  { number: '56', category: 'Pollo', name: 'Pollo Saltato al Limone', priceCents: 520 },
  { number: '57', category: 'Pollo', name: 'Pollo Piccante', priceCents: 520 },
  { number: '58', category: 'Pollo', name: 'Pollo al Curry', priceCents: 520 },
  { number: '59', category: 'Pollo', name: 'Pollo con Germogli di Soia', priceCents: 520 },
  { number: '60', category: 'Pollo', name: 'Pollo con Gamberi e Funghi', priceCents: 500 },
  { number: '61', category: 'Pollo', name: 'Pollo con Cipolle', priceCents: 520 },
  { number: '62', category: 'Pollo', name: 'Pollo con Verdure Miste', priceCents: 520 },
  { number: '63', category: 'Pollo', name: 'Pollo in Salsa Satay', priceCents: 550 },
  { number: '64', category: 'Pollo', name: 'Pollo Tom Yum', priceCents: 550 },
  { number: '65', category: 'Pollo', name: 'Pollo con Asparagi', priceCents: 600 },
  { number: '66', category: 'Pollo', name: 'Misto di Carne con Verdure', priceCents: 660 },
  { number: '67', category: 'Pollo', name: 'Otto Gioielli (in Casseruola)', priceCents: 800 },

  // --- Vitello ---
  { number: '68', category: 'Vitello', name: 'Vitello con Bambù e Funghi', priceCents: 620 },
  { number: '69', category: 'Vitello', name: 'Vitello Piccante', priceCents: 620 },
  { number: '70', category: 'Vitello', name: 'Vitello con Germogli di Soia', priceCents: 620 },
  { number: '71', category: 'Vitello', name: 'Vitello con Peperoni', priceCents: 620 },
  { number: '72', category: 'Vitello', name: 'Vitello al Limone', priceCents: 620 },
  { number: '73', category: 'Vitello', name: 'Vitello al Curry', priceCents: 620 },
  { number: '74', category: 'Vitello', name: "Vitello in Salsa d'Ostrica", priceCents: 620 },
  { number: '75', category: 'Vitello', name: 'Vitello con Cipolle', priceCents: 620 },
  { number: '76', category: 'Vitello', name: 'Vitello con Verdure alla Piastra', priceCents: 650 },
  { number: '77', category: 'Vitello', name: 'Vitello in Salsa Satay', priceCents: 650 },
  { number: '78', category: 'Vitello', name: 'Vitello Tom Yum', priceCents: 650 },

  // --- Maiale ---
  { number: '79', category: 'Maiale', name: 'Maiale con Bambù e Funghi', priceCents: 580 },
  { number: '80', category: 'Maiale', name: 'Maiale Agro Dolce', priceCents: 580 },
  { number: '81', category: 'Maiale', name: 'Maiale Piccante', priceCents: 580 },
  { number: '82', category: 'Maiale', name: 'Maiale Saltato al Limone', priceCents: 580 },
  { number: '83', category: 'Maiale', name: 'Maiale al Curry', priceCents: 580 },
  { number: '84', category: 'Maiale', name: 'Maiale con Verdure alla Piastra', priceCents: 580 },
  { number: '85', category: 'Maiale', name: 'Maiale in Salsa Satay', priceCents: 630 },
  { number: '86', category: 'Maiale', name: 'Maiale Tom Yum', priceCents: 630 },

  // --- Gamberi e Pesce ---
  { number: '87', category: 'Gamberi e Pesce', name: 'Gamberi con Bambù e Funghi', priceCents: 620 },
  { number: '88', category: 'Gamberi e Pesce', name: 'Gamberi Piccanti', priceCents: 620 },
  { number: '89', category: 'Gamberi e Pesce', name: 'Gamberi in Agro Dolce', priceCents: 620 },
  { number: '90', category: 'Gamberi e Pesce', name: 'Gamberi al Curry', priceCents: 620 },
  { number: '91', category: 'Gamberi e Pesce', name: 'Gamberi Fritti', priceCents: 620 },
  {
    number: '92',
    category: 'Gamberi e Pesce',
    name: 'Gamberi alla Griglia con Sale e Pepe',
    priceCents: 700,
  },
  { number: '93', category: 'Gamberi e Pesce', name: 'Gamberi ai Cinque Colori', priceCents: 620 },
  { number: '94', category: 'Gamberi e Pesce', name: 'Gamberi al Limone', priceCents: 620 },
  { number: '95', category: 'Gamberi e Pesce', name: 'Gamberi con Asparagi', priceCents: 700 },
  { number: '96', category: 'Gamberi e Pesce', name: 'Gamberi con Verdure Miste', priceCents: 620 },
  { number: '97', category: 'Gamberi e Pesce', name: 'Gamberi in Salsa Satay', priceCents: 650 },
  { number: '98', category: 'Gamberi e Pesce', name: 'Gamberi Tom Yum', priceCents: 650 },
  { number: '99', category: 'Gamberi e Pesce', name: 'Gamberoni Piccanti', priceCents: 800 },
  {
    number: '100',
    category: 'Gamberi e Pesce',
    name: 'Gamberoni con Verdure Miste',
    priceCents: 800,
  },
  {
    number: '101',
    category: 'Gamberi e Pesce',
    name: 'Gamberoni alla Griglia con Sale e Pepe',
    priceCents: 800,
  },
  { number: '102', category: 'Gamberi e Pesce', name: 'Gamberoni Fritti', priceCents: 800 },
  { number: '103', category: 'Gamberi e Pesce', name: 'Gamberoni in Salsa Satay', priceCents: 830 },
  { number: '104', category: 'Gamberi e Pesce', name: 'Gamberoni Tom Yum', priceCents: 830 },
  { number: '105', category: 'Gamberi e Pesce', name: 'Calamari Fritti', priceCents: 620 },
  { number: '106', category: 'Gamberi e Pesce', name: 'Calamari Piccanti', priceCents: 620 },
  { number: '107', category: 'Gamberi e Pesce', name: 'Calamari con Verdure Miste', priceCents: 620 },
  { number: '108', category: 'Gamberi e Pesce', name: 'Calamari in Salsa Satay', priceCents: 650 },
  { number: '109', category: 'Gamberi e Pesce', name: 'Pesce Fritto', priceCents: 620 },
  { number: '110', category: 'Gamberi e Pesce', name: 'Pesce Fritto al Limone', priceCents: 620 },
  { number: '111', category: 'Gamberi e Pesce', name: 'Pesce Piccante', priceCents: 620 },
  { number: '112', category: 'Gamberi e Pesce', name: 'Pesce in Agro Dolce', priceCents: 620 },
  { number: '113', category: 'Gamberi e Pesce', name: 'Misto Mare alla Piastra', priceCents: 700 },
  { number: '114', category: 'Gamberi e Pesce', name: 'Misto Mare Fritto', priceCents: 700 },

  // --- Anatra ---
  { number: '115', category: 'Anatra', name: 'Anatra Arrosto', priceCents: 650 },
  { number: '116', category: 'Anatra', name: 'Anatra Agrodolce', priceCents: 650 },
  { number: '117', category: 'Anatra', name: 'Anatra con Bambù e Funghi', priceCents: 650 },
  { number: '118', category: 'Anatra', name: "Anatra all'Arancia", priceCents: 700 },
  { number: '119', category: 'Anatra', name: 'Anatra Piccante', priceCents: 650 },
  { number: '120', category: 'Anatra', name: 'Anatra con Verdure Miste', priceCents: 650 },

  // --- Contorno ---
  { number: '121', category: 'Contorno', name: 'Verdure Miste Saltate', priceCents: 450 },
  { number: '122', category: 'Contorno', name: 'Germogli di Soia Saltati', priceCents: 450 },
  { number: '123', category: 'Contorno', name: 'Bambù e Funghi Saltati', priceCents: 450 },

  // --- Omelette ---
  { number: '124', category: 'Omelette', name: 'Omelette con Gamberi', priceCents: 400 },
  { number: '125', category: 'Omelette', name: 'Omelette con Carne', priceCents: 400 },
  { number: '126', category: 'Omelette', name: 'Omelette con Granchio', priceCents: 400 },

  // --- Tofu ---
  { number: '127', category: 'Tofu', name: 'Tofu con Gamberi e Funghi', priceCents: 500 },
  { number: '128', category: 'Tofu', name: 'Tofu con Verdure Miste', priceCents: 450 },
  { number: '129', category: 'Tofu', name: 'Tofu Piccante (con Carne)', priceCents: 450 },

  // --- Dolci ---
  { number: '130', category: 'Dolci', name: 'Gelato Fritto', priceCents: 350 },
  { number: '131', category: 'Dolci', name: 'Frutta Mista Fritta', priceCents: 350 },
  { number: '132', category: 'Dolci', name: 'Macedonia Cinese', priceCents: 350 },
  { number: '133', category: 'Dolci', name: 'Nutella Fritta', priceCents: 350 },
  { number: '134', category: 'Dolci', name: 'Palline di Sesamo', priceCents: 350 },
]
