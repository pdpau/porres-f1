# 🏎️ Porres F1 — Recompte de Punts

Aplicació web en **React + TypeScript** per fer apostes i calcular punts entre participants durant un cap de setmana de Fórmula 1. Utilitza l'**OpenF1 API** per obtenir els resultats reals i **Supabase** com a base de dades.

---

## Participants

**Albert · David · Pau**

---

## Com funciona

1. Selecciona el **Grand Prix** al panell lateral.
2. Clica **Carregar dades del GP** per obtenir els resultats reals via FastF1.
3. Introdueix les **prediccions** de cada participant per a cada sessió disponible.
4. Clica **Calcular punts!** per veure la classificació i el detall de punts.

---

## Sistema de puntuació

### Qualifying i Sprint Qualifying (SS)

| Resultat                             | Punts |
| ------------------------------------ | ----- |
| Top 3 en ordre exacte                | 3 pts |
| Top 3 pilots correctes (sense ordre) | 1 pt  |

### Cursa

| Resultat                             | Punts  |
| ------------------------------------ | ------ |
| Top 5 en ordre exacte                | 10 pts |
| Top 3 en ordre exacte                | 5 pts  |
| Top 3 pilots correctes (sense ordre) | 1 pt   |
| Top 5 pilots correctes (sense ordre) | 1 pt   |

### Sprint

| Resultat                             | Punts |
| ------------------------------------ | ----- |
| Top 5 en ordre exacte                | 6 pts |
| Top 3 en ordre exacte                | 3 pts |
| Top 3 pilots correctes (sense ordre) | 1 pt  |
| Top 5 pilots correctes (sense ordre) | 1 pt  |

### Punt extra per sessió

A cada sessió es pot apostar per **un punt extra addicional** triant una de les tres opcions:

| Opció              | Descripció                                                                     |
| ------------------ | ------------------------------------------------------------------------------ |
| **Posició exacta** | Encertar la posició exacta d'un pilot fora del top 5                           |
| **SC / VSC / RF**  | Encertar el nombre exacte de Safety Cars, Virtual Safety Cars o Banderes Roges |
| **DNF**            | Encertar que un pilot concret abandona la sessió                               |

---

## Estructura del projecte

```
porres-f1/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── config.ts     # Configuració: any, participants, calendari 2026
│   │   │   ├── openf1.ts     # Client de l'API OpenF1
│   │   │   ├── scoring.ts    # Lògica de puntuació i punt extra
│   │   │   ├── supabase.ts   # Client de Supabase
│   │   │   └── types.ts      # Tipus compartits
│   │   ├── components/       # Components React (GPSelector, PredictionForm, etc.)
│   │   ├── api.ts            # Capa de dades (orquestra OpenF1 + Supabase)
│   │   ├── App.tsx           # Component principal
│   │   └── main.tsx          # Punt d'entrada
│   ├── .env.example          # Variables d'entorn (Supabase)
│   └── package.json
├── supabase/
│   └── schema.sql            # Esquema SQL per crear les taules a Supabase
├── old/                      # Codi antic (Streamlit + FastF1 + FastAPI)
└── README.md
```

---

## Instal·lació i execució

### 1. Configura Supabase

1. Crea un projecte a [supabase.com](https://supabase.com)
2. Executa l'esquema SQL a `supabase/schema.sql` al SQL Editor de Supabase
3. Copia la URL i la clau anon del projecte

### 2. Configura el frontend

```bash
cd frontend
cp .env.example .env
# Edita .env amb les teves credencials de Supabase
npm install
npm run dev
```

> Les dades de F1 provenen de l'API OpenF1 (gratuïta, sense clau). Dades disponibles des de la temporada 2023.

---

## Calendari 2026

| R   | Gran Premi        |
| --- | ----------------- |
| R01 | Australia         |
| R02 | China             |
| R03 | Japan             |
| R04 | Bahrain           |
| R05 | Saudi Arabia      |
| R06 | Miami             |
| R07 | Canada            |
| R08 | Monaco            |
| R09 | Spain (Barcelona) |
| R10 | Austria           |
| R11 | Great Britain     |
| R12 | Belgium           |
| R13 | Hungary           |
| R14 | Netherlands       |
| R15 | Italy             |
| R16 | Spain (Madrid)    |
| R17 | Azerbaijan        |
| R18 | Singapore         |
| R19 | United States     |
| R20 | Mexico            |
| R21 | Brazil            |
| R22 | Las Vegas         |
| R23 | Qatar             |
| R24 | Abu Dhabi         |
